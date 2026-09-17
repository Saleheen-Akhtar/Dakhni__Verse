'use server';

import { createClient } from '@/lib/supabase/server';
import type { Project, ProjectWithRelations, ProjectStatusHistory } from '@/types';
export async function getArtistOptions() {
  const { getArtistOptions: getOpts } = await import('./artists');
  return getOpts();
}

export async function getProjects(filters?: { artist_id?: string; producer_id?: string; status?: string; search?: string; page?: number; pageSize?: number }) {
  const supabase = await createClient();
  let query = supabase.from('projects').select(`id, title, status, target_release_date, created_at, artist_id, producer_id, artist:artists!artist_id(id, stage_name), producer:artists!producer_id(id, stage_name)`);

  if (filters?.artist_id && filters.artist_id !== 'all') query = query.eq('artist_id', filters.artist_id);
  if (filters?.producer_id && filters.producer_id !== 'all') query = query.eq('producer_id', filters.producer_id);
  if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters?.search) query = query.ilike('title', `%${filters.search.trim()}%`);

  query = query.order('created_at', { ascending: false });

  if (filters?.page && filters?.pageSize) {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  return data || [];
}

export async function getProjectById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select(`*, artist:artists!artist_id(id, stage_name), producer:artists!producer_id(id, stage_name), mix_engineer:artists!mix_engineer_id(id, stage_name), mastering_engineer:artists!mastering_engineer_id(id, stage_name)`)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching project by id:', error);
    return null;
  }

  return data;
}

export async function createProject(data: any, userId?: string) {
  const supabase = await createClient();
  const authUser = userId || (await supabase.auth.getUser()).data.user?.id || null;
  
  // Clean empty strings for optional UUID fields
  const insertData = { ...data, created_by: authUser };
  ['producer_id', 'mix_engineer_id', 'mastering_engineer_id', 'artist_id'].forEach(field => {
    if (insertData[field] === '') insertData[field] = null;
  });

  const { data: project, error } = await supabase
    .from('projects')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;

  const { error: historyError } = await supabase
    .from('project_status_history')
    .insert([{
      project_id: project.id,
      old_status: null,
      new_status: project.status,
      changed_by: authUser
    }]);

  if (historyError) console.error('Error adding status history:', historyError);

  return project;
}

export async function updateProject(id: string, data: any, userId?: string) {
  const supabase = await createClient();
  const authUser = userId || (await supabase.auth.getUser()).data.user?.id || null;
  
  // Check old status
  const { data: oldProject, error: oldError } = await supabase
    .from('projects')
    .select('status')
    .eq('id', id)
    .single();
    
  if (oldError) throw oldError;

  // Clean empty strings for optional UUID fields
  const updateData = { ...data };
  ['producer_id', 'mix_engineer_id', 'mastering_engineer_id', 'artist_id'].forEach(field => {
    if (updateData[field] === '') updateData[field] = null;
  });

  const { data: project, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Status history is automatically recorded by the database trigger
  // log_project_status_change_trigger (see 001_initial_schema.sql)

  return project;
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function getProjectStatusHistory(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_status_history')
    .select('*')
    .eq('project_id', projectId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching project status history:', error);
    return [];
  }
  return data;
}
