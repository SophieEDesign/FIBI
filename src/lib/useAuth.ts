'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true
    
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!isMounted) return
        
        if (error) {
          // If refresh token is invalid, clear session and continue
          console.warn('Session check error (non-blocking):', error)
          setUser(null)
        } else {
          setUser(data.session?.user ?? null)
        }
        setLoading(false)
      })
      .catch((error) => {
        // Handle any unexpected errors
        if (!isMounted) return
        console.warn('Unexpected error checking session (non-blocking):', error)
        setUser(null)
        setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}

