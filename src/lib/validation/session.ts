import { z } from "zod";

// === Session Validation Schemas ===

export const createSessionSchema = z
  .object({
    artist_id: z.string().uuid("Invalid artist").optional().or(z.literal("")),
    project_id: z.string().uuid("Invalid project").optional().or(z.literal("")),
    session_type: z.enum([
      "Recording", "Production", "Editing",
      "Mixing", "Mastering", "Rehearsal", "Other",
    ]),
    engineer_id: z.string().uuid("Invalid engineer").optional().or(z.literal("")),
    session_date: z.string().min(1, "Session date is required"),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    notes: z.string().max(5000).optional().or(z.literal("")),
    status: z.enum(["Scheduled", "Completed", "Cancelled"]).optional(),
    cancellation_reason: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.start_time || !data.end_time) return true;
      // Allow overnight sessions (end < start)
      return data.start_time !== data.end_time;
    },
    {
      message: "Start and end times cannot be the same",
      path: ["end_time"],
    }
  );

export const updateSessionSchema = createSessionSchema;

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

/**
 * Calculate session duration in minutes.
 * Handles overnight sessions (end time < start time).
 */
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  // Handle overnight sessions
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}
