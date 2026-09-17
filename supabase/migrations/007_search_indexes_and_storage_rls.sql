-- =============================================================================
-- Migration 007: Trigram Search Indexes & Storage Security Hardening
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

-- =============================================================================
-- PART 1: Enable pg_trgm and Add GIN Indexes for Substring Searches
-- Enables fast ILIKE '%term%' searches across high-volume tables
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fast stage name and legal name search for artists
CREATE INDEX IF NOT EXISTS idx_artists_stage_name_trgm 
    ON public.artists USING gin (stage_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_artists_legal_name_trgm 
    ON public.artists USING gin (legal_name gin_trgm_ops);

-- Fast title search for music projects
CREATE INDEX IF NOT EXISTS idx_projects_title_trgm 
    ON public.projects USING gin (title gin_trgm_ops);

-- Fast title search for music releases
CREATE INDEX IF NOT EXISTS idx_releases_title_trgm 
    ON public.releases USING gin (title gin_trgm_ops);

-- Fast inventory search for equipment
CREATE INDEX IF NOT EXISTS idx_equipment_name_trgm 
    ON public.equipment USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_equipment_brand_trgm 
    ON public.equipment USING gin (brand gin_trgm_ops);


-- =============================================================================
-- PART 2: Supabase Storage Buckets & Row Level Security Policies
-- Secures profile avatar images and sensitive finance receipts
-- =============================================================================

-- Ensure profile-images bucket exists and is publicly readable
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Ensure receipts bucket exists and is private
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    false,
    10485760, -- 10 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];


-- Profile Images Storage Policies:
-- 1. Anyone can view profile images (public)
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;
CREATE POLICY "Public can view profile images" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'profile-images');

-- 2. Anyone (including anonymous applicant on /join) can upload their avatar
DROP POLICY IF EXISTS "Anyone can upload profile image" ON storage.objects;
CREATE POLICY "Anyone can upload profile image" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'profile-images');

-- 3. Authenticated managers can update or delete profile images
DROP POLICY IF EXISTS "Managers can manage profile images" ON storage.objects;
CREATE POLICY "Managers can manage profile images" ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'profile-images'
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
              AND users.role = 'Manager'
        )
    );


-- Receipts Storage Policies (Strictly Manager Only):
-- 1. Only managers can view receipts
DROP POLICY IF EXISTS "Managers can read receipts" ON storage.objects;
CREATE POLICY "Managers can read receipts" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'receipts'
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
              AND users.role = 'Manager'
        )
    );

-- 2. Only managers can upload receipts
DROP POLICY IF EXISTS "Managers can upload receipts" ON storage.objects;
CREATE POLICY "Managers can upload receipts" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'receipts'
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
              AND users.role = 'Manager'
        )
    );

-- 3. Only managers can delete receipts
DROP POLICY IF EXISTS "Managers can delete receipts" ON storage.objects;
CREATE POLICY "Managers can delete receipts" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'receipts'
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
              AND users.role = 'Manager'
        )
    );
