'use server';

import { createClient } from '@/lib/supabase/server';
import { createSessionSchema, updateSessionSchema } from '@/lib/validation/session';
import { requireUserSession, requireManagerAction } from '@/lib/auth/helpers';
import type { Session, SessionWithRelations } from '@/types';
export async function getArtistOptions() {
  const { getArtistOptions: getOpts } = await import('./artists');
  return getOpts();
}

export async function getSessions(filters?: { 
  artist_id?: string; 
  project_id?: string; 
  session_type?: string; 
  from?: string; 
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  let query = supabase.from('sessions').select(`
    id, artist_id, project_id, session_type, engineer_id, session_date, start_time, end_time, duration_minutes, notes, created_at,
    artist:artists!artist_id(id, stage_name),
    project:projects!project_id(id, title),
    engineer:artists!engineer_id(id, stage_name)
  `, { count: 'exact' });

  if (filters?.artist_id) query = query.eq('artist_id', filters.artist_id);
  if (filters?.project_id) query = query.eq('project_id', filters.project_id);
  if (filters?.session_type) query = query.eq('session_type', filters.session_type);
  if (filters?.from) query = query.gte('session_date', filters.from);
  if (filters?.to) query = query.lte('session_date', filters.to);

  query = query
    .order('session_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (filters?.page !== undefined) {
    const pageSize = filters.pageSize || 50;
    const pageIndex = Math.max(1, filters.page) - 1;
    query = query.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);
  }

  const { data, error, count } = await query;
    
  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
  const result = data || [];
  (result as any).totalCount = count ?? result.length;
  return result;
}

export async function createSession(data: any, userId?: string) {
  const { user, supabase } = await requireUserSession();
  const authUser = userId || user.id;
  
  const rawData = { ...data };
  if (rawData.date && !rawData.session_date) {
    rawData.session_date = rawData.date;
  }
  delete rawData.date;

  const validated = createSessionSchema.parse(rawData);
  const insertData: any = { ...validated, created_by: authUser };

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
  const { supabase } = await requireUserSession();
  
  const rawData = { ...data };
  if (rawData.date && !rawData.session_date) {
    rawData.session_date = rawData.date;
  }
  delete rawData.date;

  const validated = updateSessionSchema.parse(rawData);
  const updateData: any = { ...validated };

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
  const { supabase } = await requireManagerAction();
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
