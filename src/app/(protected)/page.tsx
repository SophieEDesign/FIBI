import LandingPage from '@/components/LandingPage'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Public Home Page
 * 
 * Shows LandingPage for all users.
 * If user is logged in, optionally redirect to /app (commented out for now).
 */
export default async function HomePage() {
  try {
    // Check if user is authenticated and redirect to app if so
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // If user is authenticated, redirect to app
    if (user && !authError) {
      redirect('/app')
    }

    // Show landing page for unauthenticated users
    return <LandingPage />
  } catch (error) {
    // If there's any error, show landing page (don't block access)
    console.error('Home page error:', error)
    return <LandingPage />
  }
}

