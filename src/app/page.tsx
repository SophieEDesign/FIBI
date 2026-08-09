import LandingPage from '@/components/LandingPage'
import { createClient } from '@/lib/supabase/server'
import { listPublishedGuides } from '@/lib/travel-guides'
import { redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Public Home Page (root "/" – not wrapped by protected layout)
 *
 * Shows LandingPage for unauthenticated users.
 * Redirects to /app (Places) when user is logged in.
 * Kept at root so we never get double header/footer from (protected) layout + LandingPage.
 */
export default async function HomePage() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (user && !authError) {
      redirect('/app')
    }

    let teaserGuides = await listPublishedGuides({ featuredOnly: true, limit: 4 })
    if (teaserGuides.length === 0) {
      teaserGuides = await listPublishedGuides({ limit: 4 })
    }

    return <LandingPage teaserGuides={teaserGuides} />
  } catch (error) {
    console.error('Home page error:', error)
    return <LandingPage teaserGuides={[]} />
  }
}
