'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    setNavReady(true)
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

