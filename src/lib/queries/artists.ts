'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/security/rate-limit';
import type { Artist, ArtistWithProfile, ArtistSocialLink, ArtistMusicProfile } from '@/types';

function getAdminSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceKey && url) {
    return createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return null;
}

export async function getArtists(filters?: { status?: string; role?: string; search?: string; page?: number; pageSize?: number }) {
  const supabase = await createClient();
  let query = supabase.from('artists').select('id, stage_name, legal_name, profile_image_url, location, status, dakhni_verse_role, date_joined');

  if (filters?.status && filters.status !== 'All') {
    query = query.eq('status', filters.status);
  } else {
    // Push exclusions directly to PostgreSQL to prevent loading applicants into memory
    query = query
      .not('status', 'in', '("Pending","Rejected")')
      .not('dakhni_verse_role', 'in', '("Pending Applicant","Rejected Applicant","Re-Application")');
  }

  if (filters?.role) {
    query = query.eq('dakhni_verse_role', filters.role);
  }

  if (filters?.search) {
    const s = filters.search.trim();
    query = query.or(`stage_name.ilike.%${s}%,legal_name.ilike.%${s}%`);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.page && filters?.pageSize) {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching artists:', error);
    return [];
  }

  return data || [];
}

export async function getArtistById(id: string) {
  const supabase = await createClient();
  const [
    { data: artist, error: artistError },
    { data: socialLinks, error: linksError },
  ] = await Promise.all([
    supabase
      .from('artists')
      .select('*, music_profile:artist_music_profiles(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('artist_social_links')
      .select('*')
      .eq('artist_id', id),
  ]);

  if (artistError || !artist) {
    console.error('Error fetching artist by id:', artistError);
    return null;
  }

  if (linksError) {
    console.error('Error fetching social links:', linksError);
  }

  return {
    ...artist,
    social_links: socialLinks || [],
  };
}

export async function getArtistOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('artists')
    .select('id, stage_name')
    .eq('status', 'Active')
    .order('stage_name', { ascending: true });

  if (error) {
    console.error('Error fetching artist options:', error);
    return [];
  }
  return data;
}

export async function createArtist(data: any, musicProfile?: any, socialLinks?: any[]) {
  const supabase = await createClient();
  
  // Separate core artist table fields
  const artistData: any = {
    stage_name: (data.stage_name || '').trim(),
    legal_name: data.legal_name || null,
    profile_image_url: data.profile_image_url || null,
    location: data.location || null,
    phone: data.phone || null,
    email: data.email || null,
    date_joined: data.date_joined || new Date().toISOString().split('T')[0],
    status: data.status || 'Active',
    dakhni_verse_role: data.dakhni_verse_role || null,
  };

  // Extract music profile data
  const profileSource = musicProfile || data;
  const musicProfileData: any = {
    primary_role: profileSource.primary_role || null,
    genres: Array.isArray(profileSource.genres) ? profileSource.genres : (profileSource.genres ? [profileSource.genres] : []),
    subgenres: Array.isArray(profileSource.subgenres) ? profileSource.subgenres : (profileSource.subgenres ? [profileSource.subgenres] : []),
    languages: Array.isArray(profileSource.languages) ? profileSource.languages : (profileSource.languages ? [profileSource.languages] : []),
    vocal_style: profileSource.vocal_style || null,
    songwriting: Boolean(profileSource.songwriting),
    composition: Boolean(profileSource.composition),
    instruments: Array.isArray(profileSource.instruments) ? profileSource.instruments : (profileSource.instruments ? [profileSource.instruments] : []),
    influences: profileSource.influences || null,
    preferred_producers: profileSource.preferred_producers || null,
    bio: profileSource.bio || null,
  };

  // Extract social links
  const linksSource = socialLinks || data.socialLinks || data.social_links || [];
  const normalizedLinks = Array.isArray(linksSource)
    ? linksSource
        .filter((link: any) => link.url && link.url.trim() !== '')
        .map((link: any) => ({
          platform: link.platform || 'Other',
          url: link.url.trim(),
        }))
    : [];

  // Execute atomic PostgreSQL RPC procedure (Single Source of Truth)
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_artist_transactional', {
    p_artist_data: artistData,
    p_profile_data: musicProfileData,
    p_social_links: normalizedLinks,
  });

  if (rpcErr) {
    throw new Error(`Failed to create artist transactionally: ${rpcErr.message}`);
  }

  if (!rpcRes?.artist_id) {
    throw new Error('Artist creation did not return a valid identifier');
  }

  const { data: createdArtist, error: fetchErr } = await supabase
    .from('artists')
    .select('*')
    .eq('id', rpcRes.artist_id)
    .single();

  if (fetchErr) throw fetchErr;
  return createdArtist;
}

