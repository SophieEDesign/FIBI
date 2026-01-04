'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import HomeGrid from '@/components/HomeGrid'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import SharingTutorial from '@/components/SharingTutorial'

/**
 * App Home Page (Authenticated)
 * 
 * Shows HomeGrid for authenticated users.
 * Redirects to login if not authenticated.
 * 
 * WHY ServiceWorkerRegistration is here:
 * - Home page is a safe, stable page (no immediate redirects)
 * - Registers SW after page loads, avoiding auth redirect race conditions
 * - NOT in RootLayout to prevent SW registration on every request
 */
export default function AppHomePage() {
  const { user, loading } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Handle code parameter (from email confirmation)
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}`)
    }
  }, [searchParams, router])

  // Redirect to login if not authenticated (after loading)
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading your places…
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  const confirmed = searchParams.get('confirmed') === 'true'

  return (
    <>
      <HomeGrid user={user} confirmed={confirmed} />
      <ServiceWorkerRegistration />
      <SharingTutorial />
    </>
  )
}

