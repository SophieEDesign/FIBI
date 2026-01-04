'use client'

import CalendarView from '@/components/CalendarView'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function CalendarPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated (after loading)
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading calendar…
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  return <CalendarView user={user} />
}

