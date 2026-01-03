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
    // Optional: Redirect authenticated users to app
    // Uncomment if you want logged-in users to go straight to /app
    /*
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      redirect('/app')
    }
    */

    // Show landing page for everyone
    return <LandingPage />
  } catch (error) {
    // If there's any error, show landing page
    console.error('Home page error:', error)
    return <LandingPage />
  }
}

