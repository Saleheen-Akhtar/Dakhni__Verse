-- =============================================================================
-- Migration 010: Database Finance Summary Aggregation RPC
-- Aggregates confirmed contributions, pending contributions, total expenses,
-- and available funds directly in PostgreSQL in a single roundtrip.
-- =============================================================================

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

REVOKE ALL ON FUNCTION public.get_finance_summary_rpc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_finance_summary_rpc() TO authenticated;
