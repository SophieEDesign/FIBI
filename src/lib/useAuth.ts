'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true
    
    // First, try to get the session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (error) {
          // If refresh token is invalid, try to refresh
          console.warn('Session check error, attempting refresh:', error.message)
          
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          
          if (!isMounted) return
          
          if (refreshError || !refreshData.session) {
            // Refresh failed, user is not authenticated
            console.warn('Session refresh failed:', refreshError?.message)
            setUser(null)
          } else {
            // Refresh succeeded
            setUser(refreshData.session.user)
          }
        } else if (data.session) {
          // Session exists
          setUser(data.session.user)
        } else {
          // No session
          setUser(null)
        }
      } catch (error: any) {
        // Handle any unexpected errors
        if (!isMounted) return
        console.warn('Unexpected error checking session (non-blocking):', error)
        setUser(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkSession()

    // Also listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return
        console.log('Auth state changed:', event, session?.user?.id ? 'user logged in' : 'user logged out')
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

