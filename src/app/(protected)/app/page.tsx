import HomeGrid from '@/components/HomeGrid'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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
export default async function AppHomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; confirmed?: string }>
}) {
  try {
    // Safely await searchParams - handle potential errors
    let params: { code?: string; confirmed?: string } = {}
    try {
      params = await searchParams
    } catch (searchParamsError) {
      // If searchParams fails, use empty object
      console.warn('Error reading searchParams:', searchParamsError)
      params = {}
    }

    const code = params?.code

    // If there's a code parameter, redirect to auth callback
    if (code) {
      redirect(`/auth/callback?code=${encodeURIComponent(code)}`)
    }

    // Check if user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Redirect to login if not authenticated
    if (!user) {
      redirect('/login')
    }

    // Show home grid for authenticated users
    return (
      <>
        <HomeGrid confirmed={params?.confirmed === 'true'} />
        <ServiceWorkerRegistration />
      </>
    )
  } catch (error) {
    // If there's any error, redirect to login
    console.error('App home page error:', error)
    redirect('/login')
  }
}

