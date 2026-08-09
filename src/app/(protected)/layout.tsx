'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BottomNavigation from '@/components/BottomNavigation'
import DesktopNavigation from '@/components/DesktopNavigation'
import SiteFooter from '@/components/SiteFooter'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'
import { mergeGuestSavesToAccount, guestSaveCount } from '@/lib/guest-saves'
import { isAnonymousUser } from '@/lib/anonymous-auth'

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
  const mergedGuestRef = useRef(false)
  const anonymous = isAnonymousUser(user)

  // Merge guest saves once after login (including after anonymous session starts)
  useEffect(() => {
    if (!user?.id || mergedGuestRef.current) return
    if (guestSaveCount() === 0) {
      mergedGuestRef.current = true
      return
    }
    mergedGuestRef.current = true
    const client = createClient()
    void mergeGuestSavesToAccount(user.id, client)
  }, [user?.id])

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
      {anonymous && (
        <div className="bg-fibi-blue-light/40 border-b border-fibi-blue-light/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-fibi-text-primary">
              Keep your places — create an account when you&apos;re ready.
            </p>
            <Link
              href={`/signup?redirect=${encodeURIComponent(pathname || '/app')}`}
              className="font-medium text-fibi-primary hover:underline shrink-0"
            >
              Create an account
            </Link>
          </div>
        </div>
      )}
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

