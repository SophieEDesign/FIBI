import { createClient } from '@/lib/supabase/client'

/**
 * Auth headers for admin API fetches.
 * Prefer getUser() first so the session is refreshed if needed
 * (getSession()-only can be stale/expired and cause intermittent 401s).
 */
export async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` }
  }
  return {}
}
