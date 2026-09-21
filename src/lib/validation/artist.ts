import { z } from "zod";

// === Artist Validation Schemas ===

export const createArtistSchema = z.object({
  stage_name: z.string().min(1, "Stage name is required").max(100),
  legal_name: z.string().max(200).optional().or(z.literal("")),
  profile_image_url: z
    .string()
    .refine(
      (val) =>
        !val ||
        val.startsWith("http://") ||
        val.startsWith("https://") ||
        val.startsWith("data:image/") ||
        val.startsWith("/"),
      { message: "Invalid image URL or data URI" }
    )
    .optional()
    .or(z.literal(""))
    .nullable(),
  location: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  date_joined: z.string().min(1, "Date joined is required"),
  status: z.enum(["Active", "Inactive", "Left", "Pending", "Rejected"]),
  dakhni_verse_role: z.string().max(100).optional().or(z.literal("")),
});

export const updateArtistSchema = createArtistSchema.partial();

export const artistMusicProfileSchema = z.object({
  primary_role: z.string().max(100).optional().or(z.literal("")),
  genres: z.array(z.string()).default([]),
  subgenres: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  vocal_style: z.string().max(100).optional().or(z.literal("")),
  songwriting: z.boolean().default(false),
  composition: z.boolean().default(false),
  instruments: z.array(z.string()).default([]),
  influences: z.string().max(2000).optional().or(z.literal("")),
  preferred_producers: z.string().max(500).optional().or(z.literal("")),
  bio: z.string().max(5000).optional().or(z.literal("")),
});

export const artistSocialLinkSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  url: z
    .string()
    .url("Invalid URL")
    .refine((u) => /^https?:\/\//i.test(u), "Only HTTP/HTTPS URLs are allowed"),
});

export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;
export type ArtistMusicProfileInput = z.infer<typeof artistMusicProfileSchema>;
export type ArtistSocialLinkInput = z.infer<typeof artistSocialLinkSchema>;
