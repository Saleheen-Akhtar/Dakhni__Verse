'use server';

import { createClient } from '@/lib/supabase/server';
import type { Equipment, EquipmentWithOwner } from '@/types';
export async function getArtistOptions() {
  const { getArtistOptions: getOpts } = await import('./artists');
  return getOpts();
}

export async function getEquipment(filters?: { owner_type?: string; search?: string }) {
  const supabase = await createClient();
  let query = supabase.from('equipment').select(`
    *,
    owner:artists!owner_id(id, stage_name)
  `);

  if (filters?.owner_type) query = query.eq('owner_type', filters.owner_type);
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching equipment:', error);
    return [];
  }
  return data;
}

export async function getEquipmentById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      owner:artists!owner_id(id, stage_name)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching equipment by id:', error);
    return null;
  }
  return data;
}

export async function createEquipment(data: any, userId?: string) {
  const supabase = await createClient();
  const authUser = userId || (await supabase.auth.getUser()).data.user?.id || null;
  
  const insertData = { ...data, created_by: authUser };
  if (insertData.owner_id === '') insertData.owner_id = null;

  const { data: equipment, error } = await supabase
    .from('equipment')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return equipment;
}

export async function updateEquipment(id: string, data: any) {
  const supabase = await createClient();
  
  const updateData = { ...data };
  if (updateData.owner_id === '') updateData.owner_id = null;

  const { data: equipment, error } = await supabase
    .from('equipment')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return equipment;
}

export async function deleteEquipment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('equipment')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
