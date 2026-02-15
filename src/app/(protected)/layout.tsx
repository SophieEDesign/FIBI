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
  const redirectingRef = useRef(false)

  // Single place for auth redirect: avoid redirect loop (e.g. from Strict Mode double-invoke)
  useEffect(() => {
    if (loading) return
    if (!user && !redirectingRef.current) {
      redirectingRef.current = true
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

  return (
    <>
      <DesktopNavigation user={user} isAdmin={isAdmin} />
      {children}
      <BottomNavigation isAdmin={isAdmin} />
    </>
  )
}

