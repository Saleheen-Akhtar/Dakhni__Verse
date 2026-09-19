import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Supabase auth cookie: `sb-<ref>-auth-token` or chunked `sb-<ref>-auth-token.<n>`.
// Deliberately excludes `sb-<ref>-auth-token-code-verifier` (PKCE helper cookie).
const AUTH_COOKIE_RE = /^sb-.+-auth-token(\.\d+)?$/

// supabase-js refreshes any session within 90s of expiry (EXPIRY_MARGIN_MS). The fast path must
// only accept tokens with MORE than that left, otherwise a Server Component triggers a hidden
// Auth refresh whose rotated cookies cannot be saved (and a 5xx there retries for ~25s).
const FAST_PATH_MIN_TTL_SEC = 120

function decodeBase64Url(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// Strip identity headers a client could have sent; only middleware may set them.
function sanitizedHeaders(request: NextRequest): Headers {
  const h = new Headers(request.headers)
  h.delete('x-user-id')
  h.delete('x-user-email')
  return h
}

// Extract a non-expired user from the Supabase auth cookie locally (no network).
// NOTE: this decodes but does NOT verify the JWT signature. Trust boundary: every DB call
// still carries the same token to PostgREST, which verifies it. Do not use x-user-id for
// anything that does not also hit the DB with the user's own token.
function getNonExpiredTokenUser(request: NextRequest): { id: string; email?: string } | null {
  try {
    const tokenCookies = request.cookies
      .getAll()
      .filter((c) => AUTH_COOKIE_RE.test(c.name))
      .sort((a, b) => {
        const ai = Number(a.name.split('.').pop())
        const bi = Number(b.name.split('.').pop())
        return (Number.isNaN(ai) ? -1 : ai) - (Number.isNaN(bi) ? -1 : bi)
      })

    if (tokenCookies.length === 0) return null

    let rawValue = tokenCookies.map((c) => c.value).join('')
    if (rawValue.startsWith('base64-')) {
      rawValue = decodeBase64Url(rawValue.slice(7))
    }

    let tokenData: any
    try {
      tokenData = JSON.parse(rawValue)
    } catch {
      tokenData = JSON.parse(decodeURIComponent(rawValue))
    }

    const accessToken = tokenData?.access_token || (Array.isArray(tokenData) ? tokenData[0] : null)
    if (!accessToken || typeof accessToken !== 'string') return null

    const parts = accessToken.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(decodeBase64Url(parts[1]))

    const nowSec = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp > nowSec + FAST_PATH_MIN_TTL_SEC && payload.sub) {
      return { id: payload.sub, email: payload.email }
    }
  } catch {
    // Decoding failed: fall back to updateSession (network refresh)
  }
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Static assets and public resources
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/join' ||
    pathname === '/artist-form' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/join/') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/icons/')

  // Fast path for public routes (other than login)
  if (isPublicRoute && pathname !== '/login') {
    return NextResponse.next({ request: { headers: sanitizedHeaders(request) } })
  }

  // 2. Check if auth cookies exist
  const hasAuthCookie = request.cookies.getAll().some((c) => AUTH_COOKIE_RE.test(c.name))

  // Fast path: Unauthenticated user
  if (!hasAuthCookie) {
    if (pathname === '/login') {
      return NextResponse.next({ request: { headers: sanitizedHeaders(request) } })
    }
    // Protected route with NO session: Instant redirect to login without network delay
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Fast path: Authenticated user with valid, non-expired JWT in cookie
  const cachedUser = getNonExpiredTokenUser(request)
  if (cachedUser) {
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const requestHeaders = sanitizedHeaders(request)
    requestHeaders.set('x-user-id', cachedUser.id)
    if (cachedUser.email) {
      requestHeaders.set('x-user-email', cachedUser.email)
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // 4. Token expired or expiring soon: Perform full session update / token refresh via Supabase Auth
  const { supabaseResponse, user } = await updateSession(request)

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.webmanifest, manifest.json, sw.js, icons
     * - static image formats
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|manifest\\.json|sw\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
  ],
}
