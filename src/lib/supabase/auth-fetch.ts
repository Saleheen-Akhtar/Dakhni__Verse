/**
 * Fail-fast fetch for Supabase Auth calls.
 *
 * Why: when a token refresh hits a network error / 502 / 503 / 504, supabase-js retries with
 * exponential backoff (200ms, 400ms, 800ms ... up to ~25s) while the page render waits.
 * This wrapper bounds Auth calls to AUTH_DEADLINE_MS total (one quick retry for an immediate
 * 5xx/network error, none after a timeout) and then fails with a non-retryable HTTP 408, so
 * "Auth is slow/down" costs ~2.5-4s instead of ~25s.
 *
 * Trade-off: if the access token is already expired AND Auth is down, the 408 makes supabase-js
 * drop the session (the user sees /login). Acceptable: they could not have used the app anyway.
 *
 * Only `/auth/v1/` requests are touched; PostgREST / Storage pass straight through.
 */
const AUTH_DEADLINE_MS = 4000
const AUTH_ATTEMPT_TIMEOUT_MS = 2500
const RETRY_DELAY_MS = 300

function failResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'auth_timeout', message: 'Supabase Auth request timed out' }),
    { status: 408, headers: { 'content-type': 'application/json' } }
  )
}

const isUpstream5xx = (status: number) => status === 502 || status === 503 || status === 504

async function attempt(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<{ res: Response | null; timedOut: boolean }> {
  const controller = new AbortController()
  const callerSignal = init?.signal
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort()
    else callerSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => {
      controller.abort()
      resolve('timeout')
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([
      fetch(input, { ...init, signal: controller.signal }),
      timeout,
    ])
    if (result === 'timeout') return { res: null, timedOut: true }
    return { res: result, timedOut: false }
  } catch {
    return { res: null, timedOut: false }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export const authFailFastFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url

  if (!url.includes('/auth/v1/')) {
    return fetch(input, init)
  }

  const deadline = Date.now() + AUTH_DEADLINE_MS
  for (let i = 0; i < 2; i++) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) break

    const { res, timedOut } = await attempt(input, init, Math.min(AUTH_ATTEMPT_TIMEOUT_MS, remaining))
    if (res && !isUpstream5xx(res.status)) return res
    if (timedOut) break // request may have been processed server-side: do not replay

    if (i === 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
  }
  return failResponse()
}
