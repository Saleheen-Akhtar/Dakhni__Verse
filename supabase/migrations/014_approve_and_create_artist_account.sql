-- =============================================================================
-- Migration 014: 1-Click Artist Approval & Account Creation RPC
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
        -- Existing auth user: reset password and ensure email confirmed
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

        v_account_created := false;
    ELSE
        -- Create new user in auth.users
        v_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_sso_user,
            is_anonymous,
            created_at,
            updated_at
        )
        VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000'::uuid,
            'authenticated',
            'authenticated',
            v_email,
            crypt(v_password, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('name', v_stage_name),
            false,
            false,
            NOW(),
            NOW()
        );

        -- Insert into auth.identities
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

        -- Insert or update public.users
        IF EXISTS (SELECT 1 FROM public.users WHERE email = v_email) THEN
            UPDATE public.users
            SET id = v_user_id,
                name = v_stage_name,
                role = 'Artist'::user_role,
                artist_id = p_artist_id,
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

        v_account_created := true;
    END IF;

    -- 4. Mark artist as Active
    UPDATE public.artists
    SET status = 'Active',
        dakhni_verse_role = 'Artist',
        updated_at = NOW()
    WHERE id = p_artist_id;

    -- 5. Activity log
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

GRANT EXECUTE ON FUNCTION public.approve_and_create_artist_account(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_and_create_artist_account(UUID, TEXT) TO service_role;