export async function updateArtist(id: string, data: any) {
  const supabase = await createClient();
  
  const allowedFields = [
    'stage_name',
    'legal_name',
    'profile_image_url',
    'location',
    'phone',
    'email',
    'date_joined',
    'status',
    'dakhni_verse_role',
  ];

  const updateData: any = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  const { data: artist, error } = await supabase
    .from('artists')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return artist;
}

export async function updateArtistMusicProfile(artistId: string, data: any) {
  const supabase = await createClient();

  const allowedFields = [
    'primary_role',
    'genres',
    'subgenres',
    'languages',
    'vocal_style',
    'songwriting',
    'composition',
    'instruments',
    'influences',
    'preferred_producers',
    'bio',
  ];

  const profileData: any = { artist_id: artistId };
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      profileData[field] = data[field];
    }
  }

  const { data: profile, error } = await supabase
    .from('artist_music_profiles')
    .upsert(profileData, { onConflict: 'artist_id' })
    .select()
    .single();

  if (error) throw error;
  return profile;
}

export async function saveArtistFull(id: string, artistData: any, musicProfileData?: any, socialLinks?: any[]) {
  const updated = await updateArtist(id, artistData);
  if (musicProfileData) {
    await updateArtistMusicProfile(id, musicProfileData);
  }
  if (socialLinks !== undefined) {
    await updateArtistSocialLinks(id, socialLinks);
  }
  return updated;
}

export async function updateArtistSocialLinks(artistId: string, links: Array<{platform: string; url: string}>) {
  const supabase = await createClient();
  const validLinks = (links || []).filter(l => l && l.url && l.url.trim() !== '');

  // Execute atomic PostgreSQL procedure (Single Source of Truth)
  const { error: rpcError } = await supabase.rpc('replace_artist_social_links', {
    p_artist_id: artistId,
    p_social_links: validLinks,
  });

  if (rpcError) {
    throw new Error(`Failed to update social links transactionally: ${rpcError.message}`);
  }
}

export async function deleteArtist(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (currentUser?.role !== 'Manager') throw new Error('Manager role required');
  const { error } = await supabase
    .from('artists')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function getArtistStats(artistId: string) {
  const supabase = await createClient();

  const [
    { count: activeProjects },
    { count: completedProjects },
    { count: totalSessions },
    { count: totalReleases }
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('artist_id', artistId).not('status', 'in', '("Released","On Hold","Cancelled")'),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('artist_id', artistId).eq('status', 'Released'),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('artist_id', artistId),
    supabase.from('releases').select('*', { count: 'exact', head: true }).eq('artist_id', artistId)
  ]);

  return {
    activeProjects: activeProjects || 0,
    completedProjects: completedProjects || 0,
    totalSessions: totalSessions || 0,
    totalReleases: totalReleases || 0
  };
}

