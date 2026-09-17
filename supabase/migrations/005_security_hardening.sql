-- =============================================================================
-- Migration 005: Security Hardening
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

-- =============================================
-- PART 1: Drop overly permissive public RLS policies from migration 002
-- These allow ANYONE (even unauthenticated users) to INSERT/UPDATE/DELETE
-- =============================================

DROP POLICY IF EXISTS "Allow public insert on artists" ON artists;
DROP POLICY IF EXISTS "Allow public update on artists" ON artists;
DROP POLICY IF EXISTS "Allow public read on artists" ON artists;

DROP POLICY IF EXISTS "Allow public insert on artist_music_profiles" ON artist_music_profiles;
DROP POLICY IF EXISTS "Allow public update on artist_music_profiles" ON artist_music_profiles;
DROP POLICY IF EXISTS "Allow public read on artist_music_profiles" ON artist_music_profiles;

DROP POLICY IF EXISTS "Allow public insert on artist_social_links" ON artist_social_links;
DROP POLICY IF EXISTS "Allow public update on artist_social_links" ON artist_social_links;
DROP POLICY IF EXISTS "Allow public delete on artist_social_links" ON artist_social_links;
DROP POLICY IF EXISTS "Allow public read on artist_social_links" ON artist_social_links;

DROP POLICY IF EXISTS "Allow public insert on activity_logs" ON activity_logs;

-- =============================================
-- PART 2: Revoke GRANT ALL from anon on tables (from migration 004)
-- The only public entry point should be the submit_public_artist RPC
-- =============================================

REVOKE ALL ON TABLE artists FROM anon;
REVOKE ALL ON TABLE artist_music_profiles FROM anon;
REVOKE ALL ON TABLE artist_social_links FROM anon;
REVOKE ALL ON TABLE activity_logs FROM anon;

-- =============================================
-- PART 3: Fix user signup privilege escalation
-- Old policy allowed inserting with role='Manager'
-- =============================================

DROP POLICY IF EXISTS "Allow user insert on signup" ON users;

CREATE POLICY "Allow user insert on signup" ON users
    FOR INSERT WITH CHECK (
        auth.uid() = id
        AND role = 'Artist'
    );

-- =============================================
-- PART 4: Harden submit_public_artist RPC
-- - SET search_path = '' to prevent path manipulation
-- - Schema-qualify all table references
-- - NEVER update existing artists unauthenticated
--   If matching artist found, create a NEW Pending entry
--   with a note about the duplicate
-- =============================================

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
    v_action TEXT;
    v_artist_id UUID;
    v_link JSONB;
    v_description TEXT;
BEGIN
    v_stage_name := TRIM(p_artist_data->>'stage_name');
    v_email := NULLIF(TRIM(p_artist_data->>'email'), '');
    v_phone := NULLIF(TRIM(p_artist_data->>'phone'), '');

    IF v_stage_name IS NULL OR v_stage_name = '' THEN
        RAISE EXCEPTION 'Stage name is required';
    END IF;

    -- Check for existing artist (for informational purposes only — we never update)
    IF v_email IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM public.artists
        WHERE LOWER(email) = LOWER(v_email)
        LIMIT 1;
    END IF;

    IF v_existing_id IS NULL THEN
        SELECT id INTO v_existing_id
        FROM public.artists
        WHERE LOWER(stage_name) = LOWER(v_stage_name)
        LIMIT 1;
    END IF;

    IF v_existing_id IS NULL AND v_phone IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM public.artists
        WHERE phone = v_phone
        LIMIT 1;
    END IF;

    -- ALWAYS create a new Pending entry, even if a match exists
    -- Managers will review and merge/reject duplicates
    v_action := 'created';

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
            dakhni_verse_role
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
            'Pending Applicant'
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
            dakhni_verse_role
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
            'Pending Applicant'
        )
        RETURNING id INTO v_artist_id;
    END;

    -- Upsert Artist Music Profile
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

    -- Insert Social Links for the new entry
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
        v_description := 'Re-submission by "' || v_stage_name || '" (possible duplicate of existing artist, requires manager review)';
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
        'stage_name', v_stage_name
    );
END;
$$;

-- Keep execute permission for anon (this is the ONLY public entry point)
GRANT EXECUTE ON FUNCTION public.submit_public_artist(JSONB, JSONB, JSONB) TO anon, authenticated, service_role;
