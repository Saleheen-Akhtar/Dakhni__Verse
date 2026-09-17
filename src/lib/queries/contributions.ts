'use server';

import { createClient } from '@/lib/supabase/server';
import type { Contribution, ContributionWithPerson } from '@/types';

export async function getContributions(filters?: { status?: string; from?: string; to?: string }) {
  const supabase = await createClient();
  let query = supabase.from('contributions').select(`
    *,
    person:artists!person_id(id, stage_name)
  `);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.from) query = query.gte('contribution_date', filters.from);
  if (filters?.to) query = query.lte('contribution_date', filters.to);

  const { data, error } = await query.order('contribution_date', { ascending: false });
  if (error) {
    console.error('Error fetching contributions:', error);
    return [];
  }
  return data;
}

export async function createContribution(data: any, userId: string) {
  const supabase = await createClient();
  
  const insertData = { ...data };
  if (insertData.person_id === '') insertData.person_id = null;

  const { data: contribution, error } = await supabase
    .from('contributions')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return contribution;
}

export async function updateContribution(id: string, data: any) {
  const supabase = await createClient();
  
  const updateData = { ...data };
  if (updateData.person_id === '') updateData.person_id = null;

  const { data: contribution, error } = await supabase
    .from('contributions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return contribution;
}

export async function deleteContribution(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('contributions')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function getContributionSummary() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('contributions').select('status, amount');
  
  const summary = { confirmed: 0, pending: 0, planned: 0 };
  
  if (error || !data) {
    console.error('Error fetching contribution summary:', error);
    return summary;
  }
  
  data.forEach(item => {
    const amount = Number(item.amount) || 0;
    if (item.status === 'confirmed') summary.confirmed += amount;
    else if (item.status === 'pending') summary.pending += amount;
    else if (item.status === 'planned') summary.planned += amount;
  });
  
  return summary;
}
