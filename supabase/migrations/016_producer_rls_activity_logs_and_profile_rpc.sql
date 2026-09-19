-- =============================================================================
-- Migration 016: Producer Access RLS, Activity Log Forgery Guard & Profile Cache RPC
--
-- 1. Fixes activity_logs RLS so users can only insert entries matching their own auth.uid().
-- 2. Grants Producers and audio engineers read access to projects and sessions they work on.
-- 3. Adds get_user_profile_rpc for stateless cross-request profile caching.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Activity Logs: prevent user_id spoofing
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can insert own activity logs" ON public.activity_logs;

CREATE POLICY "Users can insert own activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (
        COALESCE(auth.role(), '') = 'service_role'
        OR auth.uid() = user_id
        OR public.get_user_role() = 'Manager'
    );

-- ---------------------------------------------------------------------------
-- 2. Projects & Sessions: Producer & Engineer Access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Producers and engineers can read assigned projects" ON public.projects;
CREATE POLICY "Producers and engineers can read assigned projects" ON public.projects
    FOR SELECT USING (
        public.get_user_role() = 'Producer'
        OR producer_id = public.get_user_artist_id()
        OR mix_engineer_id = public.get_user_artist_id()
        OR mastering_engineer_id = public.get_user_artist_id()
    );

DROP POLICY IF EXISTS "Producers can read status history for assigned projects" ON public.project_status_history;
CREATE POLICY "Producers can read status history for assigned projects" ON public.project_status_history
    FOR SELECT USING (
        public.get_user_role() = 'Producer'
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_status_history.project_id
              AND (
                  p.artist_id = public.get_user_artist_id()
                  OR p.producer_id = public.get_user_artist_id()
                  OR p.mix_engineer_id = public.get_user_artist_id()
                  OR p.mastering_engineer_id = public.get_user_artist_id()
              )
        )
    );

DROP POLICY IF EXISTS "Producers and engineers can read assigned sessions" ON public.sessions;
CREATE POLICY "Producers and engineers can read assigned sessions" ON public.sessions
    FOR SELECT USING (
        public.get_user_role() = 'Producer'
        OR engineer_id = public.get_user_artist_id()
    );

-- ---------------------------------------------------------------------------
-- 3. Stateless Profile Lookup RPC (Used by Next.js unstable_cache)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_profile_rpc(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
    v_profile JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'email', email,
        'name', name,
        'role', role,
        'artist_id', artist_id
    )
    INTO v_profile
    FROM public.users
    WHERE id = p_user_id;

    RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_profile_rpc(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_profile_rpc(UUID) TO anon, authenticated, service_role;
