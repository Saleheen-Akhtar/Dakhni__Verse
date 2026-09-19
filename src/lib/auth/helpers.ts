import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CurrentUser } from '@/types'

import { headers } from 'next/headers'

export const getSession = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
})

export const getUser = cache(async () => {
  // Check if middleware already authenticated and forwarded user identity via headers
  try {
    const reqHeaders = await headers()
    const userId = reqHeaders.get('x-user-id')
    const userEmail = reqHeaders.get('x-user-email')
    if (userId) {
      return {
        id: userId,
        email: userEmail || '',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '',
      } as any
    }
  } catch {
    // headers() unavailable (e.g. static generation or background task)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
})

export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

import { measureQuery } from '@/lib/telemetry/perf'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

function getStatelessSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const getCachedUserProfile = (userId: string) =>
  unstable_cache(
    async (id: string): Promise<CurrentUser | null> => {
      try {
        const client = getStatelessSupabase()
        const { data, error } = await client.rpc('get_user_profile_rpc', { p_user_id: id })
        if (error || !data) return null
        return data as CurrentUser
      } catch {
        return null
      }
    },
    ['user-profile', userId],
    {
      revalidate: 300, // 5 minutes
      tags: [`user-profile-${userId}`, 'user-profiles'],
    }
  )(userId)

export const getCurrentUserProfile = cache(async (): Promise<CurrentUser | null> => {
  return measureQuery('getCurrentUserProfile', async () => {
    const user = await getUser()
    if (!user) return null

    // 1. Try fast cross-request cache first (0ms on warm/repeat loads)
    try {
      const cached = await getCachedUserProfile(user.id)
      if (cached) return cached
    } catch {
      // Fallback to direct query if cache fails
    }

    // 2. Direct fallback query using user session
    const supabase = await createClient()
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, email, name, role, artist_id')
      .eq('id', user.id)
      .single()

    if (error || !profile) return null

    return profile as CurrentUser
  })
})

export async function requireRole(roles: string[]) {
  const profile = await getCurrentUserProfile()
  
  if (!profile) {
    redirect('/login')
  }

  if (!roles.includes(profile.role)) {
    redirect('/dashboard')
  }

  return profile
}

/**
 * Server action authentication helper.
 * Uses the React-cached getUser() which reads the x-user-id header forwarded
 * by middleware (0ms) instead of making a fresh auth.getUser() network call.
 */
export async function requireUserSession() {
  const user = await getUser()
  if (!user) {
    throw new Error('Authentication required')
  }

  // Re-use the React-cached profile fetch (also deduplicated within a request)
  const profile = await getCurrentUserProfile()
  if (!profile) {
    throw new Error('Authentication required')
  }

  // Return a supabase client for callers that need to run further queries
  const supabase = await createClient()
  return { user, profile, supabase }
}

/**
 * Server action manager authorization helper.
 * Throws explicit error if user is not a Manager.
 */
export async function requireManagerAction() {
  const session = await requireUserSession()
  if (session.profile?.role !== 'Manager') {
    throw new Error('Manager role required')
  }
  return session
}
