-- =============================================================================
-- Migration 008: Performance Composite B-Tree Indexes
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

-- 1. Projects: composite indexes matching list filters and sorting
CREATE INDEX IF NOT EXISTS idx_projects_status_created_desc 
    ON public.projects (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_artist_created_desc 
    ON public.projects (artist_id, created_at DESC);

-- 2. Studio Sessions: composite indexes matching date ranges, artist, and type filters
CREATE INDEX IF NOT EXISTS idx_sessions_artist_date_desc 
    ON public.sessions (artist_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_type_date_desc 
    ON public.sessions (session_type, session_date DESC);

-- 3. Contributions: composite index for confirmed/pending calculations and sorting
CREATE INDEX IF NOT EXISTS idx_contributions_status_date_desc 
    ON public.contributions (status, contribution_date DESC);

-- 4. Expenses: composite index for category filtering and date sorting
CREATE INDEX IF NOT EXISTS idx_expenses_category_date_desc 
    ON public.expenses (category, expense_date DESC);

-- 5. Releases: composite indexes for release tracking
CREATE INDEX IF NOT EXISTS idx_releases_status_date_desc 
    ON public.releases (status, release_date DESC);

CREATE INDEX IF NOT EXISTS idx_releases_artist_date_desc 
    ON public.releases (artist_id, release_date DESC);

-- 6. Equipment: composite index for owner-type inventory searches
CREATE INDEX IF NOT EXISTS idx_equipment_owner_type_name 
    ON public.equipment (owner_type, name);
