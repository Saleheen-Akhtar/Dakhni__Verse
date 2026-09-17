-- =============================================================================
-- Migration 002: Public Artist Submission & Self-Service Sync
-- =============================================================================

-- 1. Public RLS Policies for Artists, Profiles, Social Links & Logs
-- Allows unauthenticated visitors to submit their artist profile via the public form

CREATE POLICY "Allow public insert on artists" ON artists 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on artists" ON artists 
    FOR UPDATE USING (true);

CREATE POLICY "Allow public read on artists" ON artists 
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on artist_music_profiles" ON artist_music_profiles 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on artist_music_profiles" ON artist_music_profiles 
    FOR UPDATE USING (true);

CREATE POLICY "Allow public read on artist_music_profiles" ON artist_music_profiles 
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on artist_social_links" ON artist_social_links 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on artist_social_links" ON artist_social_links 
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on artist_social_links" ON artist_social_links 
    FOR DELETE USING (true);

CREATE POLICY "Allow public read on artist_social_links" ON artist_social_links 
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on activity_logs" ON activity_logs 
    FOR INSERT WITH CHECK (true);

-- 2. Atomic Stored Procedure: submit_public_artist
-- Automatically checks for existing artist by email, stage name, or phone
-- Updates existing profile if matched, or creates a new artist record.
-- Runs with SECURITY DEFINER to guarantee atomic execution regardless of client auth state.

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
    -- Prioritize email match, then stage_name match (case-insensitive), then phone match
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

    -- Step 2: Update existing or Insert new
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
            status = 'Active',
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
            'Active',
            COALESCE(NULLIF(p_artist_data->>'dakhni_verse_role', ''), 'Artist')
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
            bio,
            updated_at
        )
        VALUES (
            v_artist_id,
            NULLIF(p_profile_data->>'primary_role', ''),
            COALESCE((SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_profile_data->'genres') x), '{}'::TEXT[]),
            COALESCE((SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_profile_data->'subgenres') x), '{}'::TEXT[]),
            COALESCE((SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_profile_data->'languages') x), '{}'::TEXT[]),
            NULLIF(p_profile_data->>'vocal_style', ''),
            COALESCE((p_profile_data->>'songwriting')::BOOLEAN, false),
            COALESCE((p_profile_data->>'composition')::BOOLEAN, false),
            COALESCE((SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_profile_data->'instruments') x), '{}'::TEXT[]),
            NULLIF(p_profile_data->>'influences', ''),
            NULLIF(p_profile_data->>'preferred_producers', ''),
            NULLIF(p_profile_data->>'bio', ''),
            NOW()
        )
        ON CONFLICT (artist_id) DO UPDATE
        SET
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

    -- Step 4: Sync Social Links
    IF p_social_links IS NOT NULL AND jsonb_array_length(p_social_links) > 0 THEN
        DELETE FROM artist_social_links WHERE artist_id = v_artist_id;

        FOR v_link IN SELECT * FROM jsonb_array_elements(p_social_links)
        LOOP
            IF NULLIF(TRIM(v_link->>'url'), '') IS NOT NULL THEN
                INSERT INTO artist_social_links (artist_id, platform, url)
                VALUES (
                    v_artist_id,
                    COALESCE(NULLIF(v_link->>'platform', ''), 'Other'),
                    TRIM(v_link->>'url')
                );
            END IF;
        END LOOP;
    END IF;

    -- Step 5: Log Activity
    INSERT INTO activity_logs (
        action,
        entity_type,
        entity_id,
        description
    )
    VALUES (
        CASE WHEN v_action = 'updated' THEN 'Artist Profile Updated' ELSE 'New Artist Joined' END,
        'Artist',
        v_artist_id,
        CASE WHEN v_action = 'updated' 
            THEN 'Artist "' || v_stage_name || '" updated their profile via self-service form'
            ELSE 'Artist "' || v_stage_name || '" registered via self-service form'
        END
    );

    RETURN jsonb_build_object(
        'success', true,
        'action', v_action,
        'artist_id', v_artist_id,
        'stage_name', v_stage_name
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.submit_public_artist(JSONB, JSONB, JSONB) TO anon, authenticated, service_role;
