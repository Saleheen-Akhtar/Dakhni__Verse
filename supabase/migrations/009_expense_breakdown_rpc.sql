-- =============================================================================
-- Migration 009: Database-Side Expense Breakdown Aggregation (RPC)
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

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

GRANT EXECUTE ON FUNCTION public.get_expense_breakdown_rpc(DATE, DATE) TO authenticated, service_role;
