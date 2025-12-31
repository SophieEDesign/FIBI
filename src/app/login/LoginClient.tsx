'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginClient() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'unknown' | 'exists' | 'new'>('unknown')
  const [error, setError] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Safely create Supabase client
  let supabase: ReturnType<typeof createClient> | null = null
  try {
    supabase = createClient()
  } catch (err: any) {
    // If client creation fails (missing env vars), we'll handle it in useEffect
    console.error('Failed to create Supabase client:', err)
  }

  // Check for error or success messages from URL params
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    
    // Only set error if we're done checking auth to prevent flashing
    if (!checkingAuth) {
      if (errorParam === 'confirmation_failed') {
        setError('Email confirmation failed. Please try signing up again or contact support.')
      } else if (messageParam === 'confirmed') {
        setSuccessMessage('Your email has been confirmed! You can now log in.')
      }
    }
  }, [searchParams, checkingAuth])

  // Check if user is already authenticated - middleware handles redirects, so just check for display
  useEffect(() => {
    // If Supabase client creation failed, show error and stop loading
    if (!supabase) {
      setCheckingAuth(false)
      setError('Configuration error: Missing Supabase credentials. Please check your environment variables.')
      return
    }
    
    let isMounted = true
    
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase!.auth.getUser()
        
        if (!isMounted) return
        
        // "Auth session missing" is expected when user is not logged in - not an error
        if (error && !error.message.includes('session missing')) {
          console.error('Auth check error:', error)
        }
        
        // Don't redirect here - let middleware handle it to avoid loops
        // If user exists, middleware will redirect them away from /login
        // Just stop the loading spinner
        setCheckingAuth(false)
      } catch (err: any) {
        if (!isMounted) return
        
        // Ignore "session missing" errors - they're expected for logged-out users
        if (err?.message && !err.message.includes('session missing')) {
          console.error('Error checking auth:', err)
        }
        setCheckingAuth(false)
      }
    }
    
    // Add timeout to prevent infinite loading - reduced to 2 seconds
    const timeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth check timeout - stopping loading')
        setCheckingAuth(false)
      }
    }, 2000)
    
    checkUser()
      .finally(() => {
        clearTimeout(timeout)
      })
    
    // Cleanup function
    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clear email status when email changes
  useEffect(() => {
    if (!email || !email.includes('@')) {
      setEmailStatus('unknown')
    }
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!supabase) {
      setError('Configuration error: Supabase client not available')
      return
    }
    
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (isSignUp) {
        // Check if email already exists before signing up
        if (emailStatus === 'exists') {
          setError('An account with this email already exists. Please sign in instead.')
          setIsSignUp(false)
          setLoading(false)
          return
        }

        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        
        if (error) {
          // If email already exists, switch to login
          if (error.message.includes('already registered') || 
              error.message.includes('already exists') ||
              error.message.includes('User already registered')) {
            setError('An account with this email already exists. Please sign in instead.')
            setIsSignUp(false)
            setEmailStatus('exists')
            return
          }
          throw error
        }
        
        // Show success message about email confirmation
        setSuccessMessage('Please check your email to confirm your account before signing in.')
        setIsSignUp(false) // Switch to login view
        setPassword('') // Clear password field
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) {
          // Check if error is due to unconfirmed email
          if (error.message.includes('email') && error.message.includes('confirm')) {
            throw new Error('Please check your email and confirm your account before signing in.')
          }
          
          // Check if user doesn't exist - try to be helpful
          if (error.message.includes('Invalid login credentials') || 
              error.message.includes('Invalid email or password')) {
            // Suggest they might need to sign up instead
            setError('Invalid email or password. If you don\'t have an account, please sign up instead.')
            // Don't auto-switch, but show the option
            return
          }
          
          // Check if email doesn't exist (some Supabase errors indicate this)
          if (error.message.toLowerCase().includes('user not found') ||
              error.message.toLowerCase().includes('does not exist')) {
            setError('No account found with this email. Would you like to sign up instead?')
            setIsSignUp(true)
            setEmailStatus('new')
            return
          }
          
          throw error
        }
        
        // Check for redirect parameter and preserve it
        const redirectParam = searchParams.get('redirect')
        if (redirectParam) {
          router.push(redirectParam)
        } else {
          router.push('/')
        }
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Fibi</h1>
          <p className="text-gray-600">Save your travel places</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setSuccessMessage(null)
                setError(null)
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !isSignUp
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true)
                setSuccessMessage(null)
                setError(null)
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                isSignUp
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Email status indicator - shown after we detect status from errors */}
          {email && email.includes('@') && emailStatus !== 'unknown' && (
            <div className={`text-sm px-3 py-2 rounded-lg ${
              emailStatus === 'exists'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {emailStatus === 'exists' ? (
                '✓ Account found. Please sign in.'
              ) : (
                '✓ New email. Ready to create your account.'
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null) // Clear error when typing
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Log in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

