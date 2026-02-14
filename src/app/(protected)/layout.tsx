'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BottomNavigation from '@/components/BottomNavigation'
import DesktopNavigation from '@/components/DesktopNavigation'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
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

  // Single place for auth redirect: avoid redirect loop from page also redirecting
  useEffect(() => {
    if (loading) return
    if (!user) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'protected/layout.tsx:redirect', message: 'Layout redirecting to /login', data: { loading, hasUser: !!user }, timestamp: Date.now(), hypothesisId: 'redirectLoop' }) }).catch(() => {})
      // #endregion
      router.replace('/login')
    }
  }, [loading, user, router])

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

  // Don't render protected content or children until we know auth; avoids flash and redirect loop
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    )
  }
  if (!user) {
    return null // redirect to /login is in progress
  }

  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'protected/layout.tsx:renderContent', message: 'Layout rendering content', data: { userId: user?.id }, timestamp: Date.now(), hypothesisId: 'redirectLoop' }) }).catch(() => {})
  }
  // #endregion

  return (
    <>
      <DesktopNavigation user={user} isAdmin={isAdmin} />
      {children}
      <BottomNavigation isAdmin={isAdmin} />
    </>
  )
}

