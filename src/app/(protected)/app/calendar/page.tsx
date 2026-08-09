import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CalendarView from '@/components/CalendarView'
import type { Itinerary, SavedItem } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/app/calendar')
  }

  const [{ data: itineraries }, { data: items }] = await Promise.all([
    supabase.from('itineraries').select('*').order('created_at', { ascending: false }),
    supabase.from('saved_items').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Loading your trips…
        </div>
      }
    >
      <CalendarView
        user={user}
        initialItineraries={(itineraries as Itinerary[]) || []}
        initialItems={(items as SavedItem[]) || []}
      />
    </Suspense>
  )
}
