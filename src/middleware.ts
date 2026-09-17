import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Update session and retrieve authenticated user in a single network pass
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Publicly accessible routes
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/setup' ||
    pathname === '/join' ||
    pathname === '/artist-form' ||
    pathname.startsWith('/join/') ||
    pathname.startsWith('/api/public')

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
