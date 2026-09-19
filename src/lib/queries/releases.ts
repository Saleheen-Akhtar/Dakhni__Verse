'use server';

import { createClient } from '@/lib/supabase/server';
import { createReleaseSchema, updateReleaseSchema } from '@/lib/validation/release';
import { requireUserSession, requireManagerAction } from '@/lib/auth/helpers';
import { revalidatePath } from 'next/cache';
import type { Release, ReleaseWithRelations } from '@/types';
export async function getArtistOptions() {
  const { getArtistOptions: getOpts } = await import('./artists');
  return getOpts();
}

export async function getReleases(filters?: { 
  artist_id?: string; 
  status?: string; 
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  let query = supabase.from('releases').select(`
    id, project_id, artist_id, title, status, release_date, distributor, isrc, spotify_url, apple_music_url, youtube_url, other_platform_url, notes, created_at,
    artist:artists!artist_id(id, stage_name),
    project:projects!project_id(id, title)
  `, { count: 'exact' });

  if (filters?.artist_id) query = query.eq('artist_id', filters.artist_id);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    const s = filters.search.trim().replace(/[%_]/g, '\\$&');
    if (s) query = query.ilike('title', `%${s}%`);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.page !== undefined) {
    const pageSize = filters.pageSize || 50;
    const pageIndex = Math.max(1, filters.page) - 1;
    query = query.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('Error fetching releases:', error);
    return [];
  }
  const result = data || [];
  (result as any).totalCount = count ?? result.length;
  return result;
}

export async function getReleaseById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('releases')
    .select(`
      id, project_id, artist_id, title, status, release_date, distributor, isrc, spotify_url, apple_music_url, youtube_url, other_platform_url, notes, created_at,
      artist:artists!artist_id(id, stage_name),
      project:projects!project_id(id, title)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching release by id:', error);
    return null;
  }
  return data;
}

export async function createRelease(data: any, userId?: string) {
  const { user, supabase } = await requireManagerAction();
  const authUser = userId || user.id;
  const validated = createReleaseSchema.parse(data);
  
  const insertData: any = { ...validated, created_by: authUser };
  if (insertData.project_id === '') insertData.project_id = null;
  if (insertData.artist_id === '') insertData.artist_id = null;

  const { data: release, error } = await supabase
    .from('releases')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/releases');
  revalidatePath('/dashboard');
  return release;
}

export async function updateRelease(id: string, data: any) {
  const { supabase } = await requireManagerAction();
  const validated = updateReleaseSchema.parse(data);
  
  const updateData: any = { ...validated };
  if (updateData.project_id === '') updateData.project_id = null;
  if (updateData.artist_id === '') updateData.artist_id = null;

  const { data: release, error } = await supabase
    .from('releases')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/releases');
  revalidatePath(`/releases/${id}`);
  revalidatePath('/dashboard');
  return release;
}

export async function deleteRelease(id: string) {
  const { supabase } = await requireManagerAction();
  const { error } = await supabase
    .from('releases')
    .delete()
    .eq('id', id);

  if (error) throw error;
  revalidatePath('/releases');
  revalidatePath('/dashboard');
  return true;
}
