import { z } from "zod";

// === Equipment Validation Schema ===

export const createEquipmentSchema = z.object({
  name: z.string().min(1, "Equipment name is required").max(200),
  category: z.string().max(100).optional().or(z.literal("")),
  brand: z.string().max(100).optional().or(z.literal("")),
  model: z.string().max(100).optional().or(z.literal("")),
  owner_type: z.enum(["Dakhni Verse", "Individual"]),
  owner_id: z.string().uuid("Invalid owner").optional().or(z.literal("")),
  purchase_date: z.string().optional().or(z.literal("")),
  purchase_value: z
    .number({ invalid_type_error: "Must be a number" })
    .nonnegative("Value cannot be negative")
    .optional()
    .nullable(),
  condition: z.enum(["New", "Good", "Fair", "Poor", "Needs Repair"]).optional(),
  location: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();
export const equipmentSchema = createEquipmentSchema;

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
