'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requireRole, getCurrentUserProfile } from '@/lib/auth/helpers';
import { revalidatePath } from 'next/cache';

export interface LinkedArtistUser {
  id: string;
  email: string;
  name: string;
  role: string;
  artist_id: string | null;
  created_at?: string;
}

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
 * Only managers can execute this action.
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
  // 1. Verify caller has Manager role
  await requireRole(['Manager']);

  const trimmedEmail = (email || '').trim().toLowerCase();
  const trimmedPassword = (password || '').trim();

  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  if (!trimmedPassword || trimmedPassword.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const managerClient = await createServerClient();

  // 2. Fetch the artist details
  const { data: artist, error: artistErr } = await managerClient
    .from('artists')
    .select('id, stage_name, email')
    .eq('id', artistId)
    .single();

  if (artistErr || !artist) {
    throw new Error('Artist not found in database.');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let userId: string | null = null;

  // 3. Create Auth user
  // Preference A: Admin Client with service_role key (bypasses email confirmation & rate limits)
  if (serviceKey) {
    const adminClient = createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
      email: trimmedEmail,
      password: trimmedPassword,
      email_confirm: true,
      user_metadata: { name: artist.stage_name, role },
    });

    if (adminError) {
      if (adminError.message.toLowerCase().includes('already registered')) {
        // Find existing auth user by email
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existing = listData?.users?.find((u) => u.email?.toLowerCase() === trimmedEmail);
        if (existing) {
          userId = existing.id;
          // Update their password
          await adminClient.auth.admin.updateUserById(existing.id, { password: trimmedPassword });
        } else {
          throw adminError;
        }
      } else {
        throw new Error(`Auth creation error: ${adminError.message}`);
      }
    } else {
      userId = adminData.user?.id || null;
    }
  } else {
    // Preference B: Isolated client with anon key (does not affect current manager session)
    const isolatedClient = createSupabaseClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await isolatedClient.auth.signUp({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered')) {
        // Attempt sign-in with provided password to verify identity
        const { data: signInData, error: signInError } = await isolatedClient.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (signInError) {
          throw new Error(
            'Unable to configure credentials with the provided email and password. Please verify the credentials or use a distinct email address.'
          );
        }
        userId = signInData.user?.id || null;
      } else if (authError.message.toLowerCase().includes('rate limit')) {
        throw new Error(
          `Supabase email rate limit exceeded. To create unlimited instant artist accounts without rate limits, add your SUPABASE_SERVICE_ROLE_KEY to .env.local and Vercel environment variables.`
        );
      } else {
        throw new Error(authError.message);
      }
    } else {
      userId = authData.user?.id || null;
    }
  }

  if (!userId) {
    throw new Error('Failed to generate user identifier.');
  }

  // 4. Link in public.users table with artist_id and role
  const { error: userError } = await managerClient.from('users').upsert({
    id: userId,
    name: artist.stage_name,
    email: trimmedEmail,
    role: role || 'Artist',
    artist_id: artistId,
    updated_at: new Date().toISOString(),
  });

  if (userError) {
    console.error('Error upserting public.users record:', userError);
    throw new Error(`Could not link artist profile to user record: ${userError.message}`);
  }

  // 5. Update artist record with the verified email and Active status
  await managerClient
    .from('artists')
    .update({
      email: trimmedEmail,
      status: 'Active',
      dakhni_verse_role: role || 'Artist',
    })
    .eq('id', artistId);

  // 6. Log manager action in activity logs
  try {
    await managerClient.from('activity_logs').insert([{
      action: 'Artist Login Created',
      entity_type: 'Artist',
      entity_id: artistId,
      description: `Manager generated artist portal login access for "${artist.stage_name}" (${trimmedEmail})`,
    }]);
  } catch {}

  revalidatePath(`/artists/${artistId}`);
  revalidatePath('/artists');
  revalidatePath('/artists/review');

  return {
    success: true,
    email: trimmedEmail,
    password: trimmedPassword,
    stage_name: artist.stage_name,
    role,
  };
}
