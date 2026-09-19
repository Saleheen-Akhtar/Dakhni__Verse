import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Extract valid, non-expired user from Supabase auth cookie locally in Edge runtime.
// This avoids expensive network round-trips to Supabase Auth API on every RSC prefetch / navigation.
function getNonExpiredTokenUser(request: NextRequest): { id: string; email?: string } | null {
  try {
    const cookies = request.cookies.getAll()
    const tokenCookies = cookies
      .filter((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
      .sort((a, b) => a.name.localeCompare(b.name))

    if (tokenCookies.length === 0) return null

    let rawValue = tokenCookies.map((c) => c.value).join('')
    if (rawValue.startsWith('base64-')) {
      rawValue = atob(rawValue.slice(7))
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

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payloadJson = atob(payloadBase64)
    const payload = JSON.parse(payloadJson)

    const nowSec = Math.floor(Date.now() / 1000)
    // 60-second safety window before expiry to allow proactive refresh
    if (payload.exp && payload.exp > nowSec + 60 && payload.sub) {
      return { id: payload.sub, email: payload.email }
    }
  } catch {
    // If decoding fails, fall back to updateSession network refresh
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
    return NextResponse.next({ request })
  }

  // 2. Check if auth cookies exist
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

  // Fast path: Unauthenticated user
  if (!hasAuthCookie) {
    if (pathname === '/login') {
      return NextResponse.next({ request })
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

    const requestHeaders = new Headers(request.headers)
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
