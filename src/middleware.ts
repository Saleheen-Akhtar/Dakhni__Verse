import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Publicly accessible routes
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/join' ||
    pathname === '/artist-form' ||
    pathname.startsWith('/join/') ||
    pathname.startsWith('/api/public')

  // Check whether any Supabase auth cookies exist before running network auth
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

  // 1. If public route and not /login, bypass auth lookup completely
  if (isPublicRoute && pathname !== '/login') {
    return NextResponse.next({ request })
  }

  // 2. If visiting /login without any auth cookies, bypass auth lookup
  if (pathname === '/login' && !hasAuthCookie) {
    return NextResponse.next({ request })
  }

  // 3. For protected routes or /login with an auth cookie, update session
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
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
