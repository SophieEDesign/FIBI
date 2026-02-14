'use client'

import CalendarView from '@/components/CalendarView'
import { useAuth } from '@/lib/useAuth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function CalendarPage() {
  const { user, loading } = useAuth()

  // Auth redirect is handled by (protected) layout
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading calendar…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <CalendarView user={user} />
}

