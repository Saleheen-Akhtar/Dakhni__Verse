'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requireManagerAction, getCurrentUserProfile } from '@/lib/auth/helpers';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

export interface LinkedArtistUser {
  id: string;
  email: string;
  name: string;
  role: string;
  artist_id: string | null;
  created_at?: string;
}

const roleSchema = z.enum(['Artist', 'Producer']);

/**
 * Check if an artist already has a linked login account in public.users.
 * Only Managers or the artist themselves are permitted to read login mapping.
 */
export async function getLinkedUserForArtist(artistId: string): Promise<LinkedArtistUser | null> {
  const profile = await getCurrentUserProfile();
  if (!profile) return null;

  const isManager = profile.role === 'Manager';
  const isSelf = profile.artist_id === artistId;
  if (!isManager && !isSelf) {
    return null;
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, artist_id, created_at')
    .eq('artist_id', artistId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching linked user for artist:', error);
    return null;
  }

  return data as LinkedArtistUser | null;
}

/**
 * Generate portal login credentials for an artist.
 * Strictly manager-only; executes with cryptographic session verification and service_role.
 */
export async function generateArtistLogin({
  artistId,
  email,
  password,
  role = 'Artist',
}: {
  artistId: string;
  email: string;
  password: string;
  role?: 'Artist' | 'Producer';
}) {
  // 1. Cryptographically verify caller is an authenticated Manager
  const { profile: managerProfile, supabase: managerClient } = await requireManagerAction();

  const validatedRole = roleSchema.parse(role || 'Artist');
  const trimmedEmail = (email || '').trim().toLowerCase();
  const trimmedPassword = (password || '').trim();

  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  if (!trimmedPassword || trimmedPassword.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  // 2. Check if an existing account is already registered with this email
  const { data: existingUser } = await managerClient
    .from('users')
    .select('id, email, role, artist_id')
    .eq('email', trimmedEmail)
    .maybeSingle();

  if (existingUser) {
    if (existingUser.role === 'Manager' || existingUser.role === 'Producer') {
      throw new Error(`Cannot assign login: An administrative account (${existingUser.role}) is already registered with this email address.`);
    }
    if (existingUser.artist_id && existingUser.artist_id !== artistId) {
      throw new Error('Security alert: This email address is already linked to another artist.');
    }
  }

  // 3. Fetch the artist details
  const { data: artist, error: artistErr } = await managerClient
    .from('artists')
    .select('id, stage_name, email')
    .eq('id', artistId)
    .single();

  if (artistErr || !artist) {
    throw new Error('Artist not found in database.');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Administrative service key is not configured on the server. Please contact an administrator.');
  }

  const adminClient = createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;

  // 4. Create or update Auth user via Admin API
  const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
    email: trimmedEmail,
    password: trimmedPassword,
    email_confirm: true,
    user_metadata: { name: artist.stage_name, role: validatedRole },
  });

  if (adminError) {
    if (adminError.message.toLowerCase().includes('already registered') || adminError.status === 422) {
      // User exists in auth. Find their ID
      if (existingUser?.id) {
        userId = existingUser.id;
      } else {
        // Fallback search across pages if user is not in public.users yet
        let page = 1;
        while (!userId && page <= 5) {
          const { data: listData } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
          const matched = listData?.users?.find((u) => u.email?.toLowerCase() === trimmedEmail);
          if (matched) {
            userId = matched.id;
            break;
          }
          if (!listData?.users || listData.users.length < 100) break;
          page++;
        }
      }

      if (userId) {
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
          password: trimmedPassword,
          email_confirm: true,
          user_metadata: { name: artist.stage_name, role: validatedRole },
        });
        if (updateErr) {
          throw new Error(`Failed to update existing auth credentials: ${updateErr.message}`);
        }
      } else {
        throw new Error('Account already registered in Supabase Auth, but user record could not be located.');
      }
    } else {
      throw new Error(`Auth creation error: ${adminError.message}`);
    }
  } else {
    userId = adminData.user?.id || null;
  }

  if (!userId) {
    throw new Error('Failed to generate user identifier.');
  }

  // 5. Link in public.users table with artist_id and role
  const { error: userError } = await managerClient.from('users').upsert({
    id: userId,
    name: artist.stage_name,
    email: trimmedEmail,
    role: validatedRole,
    artist_id: artistId,
    updated_at: new Date().toISOString(),
  });

  if (userError) {
    console.error('Error upserting public.users record:', userError);
    throw new Error(`Could not link artist profile to user record: ${userError.message}`);
  }

  // 6. Update artist record with the verified email and Active status
  await managerClient
    .from('artists')
    .update({
      email: trimmedEmail,
      status: 'Active',
      dakhni_verse_role: validatedRole,
    })
    .eq('id', artistId);

  // 7. Log manager action in activity logs with verified actor attribution
  try {
    await managerClient.from('activity_logs').insert([{
      user_id: managerProfile.id,
      action: 'Artist Login Created',
      entity_type: 'Artist',
      entity_id: artistId,
      description: `Manager ${managerProfile.name || ''} generated artist portal login access for "${artist.stage_name}" (${trimmedEmail})`.trim(),
    }]);
  } catch {}

  // 8. Revalidate paths and cache tags
  revalidatePath(`/artists/${artistId}`);
  revalidatePath('/artists');
  revalidatePath('/artists/review');
  revalidateTag(`user-profile-${userId}`);
  revalidateTag('user-profiles');

  return {
    success: true,
    email: trimmedEmail,
    password: trimmedPassword,
    stage_name: artist.stage_name,
    role: validatedRole,
  };
}
