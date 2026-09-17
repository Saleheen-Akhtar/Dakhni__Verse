'use server';

import { createClient } from '@/lib/supabase/server';
import type { Expense } from '@/types';

export async function getExpenses(filters?: { 
  category?: string; 
  from?: string; 
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  let query = supabase.from('expenses').select('*');

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.from) query = query.gte('expense_date', filters.from);
  if (filters?.to) query = query.lte('expense_date', filters.to);

  query = query.order('expense_date', { ascending: false });

  if (filters?.page !== undefined) {
    const pageSize = filters.pageSize || 50;
    const pageIndex = Math.max(1, filters.page) - 1;
    query = query.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
  return data;
}

export async function createExpense(data: any, userId: string) {
  const supabase = await createClient();
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return expense;
}

export async function updateExpense(id: string, data: any) {
  const supabase = await createClient();
  const { data: expense, error } = await supabase
    .from('expenses')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return expense;
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

import { measureQuery } from '@/lib/telemetry/perf';

export async function getExpenseSummary(from?: string, to?: string) {
  return measureQuery('getExpenseSummary', async () => {
    const supabase = await createClient();
    let query = supabase.from('expenses').select('amount, category');
    
    if (from) query = query.gte('expense_date', from);
    if (to) query = query.lte('expense_date', to);
    
    const { data, error } = await query;
    
    const summary = { total: 0, byCategory: {} as Record<string, number> };
    
    if (error || !data) {
      console.error('Error fetching expense summary:', error);
      return summary;
    }
    
    data.forEach(item => {
      const amount = Number(item.amount) || 0;
      summary.total += amount;
      summary.byCategory[item.category] = (summary.byCategory[item.category] || 0) + amount;
    });
    
    return summary;
  });
}