export async function submitArtistSelfService(data: any): Promise<{ success: boolean; action?: string; artist_id?: string; stage_name?: string; is_reapplication?: boolean; error?: string }> {
  // 0. Bot Protection: Honeypot trap check
  if (data?.website_hp || data?.confirm_email_hp) {
    console.warn('Bot submission blocked via honeypot');
    return {
      success: false,
      error: 'Submission rejected as suspected automated traffic.',
    };
  }

  // 1. Security Guard: Rate limiting with strict fail-closed enforcement
  try {
    const reqHeaders = await headers();
    const forwardedFor = reqHeaders.get('x-forwarded-for');
    const realIp = reqHeaders.get('x-real-ip');
    const rawIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || null);
    
    // Sanitize client IP: must be valid IPv4/IPv6 pattern
    const clientIp = rawIp && /^[a-fA-F0-9.:]+$/.test(rawIp) ? rawIp : 'client';

    const rateCheck = checkRateLimit(`submit_artist:${clientIp}`, 5, 10 * 60 * 1000);
    if (!rateCheck.success) {
      return {
        success: false,
        error: 'Too many submissions from this connection. Please wait 10 minutes before trying again.',
      };
    }
  } catch (rateLimitErr) {
    console.error('Rate limiting failure (failing closed):', rateLimitErr);
    return {
      success: false,
      error: 'Security verification failed. Please try again in a few moments.',
    };
  }

  const adminClient = getAdminSupabase();
  const supabase = adminClient || (await createClient());

  const stageName = (data.stage_name || '').trim();
  if (!stageName) {
    return { success: false, error: 'Stage name is required' };
  }
  if (stageName.length > 100) {
    return { success: false, error: 'Stage name must be under 100 characters' };
  }

  const email = (data.email || '').trim() || null;
  if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  const phone = (data.phone || '').trim() || null;
  if (phone && phone.length > 30) {
    return { success: false, error: 'Phone number is too long (max 30 characters)' };
  }

  const legalName = (data.legal_name || '').trim() || null;
  if (legalName && legalName.length > 150) {
    return { success: false, error: 'Legal name is too long (max 150 characters)' };
  }

  const location = (data.location || '').trim() || null;
  if (location && location.length > 150) {
    return { success: false, error: 'Location is too long (max 150 characters)' };
  }

  const bio = (data.bio || '').trim() || null;
  if (bio && bio.length > 2500) {
    return { success: false, error: 'Bio must be under 2,500 characters' };
  }

  const profileImageUrl = data.profile_image_url || null;

  const artistData = {
    stage_name: stageName,
    legal_name: legalName,
    profile_image_url: profileImageUrl,
    location: location,
    phone: phone,
    email: email,
    status: 'Pending',
    dakhni_verse_role: 'Pending Applicant',
  };

  const profileData = {
    primary_role: data.primary_role || null,
    genres: Array.isArray(data.genres) ? data.genres.slice(0, 15) : (data.genres ? [data.genres] : []),
    subgenres: Array.isArray(data.subgenres) ? data.subgenres.slice(0, 15) : (data.subgenres ? [data.subgenres] : []),
    languages: Array.isArray(data.languages) ? data.languages.slice(0, 10) : (data.languages ? [data.languages] : []),
    vocal_style: data.vocal_style || null,
    songwriting: Boolean(data.songwriting),
    composition: Boolean(data.composition),
    instruments: Array.isArray(data.instruments) ? data.instruments.slice(0, 15) : (data.instruments ? [data.instruments] : []),
    influences: data.influences ? String(data.influences).slice(0, 500) : null,
    preferred_producers: data.preferred_producers ? String(data.preferred_producers).slice(0, 500) : null,
    bio: bio,
  };

  const rawLinks = data.socialLinks || data.social_links || [];
  const socialLinks = Array.isArray(rawLinks)
    ? rawLinks
        .filter((l: any) => l && l.url && typeof l.url === 'string' && l.url.trim() !== '')
        .slice(0, 20)
        .map((l: any) => ({
          platform: (l.platform || 'Other').slice(0, 50),
          url: l.url.trim().slice(0, 500),
        }))
    : [];

  // Single source of truth: Execute hardened atomic SECURITY DEFINER RPC
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('submit_public_artist', {
      p_artist_data: artistData,
      p_profile_data: profileData,
      p_social_links: socialLinks,
    });

    if (rpcError) {
      console.error('submit_public_artist RPC error:', rpcError);
      return { 
        success: false, 
        error: rpcError.message || 'Submission failed. Please try again.' 
      };
    }

    if (rpcResult?.success) {
      revalidatePath('/artists');
      revalidatePath('/artists/review');
      revalidatePath('/dashboard');
      revalidatePath('/projects');
      revalidatePath('/sessions');
      return {
        success: true,
        action: rpcResult.action,
        artist_id: rpcResult.artist_id,
        stage_name: rpcResult.stage_name,
        is_reapplication: rpcResult.is_reapplication,
      };
    }

    return { success: false, error: 'Failed to process application. Please try again.' };
  } catch (err: any) {
    console.error('Error in submitArtistSelfService:', err);
    return {
      success: false,
      error: err?.message || 'Failed to submit profile. Please try again.',
    };
  }
}

// =============================================================================
// Artist Application Review & Approval Workflow Functions
// =============================================================================

export async function getArtistApplications(filterStatus: 'Pending' | 'Rejected' | 'all' = 'Pending'): Promise<ArtistWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('artists')
    .select('*, music_profile:artist_music_profiles(*), social_links:artist_social_links(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching artist applications:', error);
    return [];
  }

  const all = (data || []) as ArtistWithProfile[];

  if (filterStatus === 'Pending') {
    return all.filter(
      (a) => a.status === 'Pending' || a.dakhni_verse_role === 'Pending Applicant' || a.dakhni_verse_role === 'Re-Application'
    );
  }

  if (filterStatus === 'Rejected') {
    return all.filter(
      (a) => a.status === 'Rejected' || a.dakhni_verse_role === 'Rejected Applicant'
    );
  }

  return all.filter(
    (a) =>
      a.status === 'Pending' ||
      a.status === 'Rejected' ||
      a.dakhni_verse_role === 'Pending Applicant' ||
      a.dakhni_verse_role === 'Rejected Applicant' ||
      a.dakhni_verse_role === 'Re-Application'
  );
}

export async function getPendingApplicationsCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('artists')
    .select('id, status, dakhni_verse_role');

  if (error || !data) return 0;
  return data.filter(
    (a) => a.status === 'Pending' || a.dakhni_verse_role === 'Pending Applicant' || a.dakhni_verse_role === 'Re-Application'
  ).length;
}

