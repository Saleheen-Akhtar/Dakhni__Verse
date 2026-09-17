-- =============================================================================
-- Migration 006: Database KPI Aggregation & Duplicate Application Tracking
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

-- =============================================================================
-- PART 1: Track Duplicate / Re-Applications
-- =============================================================================

ALTER TABLE public.artists 
ADD COLUMN IF NOT EXISTS duplicate_of_id UUID REFERENCES public.artists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_artists_duplicate_of ON public.artists(duplicate_of_id);

-- Update submit_public_artist to link duplicate submissions without altering the active artist
CREATE OR REPLACE FUNCTION public.submit_public_artist(
    p_artist_data JSONB,
    p_profile_data JSONB DEFAULT '{}'::JSONB,
    p_social_links JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_stage_name TEXT;
    v_email TEXT;
    v_phone TEXT;
    v_existing_id UUID;
    v_existing_name TEXT;
    v_action TEXT;
    v_artist_id UUID;
    v_link JSONB;
    v_description TEXT;
    v_role TEXT;
BEGIN
    v_stage_name := TRIM(p_artist_data->>'stage_name');
    v_email := NULLIF(TRIM(p_artist_data->>'email'), '');
    v_phone := NULLIF(TRIM(p_artist_data->>'phone'), '');

    IF v_stage_name IS NULL OR v_stage_name = '' THEN
        RAISE EXCEPTION 'Stage name is required';
    END IF;

    -- Check for existing artist
    IF v_email IS NOT NULL THEN
        SELECT id, stage_name INTO v_existing_id, v_existing_name
        FROM public.artists
        WHERE LOWER(email) = LOWER(v_email) AND status = 'Active'
        LIMIT 1;
    END IF;

    IF v_existing_id IS NULL THEN
        SELECT id, stage_name INTO v_existing_id, v_existing_name
        FROM public.artists
        WHERE LOWER(stage_name) = LOWER(v_stage_name) AND status = 'Active'
        LIMIT 1;
    END IF;

    IF v_existing_id IS NULL AND v_phone IS NOT NULL THEN
        SELECT id, stage_name INTO v_existing_id, v_existing_name
        FROM public.artists
        WHERE phone = v_phone AND status = 'Active'
        LIMIT 1;
    END IF;

    v_action := 'created';
    
    IF v_existing_id IS NOT NULL THEN
        v_role := 'Re-Application';
    ELSE
        v_role := 'Pending Applicant';
    END IF;

    BEGIN
        INSERT INTO public.artists (
            stage_name,
            legal_name,
            profile_image_url,
            location,
            phone,
            email,
            date_joined,
            status,
            dakhni_verse_role,
            duplicate_of_id
        )
        VALUES (
            v_stage_name,
            NULLIF(p_artist_data->>'legal_name', ''),
            NULLIF(p_artist_data->>'profile_image_url', ''),
            NULLIF(p_artist_data->>'location', ''),
            v_phone,
            v_email,
            CURRENT_DATE,
            'Pending',
            v_role,
            v_existing_id
        )
        RETURNING id INTO v_artist_id;
    EXCEPTION WHEN invalid_text_representation THEN
        INSERT INTO public.artists (
            stage_name,
            legal_name,
            profile_image_url,
            location,
            phone,
            email,
            date_joined,
            status,
            dakhni_verse_role,
            duplicate_of_id
        )
        VALUES (
            v_stage_name,
            NULLIF(p_artist_data->>'legal_name', ''),
            NULLIF(p_artist_data->>'profile_image_url', ''),
            NULLIF(p_artist_data->>'location', ''),
            v_phone,
            v_email,
            CURRENT_DATE,
            'Inactive',
            v_role,
            v_existing_id
        )
        RETURNING id INTO v_artist_id;
    END;

    -- Upsert Artist Music Profile for this application
    IF p_profile_data IS NOT NULL THEN
        INSERT INTO public.artist_music_profiles (
            artist_id,
            primary_role,
            genres,
            subgenres,
            languages,
            vocal_style,
            songwriting,
            composition,
            instruments,
            influences,
            preferred_producers,
            bio
        )
        VALUES (
            v_artist_id,
            p_profile_data->>'primary_role',
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_profile_data->'genres', '[]'::jsonb))),
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_profile_data->'subgenres', '[]'::jsonb))),
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_profile_data->'languages', '[]'::jsonb))),
            p_profile_data->>'vocal_style',
            COALESCE((p_profile_data->>'songwriting')::BOOLEAN, false),
            COALESCE((p_profile_data->>'composition')::BOOLEAN, false),
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_profile_data->'instruments', '[]'::jsonb))),
            p_profile_data->>'influences',
            p_profile_data->>'preferred_producers',
            p_profile_data->>'bio'
        )
        ON CONFLICT (artist_id) DO UPDATE SET
            primary_role = EXCLUDED.primary_role,
            genres = EXCLUDED.genres,
            subgenres = EXCLUDED.subgenres,
            languages = EXCLUDED.languages,
            vocal_style = EXCLUDED.vocal_style,
            songwriting = EXCLUDED.songwriting,
            composition = EXCLUDED.composition,
            instruments = EXCLUDED.instruments,
            influences = EXCLUDED.influences,
            preferred_producers = EXCLUDED.preferred_producers,
            bio = EXCLUDED.bio,
            updated_at = NOW();
    END IF;

    -- Insert Social Links for this application
    IF p_social_links IS NOT NULL AND jsonb_array_length(p_social_links) > 0 THEN
        FOR v_link IN SELECT * FROM jsonb_array_elements(p_social_links)
        LOOP
            IF TRIM(v_link->>'url') <> '' THEN
                INSERT INTO public.artist_social_links (artist_id, platform, url)
                VALUES (
                    v_artist_id,
                    v_link->>'platform',
                    v_link->>'url'
                );
            END IF;
        END LOOP;
    END IF;

    -- Activity Log
    IF v_existing_id IS NOT NULL THEN
        v_description := 'Re-application by "' || v_stage_name || '" (existing active artist: ' || COALESCE(v_existing_name, v_stage_name) || '). Manager approval required to merge updates.';
    ELSE
        v_description := 'New application submitted by "' || v_stage_name || '" (Pending Review)';
    END IF;

    INSERT INTO public.activity_logs (
        action,
        entity_type,
        entity_id,
        description
    )
    VALUES (
        'Artist Application Submitted',
        'Artist',
        v_artist_id,
        v_description
    );

    RETURN jsonb_build_object(
        'success', true,
        'action', v_action,
        'artist_id', v_artist_id,
        'stage_name', v_stage_name,
        'is_reapplication', (v_existing_id IS NOT NULL),
        'existing_artist_id', v_existing_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_artist(JSONB, JSONB, JSONB) TO anon, authenticated, service_role;


-- =============================================================================
-- PART 2: Database-Side KPI Aggregation (RPC)
-- Replaces multiple round trips and JavaScript in-memory .reduce()
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis_rpc(
    p_from DATE DEFAULT NULL,
    p_to DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
    v_active_artists INT;
    v_active_projects INT;
    v_production_count INT;
    v_songs_released INT;
    v_studio_sessions INT;
    v_studio_hours NUMERIC;
    v_confirmed_contrib NUMERIC;
    v_pending_contrib NUMERIC;
    v_total_expenses NUMERIC;
BEGIN
    -- 1. Active Artists
    SELECT COUNT(*) INTO v_active_artists
    FROM public.artists
    WHERE status = 'Active';

    -- 2. Projects Breakdown
    SELECT 
        COUNT(*) FILTER (WHERE status NOT IN ('Released', 'Cancelled')),
        COUNT(*) FILTER (WHERE status IN ('Production', 'Recording', 'Editing', 'Mixing', 'Mastering'))
    INTO v_active_projects, v_production_count
    FROM public.projects;

    -- 3. Released Songs
    SELECT COUNT(*) INTO v_songs_released
    FROM public.releases
    WHERE status = 'Released'
      AND (p_from IS NULL OR release_date >= p_from)
      AND (p_to IS NULL OR release_date <= p_to);

    -- 4. Studio Sessions & Hours
    SELECT 
        COUNT(*),
        ROUND(COALESCE(SUM(duration_minutes), 0) / 60.0, 1)
    INTO v_studio_sessions, v_studio_hours
    FROM public.sessions
    WHERE (p_from IS NULL OR session_date >= p_from)
      AND (p_to IS NULL OR session_date <= p_to);

    -- 5. Contributions
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE status = 'Confirmed'), 0),
        COALESCE(SUM(amount) FILTER (WHERE status = 'Pending'), 0)
    INTO v_confirmed_contrib, v_pending_contrib
    FROM public.contributions
    WHERE (p_from IS NULL OR contribution_date >= p_from)
      AND (p_to IS NULL OR contribution_date <= p_to);

    -- 6. Expenses
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
    FROM public.expenses
    WHERE (p_from IS NULL OR expense_date >= p_from)
      AND (p_to IS NULL OR expense_date <= p_to);

    RETURN jsonb_build_object(
        'activeArtists', v_active_artists,
        'activeProjects', v_active_projects,
        'songsInProduction', v_production_count,
        'songsReleased', v_songs_released,
        'studioSessions', v_studio_sessions,
        'studioHours', v_studio_hours,
        'confirmedContributions', v_confirmed_contrib,
        'pendingContributions', v_pending_contrib,
        'totalExpenses', v_total_expenses,
        'availableFunds', (v_confirmed_contrib - v_total_expenses)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis_rpc(DATE, DATE) TO authenticated, service_role;


-- =============================================================================
-- PART 3: Database-Side Studio KPIs Aggregation (RPC)
-- Grouping session types and artist breakdowns inside PostgreSQL
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_studio_kpis_rpc(
    p_from DATE DEFAULT NULL,
    p_to DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
    v_total_sessions INT;
    v_total_minutes NUMERIC;
    v_recording_sessions INT;
    v_production_sessions INT;
    v_editing_sessions INT;
    v_mixing_sessions INT;
    v_mastering_sessions INT;
    v_rehearsal_sessions INT;
    v_artists_json JSONB;
BEGIN
    -- Aggregate session types & minutes
    SELECT 
        COUNT(*),
        COALESCE(SUM(duration_minutes), 0),
        COUNT(*) FILTER (WHERE session_type = 'Recording'),
        COUNT(*) FILTER (WHERE session_type = 'Production'),
        COUNT(*) FILTER (WHERE session_type = 'Editing'),
        COUNT(*) FILTER (WHERE session_type = 'Mixing'),
        COUNT(*) FILTER (WHERE session_type = 'Mastering'),
        COUNT(*) FILTER (WHERE session_type = 'Rehearsal')
    INTO 
        v_total_sessions,
        v_total_minutes,
        v_recording_sessions,
        v_production_sessions,
        v_editing_sessions,
        v_mixing_sessions,
        v_mastering_sessions,
        v_rehearsal_sessions
    FROM public.sessions
    WHERE (p_from IS NULL OR session_date >= p_from)
      AND (p_to IS NULL OR session_date <= p_to);

    -- Aggregate sessions by artist
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_artists_json
    FROM (
        SELECT 
            COALESCE(a.stage_name, 'Unknown') AS artist_name,
            COUNT(s.id) AS count
        FROM public.sessions s
        LEFT JOIN public.artists a ON s.artist_id = a.id
        WHERE (p_from IS NULL OR s.session_date >= p_from)
          AND (p_to IS NULL OR s.session_date <= p_to)
        GROUP BY a.stage_name
        ORDER BY count DESC
    ) sub;

    RETURN jsonb_build_object(
        'totalSessions', v_total_sessions,
        'recordingSessions', v_recording_sessions,
        'productionSessions', v_production_sessions,
        'editingSessions', v_editing_sessions,
        'mixingSessions', v_mixing_sessions,
        'masteringSessions', v_mastering_sessions,
        'rehearsalSessions', v_rehearsal_sessions,
        'totalHours', ROUND(v_total_minutes / 60.0, 1),
        'averageDurationMinutes', CASE WHEN v_total_sessions > 0 THEN ROUND(v_total_minutes / v_total_sessions) ELSE 0 END,
        'sessionsByArtist', v_artists_json
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_studio_kpis_rpc(DATE, DATE) TO authenticated, service_role;
