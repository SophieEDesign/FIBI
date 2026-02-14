'use client'

import { useEffect, useState, useRef } from 'react'
import BottomNavigation from '@/components/BottomNavigation'
import DesktopNavigation from '@/components/DesktopNavigation'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Defer nav until after mount so the correct layout (mobile vs desktop) shows
// without flashing. Reserve space so content doesn't jump when nav appears.
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [navReady, setNavReady] = useState(false)
  const mountCountRef = useRef(0)
  const prevNavReadyRef = useRef<boolean | null>(null)
  const prevLoadingRef = useRef<boolean | null>(null)

  // #region agent log
  useEffect(() => {
    mountCountRef.current += 1
    const runId = mountCountRef.current
    fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'protected/layout.tsx:mount', message: 'ProtectedLayout mounted', data: { runId }, timestamp: Date.now(), hypothesisId: 'H3' }) }).catch(() => {})
    return () => {
      fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'protected/layout.tsx:unmount', message: 'ProtectedLayout unmounting', data: { runId }, timestamp: Date.now(), hypothesisId: 'H3' }) }).catch(() => {})
    }
  }, [])
  // #endregion

  useEffect(() => {
    setNavReady(true)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'protected/layout.tsx:navReady-effect', message: 'navReady set to true', data: {}, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {})
    // #endregion
  }, [])

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

  // #region agent log
  const showPlaceholder = !loading && !navReady
  const showDesktopNav = !loading && navReady
  if (prevNavReadyRef.current !== navReady) {
    prevNavReadyRef.current = navReady
    fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'protected/layout.tsx:render', message: 'navReady changed', data: { loading, navReady, hasUser: !!user, showPlaceholder, showDesktopNav }, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {})
  }
  if (prevLoadingRef.current !== loading) {
    prevLoadingRef.current = loading
    fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'protected/layout.tsx:render', message: 'loading changed', data: { loading, navReady, hasUser: !!user }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => {})
  }
  // #endregion

  return (
    <>
      {/* Placeholder reserves space so content doesn't jump when nav mounts */}
      {!loading && (
        navReady ? (
          <DesktopNavigation user={user} isAdmin={isAdmin} />
        ) : (
          <div className="h-12 w-full bg-white border-b border-gray-200 md:block hidden" aria-hidden />
        )
      )}
      {children}
      {navReady && <BottomNavigation isAdmin={isAdmin} />}
    </>
  )
}

