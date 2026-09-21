-- =============================================================================
-- Migration 020: Security Hardening, Atomic Merge RPC, Unique Index & Privilege Lockdown
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Hardened approve_and_create_artist_account RPC
-- - Uses PERFORM public.require_manager() for fail-closed authorization
-- - Pins search_path = '' and schema-qualifies all function calls
-- - Generates cryptographically secure 128-bit temporary passwords
-- - Protects administrative accounts (Manager, Producer) and existing artist links
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_and_create_artist_account(
    p_artist_id UUID,
    p_temp_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_artist RECORD;
    v_email TEXT;
    v_stage_name TEXT;
    v_user_id UUID;
    v_password TEXT;
    v_account_created BOOLEAN := false;
    v_existing_user RECORD;
BEGIN
    -- 1. Authorization: strictly Manager or service_role
    PERFORM public.require_manager();

    -- 2. Fetch artist application
    SELECT * INTO v_artist FROM public.artists WHERE id = p_artist_id;
    IF v_artist.id IS NULL THEN
        RAISE EXCEPTION 'Artist not found';
    END IF;

    v_email := LOWER(TRIM(v_artist.email));
    v_stage_name := COALESCE(NULLIF(TRIM(v_artist.stage_name), ''), 'Artist');

    IF v_email IS NULL OR v_email = '' THEN
        RAISE EXCEPTION 'Artist does not have an email address on file. Please add an email before creating an account.';
    END IF;

    -- Generate temporary password if not provided (128 bits entropy via full UUID hex)
    IF p_temp_password IS NOT NULL AND TRIM(p_temp_password) != '' THEN
        v_password := TRIM(p_temp_password);
    ELSE
        v_password := 'DV' || REPLACE(gen_random_uuid()::TEXT, '-', '') || '!';
    END IF;

    -- 3. Check if an auth user already exists for this email
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_email LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Check public.users for existing role and artist linkage
        SELECT id, role, artist_id INTO v_existing_user
        FROM public.users
        WHERE id = v_user_id OR LOWER(email) = v_email
        LIMIT 1;

        IF v_existing_user.id IS NOT NULL THEN
            -- Defend administrative roles: never downgrade or reassign Manager or Producer
            IF v_existing_user.role IN ('Manager', 'Producer') THEN
                RAISE EXCEPTION 'Security violation: Cannot convert an administrative (% role) account to an Artist account.', v_existing_user.role;
            END IF;

            -- Defend multi-artist linkage: never hijack an account belonging to another artist
            IF v_existing_user.artist_id IS NOT NULL AND v_existing_user.artist_id <> p_artist_id THEN
                RAISE EXCEPTION 'Security violation: This email address is already registered and linked to a different artist account.';
            END IF;
        END IF;

        -- Existing auth user: reset password and ensure email confirmed
        UPDATE auth.users
        SET encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = v_user_id;

        -- Ensure auth.identities has record
        INSERT INTO auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            created_at,
            updated_at
        )
        VALUES (
            v_user_id::text,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
            'email',
            NOW(),
            NOW()
        )
        ON CONFLICT (provider_id, provider) DO UPDATE
        SET identity_data = EXCLUDED.identity_data,
            updated_at = NOW();

        -- Link or update public.users
        IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
            UPDATE public.users
            SET artist_id = p_artist_id,
                role = 'Artist'::public.user_role,
                name = COALESCE(NULLIF(v_stage_name, ''), name),
                updated_at = NOW()
            WHERE id = v_user_id;
        ELSIF EXISTS (SELECT 1 FROM public.users WHERE email = v_email) THEN
            UPDATE public.users
            SET id = v_user_id,
                artist_id = p_artist_id,
                role = 'Artist'::public.user_role,
                name = COALESCE(NULLIF(v_stage_name, ''), name),
                updated_at = NOW()
            WHERE email = v_email;
        ELSE
            INSERT INTO public.users (
                id,
                email,
                name,
                role,
                artist_id,
                created_at,
                updated_at
            )
            VALUES (
                v_user_id,
                v_email,
                v_stage_name,
                'Artist'::public.user_role,
                p_artist_id,
                NOW(),
                NOW()
            );
        END IF;

        v_account_created := false;
    ELSE
        -- Create brand new auth user
        v_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_email,
            extensions.crypt(v_password, extensions.gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('name', v_stage_name, 'role', 'Artist'),
            false,
            NOW(),
            NOW()
        );

        INSERT INTO auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            created_at,
            updated_at
        )
        VALUES (
            v_user_id::text,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
            'email',
            NOW(),
            NOW()
        );

        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            artist_id,
            created_at,
            updated_at
        )
        VALUES (
            v_user_id,
            v_email,
            v_stage_name,
            'Artist'::public.user_role,
            p_artist_id,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET artist_id = p_artist_id,
            role = 'Artist'::public.user_role,
            updated_at = NOW();

        v_account_created := true;
    END IF;

    -- 4. Mark artist as Active
    UPDATE public.artists
    SET status = 'Active',
        dakhni_verse_role = 'Artist',
        updated_at = NOW()
    WHERE id = p_artist_id;

    -- 5. Activity log with authenticated actor attribution
    INSERT INTO public.activity_logs (
        action,
        entity_type,
        entity_id,
        description,
        user_id
    )
    VALUES (
        'Artist Account Created',
        'Artist',
        p_artist_id,
        'Artist "' || v_stage_name || '" was approved and portal account was created (' || v_email || ').',
        auth.uid()
    );

    RETURN jsonb_build_object(
        'success', true,
        'artist_id', p_artist_id,
        'user_id', v_user_id,
        'stage_name', v_stage_name,
        'email', v_email,
        'temp_password', v_password,
        'account_created', v_account_created
    );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_and_create_artist_account(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_and_create_artist_account(UUID, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Atomic Merge RPC: merge_and_approve_artist_application
-- Unifies acceptArtistApplication and approveAndCreateArtistAccount merge flows.
-- Runs in a single ACID transaction; preserves existing contact info.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merge_and_approve_artist_application(
    p_applicant_id UUID,
    p_target_artist_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_applicant RECORD;
    v_target RECORD;
BEGIN
    -- 1. Authorization: Manager or service_role only
    PERFORM public.require_manager();

    -- 2. Fetch applicant and target artist records
    SELECT * INTO v_applicant FROM public.artists WHERE id = p_applicant_id;
    IF v_applicant.id IS NULL THEN
        RAISE EXCEPTION 'Applicant record not found.';
    END IF;

    SELECT * INTO v_target FROM public.artists WHERE id = p_target_artist_id;
    IF v_target.id IS NULL THEN
        RAISE EXCEPTION 'Target artist record not found.';
    END IF;

    IF p_applicant_id = p_target_artist_id THEN
        RAISE EXCEPTION 'Cannot merge an artist record into itself.';
    END IF;

    -- 3. Merge non-contact profile attributes into target artist
    -- Note: never overwrite existing verified email or phone during an application merge
    UPDATE public.artists
    SET legal_name = COALESCE(NULLIF(TRIM(v_applicant.legal_name), ''), v_target.legal_name),
        profile_image_url = COALESCE(NULLIF(TRIM(v_applicant.profile_image_url), ''), v_target.profile_image_url),
        location = COALESCE(NULLIF(TRIM(v_applicant.location), ''), v_target.location),
        email = COALESCE(v_target.email, NULLIF(TRIM(v_applicant.email), '')),
        phone = COALESCE(v_target.phone, NULLIF(TRIM(v_applicant.phone), '')),
        updated_at = NOW()
    WHERE id = p_target_artist_id;

    -- 4. Upsert Music Profile
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
        bio,
        updated_at
    )
    SELECT 
        p_target_artist_id,
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
        NOW()
    FROM public.artist_music_profiles
    WHERE artist_id = p_applicant_id
    ON CONFLICT (artist_id) DO UPDATE SET
        primary_role = COALESCE(EXCLUDED.primary_role, public.artist_music_profiles.primary_role),
        genres = COALESCE(EXCLUDED.genres, public.artist_music_profiles.genres),
        subgenres = COALESCE(EXCLUDED.subgenres, public.artist_music_profiles.subgenres),
        languages = COALESCE(EXCLUDED.languages, public.artist_music_profiles.languages),
        vocal_style = COALESCE(EXCLUDED.vocal_style, public.artist_music_profiles.vocal_style),
        songwriting = COALESCE(EXCLUDED.songwriting, public.artist_music_profiles.songwriting),
        composition = COALESCE(EXCLUDED.composition, public.artist_music_profiles.composition),
        instruments = COALESCE(EXCLUDED.instruments, public.artist_music_profiles.instruments),
        influences = COALESCE(EXCLUDED.influences, public.artist_music_profiles.influences),
        preferred_producers = COALESCE(EXCLUDED.preferred_producers, public.artist_music_profiles.preferred_producers),
        bio = COALESCE(EXCLUDED.bio, public.artist_music_profiles.bio),
        updated_at = NOW();

    -- 5. Replace Social Links atomically
    IF EXISTS (SELECT 1 FROM public.artist_social_links WHERE artist_id = p_applicant_id) THEN
        DELETE FROM public.artist_social_links WHERE artist_id = p_target_artist_id;
        INSERT INTO public.artist_social_links (artist_id, platform, url)
        SELECT p_target_artist_id, platform, url
        FROM public.artist_social_links
        WHERE artist_id = p_applicant_id;
    END IF;

    -- 6. Delete applicant record
    DELETE FROM public.artists WHERE id = p_applicant_id;

    -- 7. Audit Logging
    INSERT INTO public.activity_logs (
        action,
        entity_type,
        entity_id,
        description,
        user_id
    )
    VALUES (
        'Artist Profile Updated',
        'Artist',
        p_target_artist_id,
        'Re-application for "' || v_applicant.stage_name || '" merged atomically into profile ("' || v_target.stage_name || '").',
        auth.uid()
    );

    RETURN jsonb_build_object(
        'success', true,
        'target_artist_id', p_target_artist_id,
        'stage_name', v_target.stage_name,
        'merged', true
    );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_and_approve_artist_application(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_and_approve_artist_application(UUID, UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Lock down public.users INSERT and enforce Unique Partial Index on artist_id
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow user insert on signup" ON public.users;

-- Prevent multiple auth accounts from binding to the same artist identity
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_artist_id 
ON public.users(artist_id) 
WHERE artist_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. Guard privileged columns on public.artists
-- Blocks non-managers from altering status, dakhni_verse_role, or date_joined
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_artist_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (NEW.status IS DISTINCT FROM OLD.status
        OR NEW.dakhni_verse_role IS DISTINCT FROM OLD.dakhni_verse_role
        OR NEW.date_joined IS DISTINCT FROM OLD.date_joined)
       AND COALESCE(auth.role(), '') <> 'service_role'
       AND auth.uid() IS NOT NULL
       AND public.get_user_role() IS DISTINCT FROM 'Manager'::public.user_role THEN
        RAISE EXCEPTION 'Only Managers can change artist status, role, or date joined' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_artist_privileged_columns() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS guard_artist_privileged_columns ON public.artists;
CREATE TRIGGER guard_artist_privileged_columns
    BEFORE UPDATE ON public.artists
    FOR EACH ROW EXECUTE FUNCTION public.guard_artist_privileged_columns();

-- -----------------------------------------------------------------------------
-- 5. Set security_invoker = true on collective_artists & Revoke from anon
-- -----------------------------------------------------------------------------
ALTER VIEW public.collective_artists SET (security_invoker = true);
REVOKE ALL ON public.collective_artists FROM anon;
GRANT SELECT ON public.collective_artists TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. Revoke anon execution on Public RPCs (Protected via service_role server actions)
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.submit_public_artist(JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_public_artist(JSONB, JSONB, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.get_active_artist_options_rpc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_artist_options_rpc() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_rate_limit_rpc(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit_rpc(TEXT, INTEGER, INTEGER) TO service_role;

-- -----------------------------------------------------------------------------
-- 7. Storage Bucket Hardening
-- Mark profile-images as public bucket for direct CDN avatar loads;
-- Drop open SELECT listing policy so anon callers cannot list bucket contents.
-- -----------------------------------------------------------------------------
UPDATE storage.buckets 
SET public = true 
WHERE id = 'profile-images';

DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;
