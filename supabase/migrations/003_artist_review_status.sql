-- =============================================================================
-- Migration 003: Artist Review Status (Pending & Rejected)
-- =============================================================================

-- 1. Add 'Pending' and 'Rejected' to the artist_status ENUM
ALTER TYPE artist_status ADD VALUE IF NOT EXISTS 'Pending';
ALTER TYPE artist_status ADD VALUE IF NOT EXISTS 'Rejected';

-- 2. Update submit_public_artist RPC to default new submissions to 'Pending'
CREATE OR REPLACE FUNCTION public.submit_public_artist(
    p_artist_data JSONB,
    p_profile_data JSONB DEFAULT '{}'::JSONB,
    p_social_links JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stage_name TEXT;
    v_email TEXT;
    v_phone TEXT;
    v_existing_id UUID;
    v_action TEXT;
    v_artist_id UUID;
    v_link JSONB;
BEGIN
    v_stage_name := TRIM(p_artist_data->>'stage_name');
    v_email := NULLIF(TRIM(p_artist_data->>'email'), '');
    v_phone := NULLIF(TRIM(p_artist_data->>'phone'), '');

    IF v_stage_name IS NULL OR v_stage_name = '' THEN
        RAISE EXCEPTION 'Stage name is required';
    END IF;

    -- Step 1: Check for existing artist
    IF v_email IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM artists
        WHERE LOWER(email) = LOWER(v_email)
        LIMIT 1;
    END IF;

    IF v_existing_id IS NULL THEN
        SELECT id INTO v_existing_id
        FROM artists
        WHERE LOWER(stage_name) = LOWER(v_stage_name)
        LIMIT 1;
    END IF;

    IF v_existing_id IS NULL AND v_phone IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM artists
        WHERE phone = v_phone
        LIMIT 1;
    END IF;

    -- Step 2: Update existing or Insert new as 'Pending'
    IF v_existing_id IS NOT NULL THEN
        v_action := 'updated';
        v_artist_id := v_existing_id;

        UPDATE artists
        SET
            stage_name = COALESCE(NULLIF(v_stage_name, ''), stage_name),
            legal_name = COALESCE(NULLIF(p_artist_data->>'legal_name', ''), legal_name),
            profile_image_url = COALESCE(NULLIF(p_artist_data->>'profile_image_url', ''), profile_image_url),
            location = COALESCE(NULLIF(p_artist_data->>'location', ''), location),
            phone = COALESCE(v_phone, phone),
            email = COALESCE(v_email, email),
            updated_at = NOW()
        WHERE id = v_existing_id;
    ELSE
        v_action := 'created';

        INSERT INTO artists (
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
            COALESCE(NULLIF(p_artist_data->>'dakhni_verse_role', ''), 'Applicant')
        )
        RETURNING id INTO v_artist_id;
    END IF;

    -- Step 3: Upsert Artist Music Profile
    IF p_profile_data IS NOT NULL THEN
        INSERT INTO artist_music_profiles (
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

    -- Step 4: Social Links
    DELETE FROM artist_social_links WHERE artist_id = v_artist_id;

    IF p_social_links IS NOT NULL AND jsonb_array_length(p_social_links) > 0 THEN
        FOR v_link IN SELECT * FROM jsonb_array_elements(p_social_links)
        LOOP
            IF TRIM(v_link->>'url') <> '' THEN
                INSERT INTO artist_social_links (artist_id, platform, url)
                VALUES (
                    v_artist_id,
                    v_link->>'platform',
                    v_link->>'url'
                );
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'action', v_action,
        'artist_id', v_artist_id,
        'stage_name', v_stage_name
    );
END;
$$;
