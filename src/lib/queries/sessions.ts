'use server';

import { createClient } from '@/lib/supabase/server';
import type { Session, SessionWithRelations } from '@/types';
export async function getArtistOptions() {
  const { getArtistOptions: getOpts } = await import('./artists');
  return getOpts();
}

export async function getSessions(filters?: { artist_id?: string; project_id?: string; session_type?: string; from?: string; to?: string }) {
  const supabase = await createClient();
  let query = supabase.from('sessions').select(`
    *,
    artist:artists!artist_id(id, stage_name),
    project:projects!project_id(id, title)
  `);

  if (filters?.artist_id) query = query.eq('artist_id', filters.artist_id);
  if (filters?.project_id) query = query.eq('project_id', filters.project_id);
  if (filters?.session_type) query = query.eq('session_type', filters.session_type);
  if (filters?.from) query = query.gte('session_date', filters.from);
  if (filters?.to) query = query.lte('session_date', filters.to);

  const { data, error } = await query
    .order('session_date', { ascending: false })
    .order('start_time', { ascending: false });
    
  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
  return data;
}

export async function createSession(data: any, userId?: string) {
  const supabase = await createClient();
  const authUser = userId || (await supabase.auth.getUser()).data.user?.id || null;
  
  const insertData = { ...data, created_by: authUser };
  if (insertData.date && !insertData.session_date) {
    insertData.session_date = insertData.date;
  }
  delete insertData.date;

  if (insertData.project_id === '') insertData.project_id = null;
  if (insertData.artist_id === '') insertData.artist_id = null;
  if (insertData.engineer_id === '') insertData.engineer_id = null;

  const { data: session, error } = await supabase
    .from('sessions')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return session;
}

export async function updateSession(id: string, data: any) {
  const supabase = await createClient();
  
  const updateData = { ...data };
  if (updateData.date && !updateData.session_date) {
    updateData.session_date = updateData.date;
  }
  delete updateData.date;

  if (updateData.project_id === '') updateData.project_id = null;
  if (updateData.artist_id === '') updateData.artist_id = null;
  if (updateData.engineer_id === '') updateData.engineer_id = null;

  const { data: session, error } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return session;
}

export async function deleteSession(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
