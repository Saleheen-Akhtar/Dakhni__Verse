-- =============================================================================
-- Migration 017: Session Status Schema, KPI Cancellation Fix & Role Permissions
--
-- 1. Adds status, cancellation_reason, cancelled_at, cancelled_by columns to sessions.
-- 2. Backfills legacy sessions where notes contained '[CANCELLED]'.
-- 3. Updates get_dashboard_kpis_rpc and get_studio_kpis_rpc to exclude Cancelled sessions.
-- 4. Allows Producers alongside Managers to manage studio sessions.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add status and cancellation columns to sessions
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);

-- ---------------------------------------------------------------------------
-- 2. Backfill existing sessions that have [CANCELLED] in notes
-- ---------------------------------------------------------------------------
UPDATE public.sessions
SET status = 'Cancelled',
    cancelled_at = updated_at
WHERE notes LIKE '%[CANCELLED]%' AND status <> 'Cancelled';

-- ---------------------------------------------------------------------------
-- 3. Update get_dashboard_kpis_rpc to exclude Cancelled sessions from KPIs
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

    -- 4. Studio Sessions & Hours (Active only, exclude Cancelled)
    SELECT 
        COUNT(*),
        ROUND(COALESCE(SUM(duration_minutes), 0) / 60.0, 1)
    INTO v_studio_sessions, v_studio_hours
    FROM public.sessions
    WHERE status <> 'Cancelled'
      AND (p_from IS NULL OR session_date >= p_from)
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

-- ---------------------------------------------------------------------------
-- 4. Update get_studio_kpis_rpc to exclude Cancelled sessions
-- ---------------------------------------------------------------------------
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

    -- Aggregate session types & minutes (exclude Cancelled)
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
    WHERE status <> 'Cancelled'
      AND (p_from IS NULL OR session_date >= p_from)
      AND (p_to IS NULL OR session_date <= p_to);

    -- Aggregate sessions by artist (exclude Cancelled)
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_artists_json
    FROM (
        SELECT 
            COALESCE(a.stage_name, 'Unknown') AS artist_name,
            COUNT(s.id) AS count
        FROM public.sessions s
        LEFT JOIN public.artists a ON s.artist_id = a.id
        WHERE s.status <> 'Cancelled'
          AND (p_from IS NULL OR s.session_date >= p_from)
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

-- ---------------------------------------------------------------------------
-- 5. Permissions: Allow Producers and Managers to manage sessions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Managers can perform full CRUD on sessions" ON public.sessions;
DROP POLICY IF EXISTS "Managers and Producers can perform full CRUD on sessions" ON public.sessions;

CREATE POLICY "Managers and Producers can perform full CRUD on sessions" ON public.sessions
    FOR ALL USING (public.get_user_role() IN ('Manager', 'Producer'));
