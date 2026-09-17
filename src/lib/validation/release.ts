import { z } from "zod";

// === Release Validation Schemas ===

export const createReleaseSchema = z.object({
  project_id: z.string().uuid("Invalid project").optional().or(z.literal("")),
  artist_id: z.string().uuid("Invalid artist").optional().or(z.literal("")),
  title: z.string().min(1, "Release title is required").max(200),
  status: z.enum(["Planned", "Scheduled", "Released"]),
  release_date: z.string().optional().or(z.literal("")),
  distributor: z.string().max(200).optional().or(z.literal("")),
  isrc: z.string().max(50).optional().or(z.literal("")),
  spotify_url: z.string().url("Invalid Spotify URL").optional().or(z.literal("")),
  apple_music_url: z.string().url("Invalid Apple Music URL").optional().or(z.literal("")),
  youtube_url: z.string().url("Invalid YouTube URL").optional().or(z.literal("")),
  other_platform_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export const updateReleaseSchema = createReleaseSchema.partial();

export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;
