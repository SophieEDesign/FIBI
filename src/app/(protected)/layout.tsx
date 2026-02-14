'use client'

import { useEffect, useState, useRef } from 'react'
import BottomNavigation from '@/components/BottomNavigation'
import DesktopNavigation from '@/components/DesktopNavigation'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const mountCountRef = useRef(0)

  // #region agent log
  useEffect(() => {
    mountCountRef.current += 1
    const runId = mountCountRef.current
    fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'protected/layout.tsx:mount', message: 'ProtectedLayout mounted', data: { runId }, timestamp: Date.now(), hypothesisId: 'strictMode' }) }).catch(() => {})
    return () => {
      fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'protected/layout.tsx:unmount', message: 'ProtectedLayout unmounting', data: { runId }, timestamp: Date.now(), hypothesisId: 'strictMode' }) }).catch(() => {})
    }
  }, [])
  // #endregion

  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    const client = createClient()
    void (async () => {
      try {
        const { data } = await client
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (!cancelled && data?.role === 'admin') setIsAdmin(true)
        else if (!cancelled) setIsAdmin(false)
      } catch {
        if (!cancelled) setIsAdmin(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <>
      {!loading && <DesktopNavigation user={user} isAdmin={isAdmin} />}
      {children}
      <BottomNavigation isAdmin={isAdmin} />
    </>
  )
}

