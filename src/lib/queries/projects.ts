'use server';

import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';
import { createProjectSchema, updateProjectSchema } from '@/lib/validation/project';
import { requireUserSession, requireManagerAction } from '@/lib/auth/helpers';
import type { Project, ProjectWithRelations, ProjectStatusHistory } from '@/types';

export async function getArtistOptions() {
  const { getArtistOptions: getOpts } = await import('./artists');
  return getOpts();
}

export const getProjectOptions = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, title')
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching project options:', error);
    return [];
  }
  return data || [];
});

export async function getProjects(filters?: { artist_id?: string; producer_id?: string; status?: string; search?: string; page?: number; pageSize?: number }) {
  const supabase = await createClient();
  let query = supabase.from('projects').select(`id, title, status, target_release_date, created_at, artist_id, producer_id, artist:artists!artist_id(id, stage_name), producer:artists!producer_id(id, stage_name)`, { count: 'exact' });

  if (filters?.artist_id && filters.artist_id !== 'all') query = query.eq('artist_id', filters.artist_id);
  if (filters?.producer_id && filters.producer_id !== 'all') query = query.eq('producer_id', filters.producer_id);
  if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters?.search) {
    const s = filters.search.trim().replace(/[%_]/g, '\\$&');
    if (s) query = query.ilike('title', `%${s}%`);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.page && filters?.pageSize) {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;
  
  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  const result = data || [];
  (result as any).totalCount = count ?? result.length;
  return result;
}

export async function getProjectById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select(`id, title, status, notes, target_release_date, release_date, created_at, updated_at, artist_id, producer_id, mix_engineer_id, mastering_engineer_id, artist:artists!artist_id(id, stage_name, legal_name, profile_image_url), producer:artists!producer_id(id, stage_name), mix_engineer:artists!mix_engineer_id(id, stage_name), mastering_engineer:artists!mastering_engineer_id(id, stage_name)`)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching project by id:', error);
    return null;
  }

  return data;
}

export async function createProject(data: any, userId?: string) {
  const { user, supabase } = await requireUserSession();
  const authUser = userId || user.id;
  const validated = createProjectSchema.parse(data);
  
  // Clean empty strings for optional UUID fields
  const insertData = { ...validated, created_by: authUser };
  ['producer_id', 'mix_engineer_id', 'mastering_engineer_id', 'artist_id'].forEach(field => {
    if ((insertData as any)[field] === '') (insertData as any)[field] = null;
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
  const { user, supabase } = await requireUserSession();
  const authUser = userId || user.id;
  const validated = updateProjectSchema.parse(data);
  
  // Clean empty strings for optional UUID fields
  const updateData = { ...validated };
  ['producer_id', 'mix_engineer_id', 'mastering_engineer_id', 'artist_id'].forEach(field => {
    if ((updateData as any)[field] === '') (updateData as any)[field] = null;
  });

  const { data: project, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return project;
}

export async function deleteProject(id: string) {
  const { supabase } = await requireManagerAction();
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
    .select('id, project_id, old_status, new_status, changed_at, changed_by, user:users!changed_by(name)')
    .eq('project_id', projectId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching project status history:', error);
    return [];
  }
  return data;
}
