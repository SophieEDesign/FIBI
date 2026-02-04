'use client'

import CalendarView from '@/components/CalendarView'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function CalendarPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)

  // Redirect to login if not authenticated (after loading)
  useEffect(() => {
    // Only check once loading is complete
    if (loading) return
    
    setAuthChecked(true)
    
    if (!user) {
      console.log('Calendar: No user found, redirecting to login')
      router.replace('/login')
    }
  }, [loading, user, router])

  // Show loading state while checking auth
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading calendar…</p>
        </div>
      </div>
    )
  }

  // If no user after loading, show nothing (redirect will happen)
  if (!user) {
    return null
  }

  return <CalendarView user={user} />
}

