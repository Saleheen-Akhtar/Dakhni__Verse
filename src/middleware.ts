import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Supabase auth cookie: `sb-<ref>-auth-token` or chunked `sb-<ref>-auth-token.<n>`.
// Deliberately excludes `sb-<ref>-auth-token-code-verifier` (PKCE helper cookie).
const AUTH_COOKIE_RE = /^sb-.+-auth-token(\.\d+)?$/

// Strip identity headers a client could have sent; only middleware may set them.
function sanitizedHeaders(request: NextRequest): Headers {
  const h = new Headers(request.headers)
  h.delete('x-user-id')
  h.delete('x-user-email')
  return h
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

  // Fast path: Unauthenticated user (0ms instant redirect, no network)
  if (!hasAuthCookie) {
    if (pathname === '/login') {
      return NextResponse.next({ request: { headers: sanitizedHeaders(request) } })
    }
    // Protected route with NO session: Instant redirect to login without network delay
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Authenticated requests: Perform cryptographically verified session update via Supabase Auth
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
