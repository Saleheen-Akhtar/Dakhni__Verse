'use server';

import { createClient } from '@/lib/supabase/server';
import { createExpenseSchema, updateExpenseSchema } from '@/lib/validation/finance';
import { requireManagerAction } from '@/lib/auth/helpers';
import type { Expense } from '@/types';

export async function getExpenses(filters?: { 
  category?: string; 
  from?: string; 
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  let query = supabase.from('expenses').select(`
    id, expense_date, category, amount, paid_by, description, receipt_url, notes, created_at
  `, { count: 'exact' });

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.from) query = query.gte('expense_date', filters.from);
  if (filters?.to) query = query.lte('expense_date', filters.to);

  query = query.order('expense_date', { ascending: false });

  if (filters?.page !== undefined) {
    const pageSize = filters.pageSize || 50;
    const pageIndex = Math.max(1, filters.page) - 1;
    query = query.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
  const result = data || [];
  (result as any).totalCount = count ?? result.length;
  return result;
}

export async function createExpense(data: any, userId?: string) {
  const { user, supabase } = await requireManagerAction();
  const authUser = userId || user.id;

  const rawData = { ...data };
  if (rawData.date && !rawData.expense_date) {
    rawData.expense_date = rawData.date;
  }
  delete rawData.date;

  const validated = createExpenseSchema.parse(rawData);
  const insertData = { ...validated, created_by: authUser };

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return expense;
}

export async function updateExpense(id: string, data: any) {
  const { supabase } = await requireManagerAction();

  const rawData = { ...data };
  if (rawData.date && !rawData.expense_date) {
    rawData.expense_date = rawData.date;
  }
  delete rawData.date;

  const validated = updateExpenseSchema.parse(rawData);
  const updateData = { ...validated };

  const { data: expense, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return expense;
}

export async function deleteExpense(id: string) {
  const { supabase } = await requireManagerAction();
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

import { measureQuery } from '@/lib/telemetry/perf';

export interface ExpenseCategoryBreakdown {
  name: string;
  value: number;
}

export async function getExpenseBreakdown(from?: string, to?: string): Promise<ExpenseCategoryBreakdown[]> {
  return measureQuery('getExpenseBreakdown', async () => {
    const supabase = await createClient();

    // 1. Try native database-side RPC aggregation (fastest, pre-sorted)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_expense_breakdown_rpc', {
        p_from: from || null,
        p_to: to || null,
      });

      if (!rpcError && Array.isArray(rpcData)) {
        return rpcData.map((item: any) => ({
          name: String(item.name || 'Other'),
          value: Number(item.value) || 0,
        }));
      }
    } catch {
      // Fallback
    }

    // 2. Bounded fallback
    let query = supabase.from('expenses').select('amount, category').limit(500);
    if (from) query = query.gte('expense_date', from);
    if (to) query = query.lte('expense_date', to);

    const { data, error } = await query;
    if (error || !data) return [];

    const map: Record<string, number> = {};
    data.forEach(item => {
      const amount = Number(item.amount) || 0;
      map[item.category] = (map[item.category] || 0) + amount;
    });

    return Object.entries(map)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  });
}

export async function getExpenseSummary(from?: string, to?: string) {
  return measureQuery('getExpenseSummary', async () => {
    const breakdown = await getExpenseBreakdown(from, to);
    const byCategory: Record<string, number> = {};
    let total = 0;

    breakdown.forEach((item) => {
      byCategory[item.name] = item.value;
      total += item.value;
    });

    return { total, byCategory };
  });
}
