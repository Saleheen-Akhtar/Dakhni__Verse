'use server';

import { createClient } from '@/lib/supabase/server';
import { createContributionSchema, updateContributionSchema } from '@/lib/validation/finance';
import { requireManagerAction } from '@/lib/auth/helpers';
import { revalidatePath } from 'next/cache';
import type { Contribution, ContributionWithPerson } from '@/types';

export async function getContributions(filters?: { 
  status?: string; 
  from?: string; 
  to?: string; 
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  let query = supabase.from('contributions').select(`
    id, person_id, amount, contribution_date, purpose, status, notes, created_at,
    person:artists!person_id(id, stage_name)
  `, { count: 'exact' });

  query = query.is('archived_at', null);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.from) query = query.gte('contribution_date', filters.from);
  if (filters?.to) query = query.lte('contribution_date', filters.to);

  query = query.order('contribution_date', { ascending: false });

  if (filters?.page !== undefined) {
    const pageSize = filters.pageSize || 50;
    const pageIndex = Math.max(1, filters.page) - 1;
    query = query.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('Error fetching contributions:', error);
    return [];
  }
  const result = data || [];
  (result as any).totalCount = count ?? result.length;
  return result;
}

export async function createContribution(data: any) {
  const { user, supabase } = await requireManagerAction();
  const authUser = user.id;
  
  const rawData = { ...data };
  if (rawData.date && !rawData.contribution_date) {
    rawData.contribution_date = rawData.date;
  }
  delete rawData.date;

  const validated = createContributionSchema.parse(rawData);
  const insertData: any = { ...validated, created_by: authUser };
  if (insertData.person_id === '') insertData.person_id = null;

  const { data: contribution, error } = await supabase
    .from('contributions')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return contribution;
}

export async function updateContribution(id: string, data: any) {
  const { supabase } = await requireManagerAction();
  
  const rawData = { ...data };
  if (rawData.date && !rawData.contribution_date) {
    rawData.contribution_date = rawData.date;
  }
  delete rawData.date;

  const validated = updateContributionSchema.parse(rawData);
  const updateData: any = { ...validated };
  if (updateData.person_id === '') updateData.person_id = null;

  const { data: contribution, error } = await supabase
    .from('contributions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return contribution;
}

export async function deleteContribution(id: string) {
  // Historical data retention: archive contribution rather than hard delete
  const { user, supabase } = await requireManagerAction();
  const { error } = await supabase
    .from('contributions')
    .update({ archived_at: new Date().toISOString(), archived_by: user.id })
    .eq('id', id);

  if (error) throw error;
  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return true;
}

export async function getContributionSummary() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contributions')
    .select('status, amount')
    .is('archived_at', null);
  
  const summary = { confirmed: 0, pending: 0, planned: 0 };
  
  if (error || !data) {
    console.error('Error fetching contribution summary:', error);
    return summary;
  }
  
  data.forEach(item => {
    const amount = Number(item.amount) || 0;
    if (item.status === 'Confirmed') summary.confirmed += amount;
    else if (item.status === 'Pending') summary.pending += amount;
    else if (item.status === 'Planned') summary.planned += amount;
  });
  
  return summary;
}
