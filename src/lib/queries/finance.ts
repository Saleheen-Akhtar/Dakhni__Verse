"use server";

import {
  getContributions as baseGetContributions,
  createContribution as baseCreateContribution,
  updateContribution as baseUpdateContribution,
  deleteContribution as baseDeleteContribution,
  getContributionSummary as baseGetContributionSummary,
} from "./contributions";
import {
  getExpenses as baseGetExpenses,
  createExpense as baseCreateExpense,
  updateExpense as baseUpdateExpense,
  deleteExpense as baseDeleteExpense,
  getExpenseSummary as baseGetExpenseSummary,
} from "./expenses";
import { getArtistOptions as baseGetArtistOptions } from "./artists";
import {
  getConfirmedContributions,
  getPendingContributions,
  getTotalExpenses,
  getAvailableFunds,
} from "@/lib/calculations/kpi";

export async function updateContribution(id: string, data: any) {
  return baseUpdateContribution(id, data);
}

export async function deleteContribution(id: string) {
  return baseDeleteContribution(id);
}

export async function getContributionSummary() {
  return baseGetContributionSummary();
}

export async function updateExpense(id: string, data: any) {
  return baseUpdateExpense(id, data);
}

export async function deleteExpense(id: string) {
  return baseDeleteExpense(id);
}

export async function getExpenseSummary(from?: string, to?: string) {
  return baseGetExpenseSummary(from, to);
}

export async function getArtistOptions() {
  return baseGetArtistOptions();
}

import { createClient } from "@/lib/supabase/server";

export async function getContributions(filters?: any) {
  const data = await baseGetContributions(filters);
  // Map contribution_date to date for convenience in DataTable accessor
  const mapped = (data || []).map((c: any) => ({
    ...c,
    date: c.contribution_date,
  }));
  (mapped as any).totalCount = (data as any)?.totalCount ?? mapped.length;
  return mapped;
}

export async function createContribution(data: any) {
  const payload = { ...data };
  if (payload.date && !payload.contribution_date) {
    payload.contribution_date = payload.date;
  }
  delete payload.date;
  return baseCreateContribution(payload);
}

export async function getExpenses(filters?: any) {
  const data = await baseGetExpenses(filters);
  // Map expense_date to date for convenience in DataTable accessor
  const mapped = (data || []).map((e: any) => ({
    ...e,
    date: e.expense_date,
  }));
  (mapped as any).totalCount = (data as any)?.totalCount ?? mapped.length;
  return mapped;
}

export async function createExpense(data: any) {
  const payload = { ...data };
  if (payload.date && !payload.expense_date) {
    payload.expense_date = payload.date;
  }
  delete payload.date;
  return baseCreateExpense(payload);
}

export async function getFinanceSummaries() {
  const supabase = await createClient();

  // 1. Try native database-side RPC aggregation (single roundtrip)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_finance_summary_rpc');
    if (!rpcError && rpcData) {
      return {
        confirmedContributions: Number(rpcData.confirmedContributions || 0),
        pendingContributions: Number(rpcData.pendingContributions || 0),
        totalExpenses: Number(rpcData.totalExpenses || 0),
        availableFunds: Number(rpcData.availableFunds || 0),
      };
    }
  } catch {
    // Fallback to calculation set below
  }

  // 2. Fallback
  const [confirmed, pending, totalExpenses] = await Promise.all([
    getConfirmedContributions(),
    getPendingContributions(),
    getTotalExpenses(),
  ]);

  return {
    confirmedContributions: confirmed,
    pendingContributions: pending,
    totalExpenses,
    availableFunds: confirmed - totalExpenses,
  };
}
