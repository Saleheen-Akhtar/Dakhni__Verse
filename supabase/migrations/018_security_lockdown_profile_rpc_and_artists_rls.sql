-- =============================================================================
-- Migration 018: Security Lockdown: Profile RPC, Artists RLS, and Project History Trigger
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Lockdown get_user_profile_rpc to service_role ONLY
-- Prevents anonymous or authenticated callers from enumerating user profiles.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_user_profile_rpc(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_rpc(UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 2. Tighten public.artists RLS Policy
-- Ensures non-managers CANNOT read Pending or Rejected applicants even via direct API.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Artists can read all artists" ON public.artists;
DROP POLICY IF EXISTS "Public and artists can read approved artists" ON public.artists;

CREATE POLICY "Public and artists can read approved artists" ON public.artists
    FOR SELECT USING (
        public.get_user_role() = 'Manager'
        OR status NOT IN ('Pending', 'Rejected')
        OR id = public.get_user_artist_id()
    );

-- -----------------------------------------------------------------------------
-- 3. Automatic Initial Project Status History on INSERT
-- Ensures project_status_history contains the creation event for every project.
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_project_status_change_trigger ON public.projects;
CREATE TRIGGER log_project_status_change_trigger
    AFTER INSERT OR UPDATE OF status ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.log_project_status_change();
