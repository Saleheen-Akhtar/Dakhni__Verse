'use server';

import { createClient } from '@/lib/supabase/server';
import type { Release, ReleaseWithRelations } from '@/types';
export async function getArtistOptions() {
  const { getArtistOptions: getOpts } = await import('./artists');
  return getOpts();
}

export async function getReleases(filters?: { artist_id?: string; status?: string; search?: string }) {
  const supabase = await createClient();
  let query = supabase.from('releases').select(`
    *,
    artist:artists!artist_id(id, stage_name),
    project:projects!project_id(id, title)
  `);

  if (filters?.artist_id) query = query.eq('artist_id', filters.artist_id);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching releases:', error);
    return [];
  }
  return data;
}

export async function getReleaseById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('releases')
    .select(`
      *,
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
  const supabase = await createClient();
  const authUser = userId || (await supabase.auth.getUser()).data.user?.id || null;
  
  const insertData = { ...data, created_by: authUser };
  if (insertData.project_id === '') insertData.project_id = null;
  if (insertData.artist_id === '') insertData.artist_id = null;

  const { data: release, error } = await supabase
    .from('releases')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return release;
}

export async function updateRelease(id: string, data: any) {
  const supabase = await createClient();
  
  const updateData = { ...data };
  if (updateData.project_id === '') updateData.project_id = null;
  if (updateData.artist_id === '') updateData.artist_id = null;

  const { data: release, error } = await supabase
    .from('releases')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return release;
}

export async function deleteRelease(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('releases')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
