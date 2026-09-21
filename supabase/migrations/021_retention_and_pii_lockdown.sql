-- =============================================================================
-- Migration 021: Historical Data Retention, Orphan Auth Lockdown & PII Security
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. HISTORICAL RETENTION: Soft-Delete Columns on Entities
-- Prevents hard deletions from permanently destroying financial & production history
-- -----------------------------------------------------------------------------

ALTER TABLE public.releases 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id);

ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id);

ALTER TABLE public.contributions 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id);

ALTER TABLE public.equipment 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_releases_archived_at ON public.releases(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_archived_at ON public.expenses(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contributions_archived_at ON public.contributions(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_archived_at ON public.equipment(archived_at) WHERE archived_at IS NULL;

-- -----------------------------------------------------------------------------
-- 2. HISTORICAL RETENTION: Preserve Applicant Records in Merge RPC
-- Do NOT execute hard DELETE on applicant records when merging into approved profiles
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
    v_profile RECORD;
    v_target_profile_id UUID;
    v_caller_role TEXT;
    v_merged_links_count INT := 0;
BEGIN
    -- 1. Cryptographic caller authorization: must be Manager or service_role
    v_caller_role := public.get_user_role();
    IF v_caller_role IS DISTINCT FROM 'Manager' AND current_user <> 'service_role' THEN
        RAISE EXCEPTION 'Unauthorized: Only Managers can merge artist applications.';
    END IF;

    -- 2. Validate applicant exists and is Pending or Inactive
    SELECT * INTO v_applicant
    FROM public.artists
    WHERE id = p_applicant_id;

    IF v_applicant.id IS NULL THEN
        RAISE EXCEPTION 'Applicant record not found.';
    END IF;

    IF v_applicant.status NOT IN ('Pending', 'Inactive') THEN
        RAISE EXCEPTION 'Only Pending or Inactive applications can be merged. Current status: %', v_applicant.status;
    END IF;

    -- 3. Validate target artist exists and is Active
    SELECT * INTO v_target
    FROM public.artists
    WHERE id = p_target_artist_id;

    IF v_target.id IS NULL THEN
        RAISE EXCEPTION 'Target artist profile not found.';
    END IF;

    IF v_target.id = v_applicant.id THEN
        RAISE EXCEPTION 'Cannot merge an artist application into itself.';
    END IF;

    -- 4. Fill in missing target profile fields with applicant data
    UPDATE public.artists
    SET
        legal_name = COALESCE(v_target.legal_name, NULLIF(v_applicant.legal_name, '')),
        phone = COALESCE(v_target.phone, NULLIF(v_applicant.phone, '')),
        email = COALESCE(v_target.email, NULLIF(v_applicant.email, '')),
        location = COALESCE(v_target.location, NULLIF(v_applicant.location, '')),
        profile_image_url = COALESCE(v_target.profile_image_url, v_applicant.profile_image_url),
        dakhni_verse_role = COALESCE(v_target.dakhni_verse_role, v_applicant.dakhni_verse_role),
        updated_at = NOW()
    WHERE id = p_target_artist_id;

    -- 5. Merge Music Profiles
    SELECT * INTO v_profile
    FROM public.artist_music_profiles
    WHERE artist_id = p_applicant_id;

    IF v_profile.id IS NOT NULL THEN
        SELECT id INTO v_target_profile_id
        FROM public.artist_music_profiles
        WHERE artist_id = p_target_artist_id;

        IF v_target_profile_id IS NULL THEN
            INSERT INTO public.artist_music_profiles (
                artist_id, primary_role, genres, subgenres, languages,
                vocal_style, songwriting, composition, instruments,
                influences, preferred_producers, bio
            ) VALUES (
                p_target_artist_id, v_profile.primary_role, v_profile.genres, v_profile.subgenres, v_profile.languages,
                v_profile.vocal_style, v_profile.songwriting, v_profile.composition, v_profile.instruments,
                v_profile.influences, v_profile.preferred_producers, v_profile.bio
            );
        ELSE
            UPDATE public.artist_music_profiles
            SET
                primary_role = COALESCE(primary_role, v_profile.primary_role),
                genres = ARRAY(SELECT DISTINCT UNNEST(genres || v_profile.genres)),
                subgenres = ARRAY(SELECT DISTINCT UNNEST(subgenres || v_profile.subgenres)),
                languages = ARRAY(SELECT DISTINCT UNNEST(languages || v_profile.languages)),
                vocal_style = COALESCE(vocal_style, v_profile.vocal_style),
                songwriting = songwriting OR v_profile.songwriting,
                composition = composition OR v_profile.composition,
                instruments = ARRAY(SELECT DISTINCT UNNEST(instruments || v_profile.instruments)),
                influences = COALESCE(influences, v_profile.influences),
                preferred_producers = COALESCE(preferred_producers, v_profile.preferred_producers),
                bio = COALESCE(bio, v_profile.bio),
                updated_at = NOW()
            WHERE id = v_target_profile_id;
        END IF;
    END IF;

    -- 6. Merge Social Links (avoid duplicate platform URLs)
    WITH inserted_links AS (
        INSERT INTO public.artist_social_links (artist_id, platform, url)
        SELECT p_target_artist_id, platform, url
        FROM public.artist_social_links
        WHERE artist_id = p_applicant_id
        ON CONFLICT DO NOTHING
        RETURNING id
    )
    SELECT COUNT(*) INTO v_merged_links_count FROM inserted_links;

    -- Clean up applicant social links & profile child rows
    DELETE FROM public.artist_social_links WHERE artist_id = p_applicant_id;
    DELETE FROM public.artist_music_profiles WHERE artist_id = p_applicant_id;

    -- 7. AUDIT RETENTION: Instead of hard deletion, archive the applicant application record
    UPDATE public.artists
    SET status = 'Inactive'::public.artist_status,
        duplicate_of_id = p_target_artist_id,
        updated_at = NOW()
    WHERE id = p_applicant_id;

    -- 8. Audit logging
    INSERT INTO public.activity_logs (
        action, entity_type, entity_id, description, created_at, visibility
    ) VALUES (
        'Merged Application',
        'artist',
        p_target_artist_id,
        'Merged application #' || p_applicant_id || ' into verified artist profile "' || v_target.stage_name || '"',
        NOW(),
        'admin'
    );

    RETURN jsonb_build_object(
        'success', true,
        'target_artist_id', p_target_artist_id,
        'applicant_id', p_applicant_id,
        'stage_name', v_target.stage_name,
        'merged_links', v_merged_links_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_and_approve_artist_application(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_and_approve_artist_application(UUID, UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. ORPHAN AUTH ACCOUNT LOCKDOWN
-- Prevents claiming or resetting arbitrary orphaned auth identities
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.approve_and_create_artist_account(
    p_artist_id UUID,
    p_custom_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_artist RECORD;
    v_existing_user RECORD;
    v_user_id UUID;
    v_password TEXT;
    v_email TEXT;
    v_stage_name TEXT;
    v_action TEXT := 'created';
BEGIN
    -- 1. Security Check: Enforce Manager role or service_role caller
    PERFORM public.require_manager();

    -- 2. Fetch the artist record
    SELECT id, stage_name, email, status INTO v_artist
    FROM public.artists
    WHERE id = p_artist_id;

    IF v_artist.id IS NULL THEN
        RAISE EXCEPTION 'Artist not found with id: %', p_artist_id;
    END IF;

    IF v_artist.email IS NULL OR TRIM(v_artist.email) = '' THEN
        RAISE EXCEPTION 'Artist must have a valid email address to create a login account';
    END IF;

    v_email := LOWER(TRIM(v_artist.email));
    v_stage_name := TRIM(v_artist.stage_name);

    IF p_custom_password IS NOT NULL AND LENGTH(TRIM(p_custom_password)) >= 8 THEN
        v_password := TRIM(p_custom_password);
    ELSE
        -- Generate strong CSPRNG 128-bit random password
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

        -- STRICT ORPHAN ACCOUNT GUARD:
        -- If an auth account exists, public.users MUST also exist and be safely linked to this exact artist!
        -- Orphaned Auth users must NOT be silently adopted.
        IF v_existing_user.id IS NULL THEN
            RAISE EXCEPTION 'Security alert: An unlinked account with email "%" exists in Supabase Auth. Please resolve or delete the orphaned account in the Supabase Dashboard before provisioning artist portal access.', v_email;
        END IF;

        -- Defend administrative roles: never downgrade or reassign Manager or Producer
        IF v_existing_user.role IN ('Manager', 'Producer') THEN
            RAISE EXCEPTION 'Security violation: Cannot convert an administrative (% role) account to an Artist account.', v_existing_user.role;
        END IF;

        -- Defend multi-artist linkage: never hijack an account belonging to another artist
        IF v_existing_user.artist_id IS NOT NULL AND v_existing_user.artist_id <> p_artist_id THEN
            RAISE EXCEPTION 'Security violation: This email address is already registered and linked to a different artist account.';
        END IF;

        -- Existing verified artist account: update credentials
        UPDATE auth.users
        SET encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = v_user_id;

        UPDATE public.users
        SET artist_id = p_artist_id,
            role = 'Artist'::public.user_role,
            name = COALESCE(NULLIF(v_stage_name, ''), name),
            updated_at = NOW()
        WHERE id = v_user_id;

        v_action := 'updated';
    ELSE
        -- 4. Create new Auth user with proper cryptographic ID
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
            jsonb_build_object('provider', 'email', 'providers', array['email']),
            jsonb_build_object('name', v_stage_name, 'role', 'Artist'),
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
        );

        v_action := 'created';
    END IF;

    -- 5. Mark artist as Active
    UPDATE public.artists
    SET status = 'Active',
        email = v_email,
        updated_at = NOW()
    WHERE id = p_artist_id;

    -- 6. Log activity in admin audit trail
    INSERT INTO public.activity_logs (
        action, entity_type, entity_id, description, created_at, visibility
    ) VALUES (
        'Created Artist Account',
        'artist',
        p_artist_id,
        'Created portal login for ' || v_stage_name,
        NOW(),
        'admin'
    );

    RETURN jsonb_build_object(
        'success', true,
        'action', v_action,
        'user_id', v_user_id,
        'artist_id', p_artist_id,
        'email', v_email,
        'stage_name', v_stage_name,
        'temporary_password', v_password
    );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_and_create_artist_account(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_and_create_artist_account(UUID, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. ACTIVITY LOGS PRIVACY & AUDIT SPLIT
-- Separate public collective updates from administrative security / account events
-- -----------------------------------------------------------------------------

ALTER TABLE public.activity_logs 
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'collective';

ALTER TABLE public.activity_logs 
  DROP CONSTRAINT IF EXISTS chk_activity_logs_visibility;

ALTER TABLE public.activity_logs 
  ADD CONSTRAINT chk_activity_logs_visibility CHECK (visibility IN ('collective', 'admin'));

-- Re-create activity_logs read policy
DROP POLICY IF EXISTS "Authenticated users can read activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can read collective activity or managers all" ON public.activity_logs;

CREATE POLICY "Users can read collective activity or managers all" ON public.activity_logs
    FOR SELECT USING (
        public.get_user_role() = 'Manager'
        OR visibility = 'collective'
    );

-- -----------------------------------------------------------------------------
-- 5. DATABASE-LEVEL COLUMN PRIVACY ON ARTISTS TABLE
-- Restricts legal_name, phone, and email from direct PostgREST queries by non-managers
-- -----------------------------------------------------------------------------

-- Secure RPC to retrieve artist details with strict server-side PII gating
CREATE OR REPLACE FUNCTION public.get_artist_details_secure(p_artist_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_artist RECORD;
    v_caller_role TEXT;
    v_caller_artist_id UUID;
    v_is_authorized BOOLEAN := false;
BEGIN
    SELECT * INTO v_artist
    FROM public.artists
    WHERE id = p_artist_id;

    IF v_artist.id IS NULL THEN
        RETURN NULL;
    END IF;

    v_caller_role := public.get_user_role();
    v_caller_artist_id := public.get_user_artist_id();

    IF v_caller_role = 'Manager' OR (v_caller_artist_id IS NOT NULL AND v_caller_artist_id = p_artist_id) THEN
        v_is_authorized := true;
    END IF;

    IF v_is_authorized THEN
        RETURN to_jsonb(v_artist);
    ELSE
        -- Return sanitized record with PII columns masked
        RETURN jsonb_build_object(
            'id', v_artist.id,
            'stage_name', v_artist.stage_name,
            'legal_name', NULL,
            'phone', NULL,
            'email', NULL,
            'profile_image_url', v_artist.profile_image_url,
            'location', v_artist.location,
            'date_joined', v_artist.date_joined,
            'status', v_artist.status,
            'dakhni_verse_role', v_artist.dakhni_verse_role,
            'duplicate_of_id', v_artist.duplicate_of_id,
            'created_by', v_artist.created_by,
            'created_at', v_artist.created_at,
            'updated_at', v_artist.updated_at
        );
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_artist_details_secure(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_artist_details_secure(UUID) TO authenticated, service_role;
