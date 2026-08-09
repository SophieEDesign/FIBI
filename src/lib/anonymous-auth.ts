/**
 * Prefer Supabase anonymous sign-in for first-use ownership.
 * Falls back silently when anonymous auth is disabled in the project.
 */

import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export function isAnonymousUser(user: User | null | undefined): boolean {
  if (!user) return false
  return Boolean((user as User & { is_anonymous?: boolean }).is_anonymous)
}

/**
 * Ensure we have a session for saving. Tries anonymous sign-in when logged out.
 * Returns null if anonymous auth is unavailable (caller should use localStorage).
 */
export async function ensureSaveSession(
  supabase: SupabaseClient
): Promise<{ user: User; isAnonymous: boolean } | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    return { user, isAnonymous: isAnonymousUser(user) }
  }

  try {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) {
      console.warn('Anonymous sign-in unavailable:', error?.message)
      return null
    }
    return { user: data.user, isAnonymous: true }
  } catch (err) {
    console.warn('Anonymous sign-in failed:', err)
    return null
  }
}
