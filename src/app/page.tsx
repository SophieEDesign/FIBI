import LandingPage from '@/components/LandingPage'
import { isAnonymousUser } from '@/lib/anonymous-auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Public Home Page (root "/" – not wrapped by protected layout)
 *
 * Shows LandingPage for signed-out and anonymous visitors.
 * Only full accounts redirect to /app — anonymous sessions must still reach the landing page.
 */
export default async function HomePage() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (user && !authError && !isAnonymousUser(user)) {
      redirect('/app')
    }

    return <LandingPage />
  } catch (error) {
    console.error('Home page error:', error)
    return <LandingPage />
  }
}
