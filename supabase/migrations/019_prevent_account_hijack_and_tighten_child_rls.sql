-- =============================================================================
-- Migration 019: Prevent Account Hijacking, Tighten Child Table RLS & Security Hardening
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Hardened approve_and_create_artist_account RPC
-- Protects existing administrative and linked accounts from being hijacked
-- or demoted during public artist approval.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_and_create_artist_account(
    p_artist_id UUID,
    p_temp_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
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
    -- 1. Authorization: Only Managers (or service_role/postgres) can approve and create accounts
    IF auth.uid() IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF auth.uid() IS NOT NULL AND public.get_user_role() <> 'Manager' THEN
        RAISE EXCEPTION 'Insufficient privileges: Only Managers can approve artists and create accounts';
    END IF;

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

    -- Generate temporary password if not provided
    IF p_temp_password IS NOT NULL AND TRIM(p_temp_password) != '' THEN
        v_password := TRIM(p_temp_password);
    ELSE
        -- Standard readable temporary password (e.g. DV7a8b9c!)
        v_password := 'DV' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6) || '!';
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

        -- Existing auth user (safe to update credentials): reset password and ensure email confirmed
        UPDATE auth.users
        SET encrypted_password = crypt(v_password, gen_salt('bf')),
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
                role = 'Artist'::user_role,
                name = COALESCE(NULLIF(v_stage_name, ''), name),
                updated_at = NOW()
            WHERE id = v_user_id;
        ELSIF EXISTS (SELECT 1 FROM public.users WHERE email = v_email) THEN
            UPDATE public.users
            SET id = v_user_id,
                artist_id = p_artist_id,
                role = 'Artist'::user_role,
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
                'Artist'::user_role,
                p_artist_id,
                NOW(),
                NOW()
            );
        END IF;

        v_account_created := false; -- Updated existing account
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
            crypt(v_password, gen_salt('bf')),
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
            'Artist'::user_role,
            p_artist_id,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET artist_id = p_artist_id,
            role = 'Artist'::user_role,
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

-- -----------------------------------------------------------------------------
-- 2. Tighten RLS on artist child tables (Music Profiles & Social Links)
-- Prevents normal users from reading music profiles/social links of applicants.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Artists can read all artist profiles" ON public.artist_music_profiles;
DROP POLICY IF EXISTS "Read artist profiles for approved or own artist" ON public.artist_music_profiles;

CREATE POLICY "Read artist profiles for approved or own artist" ON public.artist_music_profiles
    FOR SELECT USING (
        public.get_user_role() = 'Manager'
        OR artist_id = public.get_user_artist_id()
        OR EXISTS (
            SELECT 1 FROM public.artists a
            WHERE a.id = artist_music_profiles.artist_id
              AND a.status NOT IN ('Pending', 'Rejected')
        )
    );

DROP POLICY IF EXISTS "Artists can read all social links" ON public.artist_social_links;
DROP POLICY IF EXISTS "Read artist social links for approved or own artist" ON public.artist_social_links;

CREATE POLICY "Read artist social links for approved or own artist" ON public.artist_social_links
    FOR SELECT USING (
        public.get_user_role() = 'Manager'
        OR artist_id = public.get_user_artist_id()
        OR EXISTS (
            SELECT 1 FROM public.artists a
            WHERE a.id = artist_social_links.artist_id
              AND a.status NOT IN ('Pending', 'Rejected')
        )
    );

-- -----------------------------------------------------------------------------
-- 3. Harden search_path on log_project_status_change
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_project_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.project_status_history (project_id, old_status, new_status, changed_by)
        VALUES (NEW.id, NULL, NEW.status, auth.uid());
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.project_status_history (project_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- -----------------------------------------------------------------------------
-- 4. Collective Artists Public Directory View (Separates public surface from base PII)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.collective_artists AS
SELECT 
    id,
    stage_name,
    profile_image_url,
    location,
    status,
    dakhni_verse_role,
    date_joined,
    created_at
FROM public.artists
WHERE status NOT IN ('Pending', 'Rejected');

GRANT SELECT ON public.collective_artists TO anon, authenticated, service_role;
