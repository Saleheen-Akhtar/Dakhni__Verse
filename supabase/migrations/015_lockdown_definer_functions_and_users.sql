-- =============================================================================
-- Migration 015: Lock down SECURITY DEFINER functions + users privilege escalation
--
-- Fixes (all verified against a local Supabase-like Postgres before shipping):
--  A. Any logged-in user could UPDATE their own public.users row to role='Manager'
--  B. anon (public anon key) could EXECUTE every SECURITY DEFINER RPC because
--     Supabase default privileges grant EXECUTE to anon on new public functions
--     and REVOKE FROM PUBLIC does not remove that explicit grant
--  C. The guard `current_user NOT IN ('postgres','service_role')` in 011/014 is
--     ineffective: inside SECURITY DEFINER, current_user is the function OWNER
--     (postgres), so unauthenticated callers were never blocked
--  D. KPI / finance RPCs had no role check at all
--  E. Temp passwords used MD5(RANDOM()) (not cryptographically secure)
--
-- Run in Supabase Dashboard -> SQL Editor. Safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Stop future functions in public from being auto-exposed to anon
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- ---------------------------------------------------------------------------
-- 1. Central authorization helper (Manager or service_role only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.require_manager()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
    IF COALESCE(auth.role(), '') = 'service_role' THEN
        RETURN;
    END IF;
    IF auth.uid() IS NULL OR public.get_user_role() IS DISTINCT FROM 'Manager'::public.user_role THEN
        RAISE EXCEPTION 'Manager role required' USING ERRCODE = '42501';
    END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.require_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.require_manager() TO authenticated, service_role;

-- Pin search_path on the RLS helpers (bodies are already schema-qualified)
ALTER FUNCTION public.get_user_role() SET search_path = '';
ALTER FUNCTION public.get_user_artist_id() SET search_path = '';

-- ---------------------------------------------------------------------------
-- 2. users table: block self-promotion
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own user record" ON public.users;
CREATE POLICY "Users can update their own user record" ON public.users
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.guard_user_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role
        OR NEW.artist_id IS DISTINCT FROM OLD.artist_id
        OR NEW.email IS DISTINCT FROM OLD.email
        OR NEW.id IS DISTINCT FROM OLD.id)
       AND COALESCE(auth.role(), '') <> 'service_role'
       AND auth.uid() IS NOT NULL
       AND public.get_user_role() IS DISTINCT FROM 'Manager'::public.user_role THEN
        RAISE EXCEPTION 'Only Managers can change role, artist link, or email' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_user_privileged_columns() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS guard_user_privileged_columns ON public.users;
CREATE TRIGGER guard_user_privileged_columns
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.guard_user_privileged_columns();

-- ---------------------------------------------------------------------------
-- 3. KPI / finance RPCs: Manager-only
-- ---------------------------------------------------------------------------
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
    PERFORM public.require_manager();
    -- 1. Active Artists
    SELECT COUNT(*) INTO v_active_artists
    FROM public.artists
    WHERE status = 'Active';

    -- 2. Projects Breakdown (Excludes terminal & paused statuses)
    SELECT 
        COUNT(*) FILTER (WHERE status NOT IN ('Released', 'On Hold', 'Cancelled')),
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
REVOKE ALL ON FUNCTION public.get_dashboard_kpis_rpc(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis_rpc(DATE, DATE) TO authenticated, service_role;

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
    PERFORM public.require_manager();
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
REVOKE ALL ON FUNCTION public.get_studio_kpis_rpc(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_studio_kpis_rpc(DATE, DATE) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_expense_breakdown_rpc(
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
    v_result JSONB;
BEGIN
    PERFORM public.require_manager();
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object('name', category, 'value', total_amount)
            ORDER BY total_amount DESC
        ),
        '[]'::jsonb
    )
    INTO v_result
    FROM (
        SELECT category, SUM(amount) AS total_amount
        FROM public.expenses
        WHERE (p_from IS NULL OR expense_date >= p_from)
          AND (p_to IS NULL OR expense_date <= p_to)
        GROUP BY category
        HAVING SUM(amount) > 0
    ) sub;

    RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_expense_breakdown_rpc(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_expense_breakdown_rpc(DATE, DATE) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_finance_summary_rpc()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
    v_confirmed_contrib NUMERIC := 0;
    v_pending_contrib NUMERIC := 0;
    v_total_expenses NUMERIC := 0;
    v_available_funds NUMERIC := 0;
BEGIN
    PERFORM public.require_manager();
    SELECT COALESCE(SUM(amount), 0) INTO v_confirmed_contrib
    FROM public.contributions
    WHERE status = 'Confirmed';

    SELECT COALESCE(SUM(amount), 0) INTO v_pending_contrib
    FROM public.contributions
    WHERE status = 'Pending';

    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
    FROM public.expenses;

    v_available_funds := v_confirmed_contrib - v_total_expenses;

    RETURN json_build_object(
        'confirmedContributions', v_confirmed_contrib,
        'pendingContributions', v_pending_contrib,
        'totalExpenses', v_total_expenses,
        'availableFunds', v_available_funds
    );
END;
$$;
REVOKE ALL ON FUNCTION public.get_finance_summary_rpc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_finance_summary_rpc() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Artist RPCs: replace ineffective guards
-- ---------------------------------------------------------------------------
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
    PERFORM public.require_manager();

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
REVOKE ALL ON FUNCTION public.create_artist_transactional(JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_artist_transactional(JSONB, JSONB, JSONB) TO authenticated, service_role;

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
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;
        IF public.get_user_role() IS DISTINCT FROM 'Manager'::public.user_role
           AND public.get_user_artist_id() IS DISTINCT FROM p_artist_id THEN
            RAISE EXCEPTION 'Insufficient privileges: Cannot modify social links for another artist' USING ERRCODE = '42501';
        END IF;
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
REVOKE ALL ON FUNCTION public.replace_artist_social_links(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_artist_social_links(UUID, JSONB) TO authenticated, service_role;

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
    -- 1. Authorization: Manager or service_role only
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

    -- Generate temporary password if not provided (CSPRNG via gen_random_uuid)
    IF p_temp_password IS NOT NULL AND TRIM(p_temp_password) != '' THEN
        v_password := TRIM(p_temp_password);
    ELSE
        -- Standard readable temporary password with high entropy (e.g. DV7a8b9c1d2e!)
        v_password := 'DV' || SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 10) || '!';
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
REVOKE ALL ON FUNCTION public.approve_and_create_artist_account(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_and_create_artist_account(UUID, TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Optional: artists directory ordering index (run EXPLAIN ANALYZE first)
-- ---------------------------------------------------------------------------
-- CREATE INDEX IF NOT EXISTS idx_artists_created_at_desc ON public.artists (created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. VERIFY (all should be false / errors):
-- ---------------------------------------------------------------------------
-- select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon_exec
-- from pg_proc p join pg_namespace n on n.oid=p.pronamespace
-- where n.nspname='public' and p.prosecdef order by 1;
-- Expected anon_exec = true ONLY for: submit_public_artist, check_rate_limit_rpc,
-- get_active_artist_options_rpc, get_user_role, get_user_artist_id.
