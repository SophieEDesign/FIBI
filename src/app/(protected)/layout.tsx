'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import BottomNavigation from '@/components/BottomNavigation'
import DesktopNavigation from '@/components/DesktopNavigation'
import SiteFooter from '@/components/SiteFooter'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'

function ProtectedLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const redirectingRef = useRef(false)

  // Single place for auth redirect: avoid redirect loop (e.g. from Strict Mode double-invoke)
  useEffect(() => {
    if (loading) return
    if (!user && !redirectingRef.current) {
      redirectingRef.current = true
      const intended = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
      router.replace(intended ? `/login?redirect=${encodeURIComponent(intended)}` : '/login')
    }
  }, [loading, user, router, pathname, searchParams])

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
      <SiteFooter />
      <BottomNavigation isAdmin={isAdmin} />
    </>
  )
}

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center text-gray-500">
    Loading…
  </div>
)

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProtectedLayoutInner>{children}</ProtectedLayoutInner>
    </Suspense>
  )
}

