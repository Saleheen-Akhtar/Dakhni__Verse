import { z } from "zod";

// === Project Validation Schemas ===

export const createProjectSchema = z.object({
  title: z.string().min(1, "Song title is required").max(200),
  artist_id: z.string().uuid("Invalid artist").optional().or(z.literal("")),
  producer_id: z.string().uuid("Invalid producer").optional().or(z.literal("")),
  mix_engineer_id: z.string().uuid("Invalid mix engineer").optional().or(z.literal("")),
  mastering_engineer_id: z.string().uuid("Invalid mastering engineer").optional().or(z.literal("")),
  status: z.enum([
    "Idea", "Writing", "Production", "Recording",
    "Editing", "Mixing", "Mastering", "Ready",
    "Released", "On Hold", "Cancelled",
  ]),
  target_release_date: z.string().optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
