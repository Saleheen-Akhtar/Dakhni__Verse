import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { CurrentUser } from '@/types'
import { headers } from 'next/headers'
import { unstable_cache } from 'next/cache'
import { measureQuery } from '@/lib/telemetry/perf'

export const getSession = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
})

export const getUser = cache(async () => {
  // Check if verified middleware forwarded user identity via headers
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

function getAdminSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (serviceKey && url) {
    return createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return null
}

const getCachedUserProfile = (userId: string) =>
  unstable_cache(
    async (id: string): Promise<CurrentUser | null> => {
      try {
        const admin = getAdminSupabase()
        if (!admin) return null
        const { data, error } = await admin.rpc('get_user_profile_rpc', { p_user_id: id })
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

    // 1. Try fast cross-request cache first if service role key is configured
    try {
      const cached = await getCachedUserProfile(user.id)
      if (cached) return cached
    } catch {
      // Fallback to direct query if cache fails
    }

    // 2. Direct fallback query using user session (authenticated client honors RLS)
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
 * Cryptographically verifies token authenticity via Supabase Auth for all mutations.
 */
export async function requireUserSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Authentication required')
  }

  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('id, email, name, role, artist_id')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    throw new Error('Authentication required')
  }

  return { user, profile: profile as CurrentUser, supabase }
}

/**
 * Server action manager authorization helper.
 * Cryptographically verifies user and throws explicit error if user is not a Manager.
 */
export async function requireManagerAction() {
  const session = await requireUserSession()
  if (session.profile?.role !== 'Manager') {
    throw new Error('Manager role required')
  }
  return session
}
