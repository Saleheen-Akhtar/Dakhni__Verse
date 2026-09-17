import { z } from "zod";

// === Contribution Validation Schema ===

const baseContributionSchema = z.object({
  person_id: z.string().uuid("Invalid person").optional().or(z.literal("")),
  amount: z
    .number({ required_error: "Amount is required", invalid_type_error: "Amount must be a number" })
    .positive("Amount must be greater than zero"),
  contribution_date: z.string().optional(),
  date: z.string().optional(),
  purpose: z.string().max(500).optional().or(z.literal("")),
  status: z.enum(["Planned", "Pending", "Confirmed"]),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export const updateContributionSchema = baseContributionSchema.partial();
export const createContributionSchema = baseContributionSchema.refine(
  (data) => !!(data.contribution_date || data.date),
  {
    message: "Date is required",
    path: ["date"],
  }
);
export const contributionSchema = createContributionSchema;

// === Expense Validation Schema ===

const baseExpenseSchema = z.object({
  expense_date: z.string().optional(),
  date: z.string().optional(),
  category: z.enum([
    "Rent", "Deposit/Advance", "Renovation", "Equipment",
    "Furniture", "Software", "Internet", "Utilities",
    "Marketing", "Miscellaneous",
  ]),
  amount: z
    .number({ required_error: "Amount is required", invalid_type_error: "Amount must be a number" })
    .positive("Amount must be greater than zero"),
  paid_by: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export const updateExpenseSchema = baseExpenseSchema.partial();
export const createExpenseSchema = baseExpenseSchema.refine(
  (data) => !!(data.expense_date || data.date),
  {
    message: "Date is required",
    path: ["date"],
  }
);
export const expenseSchema = createExpenseSchema;

export type CreateContributionInput = z.infer<typeof createContributionSchema>;
export type UpdateContributionInput = z.infer<typeof updateContributionSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
