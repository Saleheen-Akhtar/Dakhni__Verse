'use server';

import { createClient } from '@/lib/supabase/server';
import type { Equipment, EquipmentWithOwner } from '@/types';
export async function getArtistOptions() {
  const { getArtistOptions: getOpts } = await import('./artists');
  return getOpts();
}

export async function getEquipment(filters?: { 
  owner_type?: string; 
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  let query = supabase.from('equipment').select(`
    *,
    owner:artists!owner_id(id, stage_name)
  `);

  if (filters?.owner_type) query = query.eq('owner_type', filters.owner_type);
  if (filters?.search) {
    const s = filters.search.trim().replace(/[%_(),]/g, '');
    if (s) {
      query = query.or(`name.ilike.%${s}%,brand.ilike.%${s}%`);
    }
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.page !== undefined) {
    const pageSize = filters.pageSize || 50;
    const pageIndex = Math.max(1, filters.page) - 1;
    query = query.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);
  }

  const { data, error } = await query;
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
