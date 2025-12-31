import { redirect } from 'next/navigation'
import HomeGrid from '@/components/HomeGrid'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Home Page
 * 
 * WHY ServiceWorkerRegistration is here:
 * - Home page is a safe, stable page (no immediate redirects)
 * - Registers SW after page loads, avoiding auth redirect race conditions
 * - NOT in RootLayout to prevent SW registration on every request
 */
export default async function HomePage({
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

    return (
      <>
        <HomeGrid confirmed={params?.confirmed === 'true'} />
        <ServiceWorkerRegistration />
      </>
    )
  } catch (error) {
    // If there's any error, redirect to login
    console.error('Home page error:', error)
    redirect('/login')
  }
}

