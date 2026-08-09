'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'

/**
 * Client-side admin gate for /app/admin pages.
 * APIs still enforce requireAdmin; this only handles UX redirect.
 */
export function useRequireAdmin(loginRedirectPath = '/app/admin') {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [adminChecked, setAdminChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (authLoading || !user?.id) {
      if (!authLoading && !user) {
        router.replace(`/login?redirect=${encodeURIComponent(loginRedirectPath)}`)
      }
      return
    }
    let cancelled = false
    const client = createClient()
    Promise.resolve(
      client.from('profiles').select('role').eq('id', user.id).single()
    )
      .then(({ data, error }) => {
        if (cancelled) return
        setAdminChecked(true)
        setIsAdmin(!error && data?.role === 'admin')
      })
      .catch(() => {
        if (!cancelled) {
          setAdminChecked(true)
          setIsAdmin(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, user, router, loginRedirectPath])

  useEffect(() => {
    if (!adminChecked || isAdmin) return
    router.replace('/app')
  }, [adminChecked, isAdmin, router])

  return {
    user,
    isAdmin,
    loading: authLoading || !adminChecked,
  }
}