export async function acceptArtistApplication(artistId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (currentUser?.role !== 'Manager') throw new Error('Manager role required');

  // Check if this application is a re-application / duplicate of an existing artist
  const { data: applicant } = await supabase
    .from('artists')
    .select('*, music_profile:artist_music_profiles(*), social_links:artist_social_links(*)')
    .eq('id', artistId)
    .single();

  if (applicant?.duplicate_of_id) {
    const existingId = applicant.duplicate_of_id;
    // 1. Merge submitted fields into the existing active artist record (never alter identity or ID)
    const updateFields: any = { updated_at: new Date().toISOString() };
    if (applicant.legal_name) updateFields.legal_name = applicant.legal_name;
    if (applicant.profile_image_url) updateFields.profile_image_url = applicant.profile_image_url;
    if (applicant.location) updateFields.location = applicant.location;
    if (applicant.phone) updateFields.phone = applicant.phone;
    if (applicant.email) updateFields.email = applicant.email;

    await supabase.from('artists').update(updateFields).eq('id', existingId);

    // 2. Merge music profile
    if (applicant.music_profile) {
      const { id: _pId, artist_id: _aId, ...profileData } = applicant.music_profile;
      await supabase.from('artist_music_profiles').upsert({
        artist_id: existingId,
        ...profileData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'artist_id' });
    }

    // 3. Merge social links
    if (applicant.social_links && applicant.social_links.length > 0) {
      await supabase.from('artist_social_links').delete().eq('artist_id', existingId);
      const linksToInsert = applicant.social_links.map((l: any) => ({
        artist_id: existingId,
        platform: l.platform,
        url: l.url,
      }));
      await supabase.from('artist_social_links').insert(linksToInsert);
    }

    // 4. Delete the pending application record so no duplicate artist identity is created
    await supabase.from('artists').delete().eq('id', artistId);

    // 5. Activity log
    try {
      await supabase.from('activity_logs').insert([{
        action: 'Artist Profile Updated',
        entity_type: 'Artist',
        entity_id: existingId,
        description: `Re-application for "${applicant.stage_name}" approved: updates merged into existing profile without creating duplicate artist.`,
      }]);
    } catch {}

    revalidatePath('/artists');
    revalidatePath('/artists/review');
    revalidatePath('/dashboard');
    revalidatePath(`/artists/${existingId}`);

    return { success: true, stage_name: applicant.stage_name, merged: true };
  }

  const { data: artist, error: updateError } = await supabase
    .from('artists')
    .update({
      status: 'Active',
      dakhni_verse_role: 'Artist',
      updated_at: new Date().toISOString(),
    })
    .eq('id', artistId)
    .select('id, stage_name')
    .single();

  if (updateError) {
    console.error('Error accepting artist application:', updateError);
    throw new Error('Failed to accept artist application: ' + updateError.message);
  }

  try {
    await supabase.from('activity_logs').insert([{
      action: 'Artist Accepted',
      entity_type: 'Artist',
      entity_id: artistId,
      description: `Artist "${artist?.stage_name || 'Applicant'}" was approved and accepted into the collective`,
    }]);
  } catch {}

  revalidatePath('/artists');
  revalidatePath('/artists/review');
  revalidatePath('/dashboard');
  revalidatePath(`/artists/${artistId}`);

  return { success: true, stage_name: artist?.stage_name };
}

export async function rejectArtistApplication(artistId: string, reason?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (currentUser?.role !== 'Manager') throw new Error('Manager role required');

  let updatePayload: any = {
    status: 'Rejected',
    dakhni_verse_role: 'Rejected Applicant',
    updated_at: new Date().toISOString(),
  };

  let { data: artist, error: updateError } = await supabase
    .from('artists')
    .update(updatePayload)
    .eq('id', artistId)
    .select('id, stage_name')
    .single();

  // If enum doesn't support 'Rejected' yet in DB, gracefully fallback to 'Inactive'
  if (updateError && updateError.code === '22P02') {
    updatePayload = {
      status: 'Inactive',
      dakhni_verse_role: 'Rejected Applicant',
      updated_at: new Date().toISOString(),
    };
    const res = await supabase
      .from('artists')
      .update(updatePayload)
      .eq('id', artistId)
      .select('id, stage_name')
      .single();
    artist = res.data;
    updateError = res.error;
  }

  if (updateError) {
    console.error('Error rejecting artist application:', updateError);
    throw new Error('Failed to reject artist application: ' + updateError.message);
  }

  try {
    const reasonText = reason ? ` (Reason: ${reason})` : '';
    await supabase.from('activity_logs').insert([{
      action: 'Artist Application Rejected',
      entity_type: 'Artist',
      entity_id: artistId,
      description: `Application for "${artist?.stage_name || 'Applicant'}" was rejected${reasonText}`,
    }]);
  } catch {}

  revalidatePath('/artists');
  revalidatePath('/artists/review');
  revalidatePath('/dashboard');

  return { success: true, stage_name: artist?.stage_name };
}
