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

export async function getContributions(filters?: any) {
  const data = await baseGetContributions(filters);
  // Map contribution_date to date for convenience in DataTable accessor
  return (data || []).map((c: any) => ({
    ...c,
    date: c.contribution_date,
  }));
}

export async function createContribution(data: any, userId?: string) {
  const payload = { ...data };
  if (payload.date && !payload.contribution_date) {
    payload.contribution_date = payload.date;
  }
  delete payload.date;
  return baseCreateContribution(payload, userId || "");
}

export async function getExpenses(filters?: any) {
  const data = await baseGetExpenses(filters);
  // Map expense_date to date for convenience in DataTable accessor
  return (data || []).map((e: any) => ({
    ...e,
    date: e.expense_date,
  }));
}

export async function createExpense(data: any, userId?: string) {
  const payload = { ...data };
  if (payload.date && !payload.expense_date) {
    payload.expense_date = payload.date;
  }
  delete payload.date;
  return baseCreateExpense(payload, userId || "");
}

export async function getFinanceSummaries() {
  const [confirmed, pending, totalExpenses, availableFunds] = await Promise.all([
    getConfirmedContributions(),
    getPendingContributions(),
    getTotalExpenses(),
    getAvailableFunds(),
  ]);

  return {
    confirmedContributions: confirmed,
    pendingContributions: pending,
    totalExpenses,
    availableFunds,
  };
}
