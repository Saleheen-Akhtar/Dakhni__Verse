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

export const getCurrentUserProfile = cache(async (): Promise<CurrentUser | null> => {
  return measureQuery('getCurrentUserProfile', async () => {
    const user = await getUser()
    if (!user) return null

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
