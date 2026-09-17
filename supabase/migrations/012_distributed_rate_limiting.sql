-- =============================================================================
-- Migration 012: Distributed Rate Limiting
-- Supports multi-instance serverless deployments (Vercel) without shared memory
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1,
    reset_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Index for opportunistic cleanup of expired records
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time ON public.rate_limits (reset_time);

-- Enable Row Level Security (default-deny for defense in depth; accessed strictly via SECURITY DEFINER RPC)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomic stored procedure to check and increment rate limit in a single transaction
CREATE OR REPLACE FUNCTION public.check_rate_limit_rpc(
    p_key TEXT,
    p_limit INTEGER DEFAULT 5,
    p_window_seconds INTEGER DEFAULT 600
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_record RECORD;
    v_reset TIMESTAMPTZ;
BEGIN
    -- Opportunistic cleanup of expired keys (1% sample rate to avoid locking overhead)
    IF random() < 0.01 THEN
        DELETE FROM public.rate_limits WHERE reset_time < v_now;
    END IF;

    -- Look up existing record for this key
    SELECT count, reset_time INTO v_record
    FROM public.rate_limits
    WHERE key = p_key
    FOR UPDATE;

    -- If no record or expired window, insert/reset
    IF v_record IS NULL OR v_now > v_record.reset_time THEN
        v_reset := v_now + (p_window_seconds || ' seconds')::INTERVAL;
        INSERT INTO public.rate_limits (key, count, reset_time)
        VALUES (p_key, 1, v_reset)
        ON CONFLICT (key) DO UPDATE
        SET count = 1, reset_time = v_reset;

        RETURN jsonb_build_object(
            'success', true,
            'remaining', p_limit - 1,
            'reset_time', EXTRACT(EPOCH FROM v_reset) * 1000
        );
    END IF;

    -- If limit exceeded, deny
    IF v_record.count >= p_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'remaining', 0,
            'reset_time', EXTRACT(EPOCH FROM v_record.reset_time) * 1000
        );
    END IF;

    -- Increment count
    UPDATE public.rate_limits
    SET count = count + 1
    WHERE key = p_key;

    RETURN jsonb_build_object(
        'success', true,
        'remaining', p_limit - (v_record.count + 1),
        'reset_time', EXTRACT(EPOCH FROM v_record.reset_time) * 1000
    );
END;
$$;

-- Grant execution permissions
REVOKE ALL ON FUNCTION public.check_rate_limit_rpc(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit_rpc(TEXT, INTEGER, INTEGER) TO anon, authenticated, service_role;

-- =============================================================================
-- Public Reference RPC: Active Artist Options
-- Allows stateless/cached dropdown reads without granting SELECT on artists table to anon
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_active_artist_options_rpc()
RETURNS TABLE (
    id UUID,
    stage_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT id, stage_name
    FROM public.artists
    WHERE status = 'Active'
    ORDER BY stage_name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_active_artist_options_rpc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_artist_options_rpc() TO anon, authenticated, service_role;

