import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Sanitize incoming headers to prevent spoofing
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-user-id')
  requestHeaders.delete('x-user-email')

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing in production.')
    }
    return { supabaseResponse, user: null }
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
    if (user) {
      requestHeaders.set('x-user-id', user.id)
      if (user.email) {
        requestHeaders.set('x-user-email', user.email)
      }
      // Re-apply headers to supabaseResponse while preserving any cookies set
      const existingCookies = supabaseResponse.cookies.getAll()
      supabaseResponse = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
      existingCookies.forEach((c) => supabaseResponse.cookies.set(c))
    }
  } catch (err) {
    // Gracefully handle unconfigured / offline supabase in middleware
  }

  return { supabaseResponse, user }
}
