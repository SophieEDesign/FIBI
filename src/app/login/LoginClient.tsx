'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSiteUrl } from '@/lib/utils'
import Link from 'next/link'

type ViewMode = 'login' | 'forgot-password'

export default function LoginClient() {
  const [viewMode, setViewMode] = useState<ViewMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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
    // Set error immediately if client creation fails
    if (typeof window !== 'undefined') {
      setError(`Configuration error: ${err.message || 'Missing Supabase credentials. Please check your environment variables.'}`)
      setCheckingAuth(false)
    }
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
      } else if (messageParam === 'password_reset') {
        setSuccessMessage('Your password has been reset successfully! You can now log in.')
      }
    }
  }, [searchParams, checkingAuth])

  // Check if user is already authenticated
  // Use getSession() instead of getUser() to check for actual session, not cached user
  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      if (!supabase) {
        if (isMounted) {
          setCheckingAuth(false)
          setError('Configuration error: Missing Supabase credentials. Please check your environment variables.')
        }
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!isMounted) return

        if (session) {
          // Only redirect if we have a real session
          const redirectParam = searchParams.get('redirect')
          router.replace(redirectParam || '/app')
        } else {
          // No session, show login form
          setCheckingAuth(false)
        }
      } catch (err: any) {
        if (!isMounted) return
        
        console.error('Error checking session:', err)
        // On error, show login form (don't block user)
        setCheckingAuth(false)
      }
    }

    checkSession()

    return () => {
      isMounted = false
    }
  }, [router, searchParams, supabase])


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
      if (viewMode === 'forgot-password') {
        if (!email) {
          setError('Please enter your email address.')
          setLoading(false)
          return
        }

        const siteUrl = getSiteUrl()
        const redirectUrl = `${siteUrl}/auth/callback?type=recovery`
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        })
        
        if (error) {
          console.error('Password reset error:', error)
          setError(error.message || 'Failed to send password reset email. Please try again.')
          setLoading(false)
          return
        }
        
        setSuccessMessage('Password reset instructions have been sent to your email. Please check your inbox.')
        setEmail('')
      } else {
        // Login mode
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) {
          // Check if error is due to unconfirmed email
          if (error.message.includes('email') && error.message.includes('confirm')) {
            setError('Please check your email and confirm your account before signing in.')
            setLoading(false)
            return
          }
          
          // Check if user doesn't exist - try to be helpful
          if (error.message.includes('Invalid login credentials') || 
              error.message.includes('Invalid email or password')) {
            setError('Invalid email or password. If you don\'t have an account, please sign up instead.')
            setLoading(false)
            return
          }
          
          // Check if email doesn't exist (some Supabase errors indicate this)
          if (error.message.toLowerCase().includes('user not found') ||
              error.message.toLowerCase().includes('does not exist')) {
            setError('No account found with this email. Please sign up instead.')
            setLoading(false)
            return
          }
          
          setError(error.message || 'An error occurred. Please try again.')
          setLoading(false)
          return
        }
        
        // Check if we have a session
        if (!data.session) {
          setError('Login failed. Please try again.')
          setLoading(false)
          return
        }
        
        // Simple redirect - let the app handle session verification
        const redirectParam = searchParams.get('redirect')
        router.push(redirectParam || '/app')
      }
    } catch (err: any) {
      console.error('Login/Signup error:', err)
      // Show more detailed error messages
      const errorMessage = err.message || err.error?.message || 'An error occurred. Please try again.'
      setError(errorMessage)
      
      // Log to console for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Full error details:', err)
      }
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
          <img
            src="/FIBI Logo.png"
            alt="FiBi"
            className="h-12 w-auto mx-auto mb-4"
          />
          <p className="text-gray-600">Save your travel places</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-sm text-gray-600">Don&apos;t have an account? <Link href="/signup" className="text-gray-900 font-medium hover:underline">Sign up</Link></p>
          </div>

          {viewMode === 'forgot-password' && (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-sm text-gray-600">Enter your email address and we&apos;ll send you a link to reset your password.</p>
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
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {viewMode !== 'forgot-password' && (
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
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
                  placeholder="••••••••"
                />
              </div>
            )}

            {viewMode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('forgot-password')
                    setError(null)
                    setSuccessMessage(null)
                    setPassword('')
                    setEmail('')
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : viewMode === 'forgot-password' ? 'Send reset link' : 'Log in'}
            </button>

            {viewMode === 'forgot-password' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login')
                    setError(null)
                    setSuccessMessage(null)
                    setEmail('')
                    setPassword('')
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Back to login
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

