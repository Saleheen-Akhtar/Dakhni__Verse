import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CurrentUser } from '@/types'

export const getSession = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
})

export const getUser = cache(async () => {
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
