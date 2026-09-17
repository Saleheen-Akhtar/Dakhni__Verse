-- =============================================================================
-- Migration 011: Harden SECURITY DEFINER Artist Procedures
-- Enforces database-layer authentication and authorization:
--   1. create_artist_transactional: Manager or service_role only
--   2. replace_artist_social_links: Manager, owning Artist, or service_role only
-- =============================================================================

-- 1. Hardened create_artist_transactional
CREATE OR REPLACE FUNCTION public.create_artist_transactional(
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
    v_artist_id UUID;
    v_link JSONB;
BEGIN
    -- Authorization check: caller must be authenticated and have Manager role (or service_role)
    IF auth.uid() IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF auth.uid() IS NOT NULL AND public.get_user_role() <> 'Manager' THEN
        RAISE EXCEPTION 'Insufficient privileges: Only Managers can directly create artists';
    END IF;

    -- 1. Insert Core Artist
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
        TRIM(p_artist_data->>'stage_name'),
        NULLIF(p_artist_data->>'legal_name', ''),
        NULLIF(p_artist_data->>'profile_image_url', ''),
        NULLIF(p_artist_data->>'location', ''),
        NULLIF(p_artist_data->>'phone', ''),
        NULLIF(p_artist_data->>'email', ''),
        COALESCE((p_artist_data->>'date_joined')::DATE, CURRENT_DATE),
        COALESCE(p_artist_data->>'status', 'Active')::public.artist_status,
        p_artist_data->>'dakhni_verse_role'
    )
    RETURNING id INTO v_artist_id;

    -- 2. Insert Music Profile (if provided)
    IF p_profile_data IS NOT NULL AND p_profile_data <> '{}'::JSONB THEN
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
        );
    END IF;

    -- 3. Insert Social Links (if provided)
    IF p_social_links IS NOT NULL AND jsonb_array_length(p_social_links) > 0 THEN
        FOR v_link IN SELECT * FROM jsonb_array_elements(p_social_links)
        LOOP
            IF TRIM(v_link->>'url') <> '' THEN
                INSERT INTO public.artist_social_links (artist_id, platform, url)
                VALUES (v_artist_id, v_link->>'platform', TRIM(v_link->>'url'));
            END IF;
        END LOOP;
    END IF;

    -- 4. Activity Log
    INSERT INTO public.activity_logs (
        action,
        entity_type,
        entity_id,
        description,
        user_id
    )
    VALUES (
        'Artist Created',
        'Artist',
        v_artist_id,
        'Artist "' || TRIM(p_artist_data->>'stage_name') || '" created',
        auth.uid()
    );

    RETURN jsonb_build_object(
        'success', true,
        'artist_id', v_artist_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_artist_transactional(JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_artist_transactional(JSONB, JSONB, JSONB) TO authenticated, service_role;


-- 2. Hardened replace_artist_social_links
CREATE OR REPLACE FUNCTION public.replace_artist_social_links(
    p_artist_id UUID,
    p_social_links JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_link JSONB;
BEGIN
    -- Authorization check: caller must be authenticated AND (Manager OR the artist owning this record OR service_role)
    IF auth.uid() IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF auth.uid() IS NOT NULL AND public.get_user_role() <> 'Manager' AND public.get_user_artist_id() <> p_artist_id THEN
        RAISE EXCEPTION 'Insufficient privileges: Cannot modify social links for another artist';
    END IF;

    DELETE FROM public.artist_social_links WHERE artist_id = p_artist_id;

    IF p_social_links IS NOT NULL AND jsonb_array_length(p_social_links) > 0 THEN
        FOR v_link IN SELECT * FROM jsonb_array_elements(p_social_links)
        LOOP
            IF TRIM(v_link->>'url') <> '' THEN
                INSERT INTO public.artist_social_links (artist_id, platform, url)
                VALUES (p_artist_id, v_link->>'platform', TRIM(v_link->>'url'));
            END IF;
        END LOOP;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_artist_social_links(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_artist_social_links(UUID, JSONB) TO authenticated, service_role;
