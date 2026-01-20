'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSiteUrl } from '@/lib/utils'
import Link from 'next/link'

export default function SignupClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    console.error('Failed to create Supabase client:', err)
    if (typeof window !== 'undefined') {
      setError(`Configuration error: ${err.message || 'Missing Supabase credentials. Please check your environment variables.'}`)
      setCheckingAuth(false)
    }
  }

  // Check for error or success messages from URL params
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    
    if (!checkingAuth) {
      if (errorParam === 'confirmation_failed') {
        setError('Email confirmation failed. Please try signing up again or contact support.')
      } else if (messageParam === 'confirmed') {
        setSuccessMessage('Your email has been confirmed! You can now log in.')
      }
    }
  }, [searchParams, checkingAuth])

  // Check if user is already authenticated
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
          const redirectParam = searchParams.get('redirect')
          router.replace(redirectParam || '/app')
        } else {
          setCheckingAuth(false)
        }
      } catch (err: any) {
        if (!isMounted) return
        console.error('Error checking session:', err)
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
      // Validate password match
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        setLoading(false)
        return
      }

      // Validate password length
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.')
        setLoading(false)
        return
      }

      const siteUrl = getSiteUrl()
      const redirectUrl = `${siteUrl}/auth/callback`
      
      console.log('Signing up with:', { email, redirectUrl })
      
      // Retry logic for network issues
      let lastError = null
      let attempts = 0
      const maxAttempts = 2
      
      while (attempts < maxAttempts) {
        try {
          const { error, data } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: redirectUrl,
            },
          })
          
          if (error) {
            lastError = error
            console.error('Sign up error:', error)
            
            // If email already exists, redirect to login
            if (error.message.includes('already registered') || 
                error.message.includes('already exists') ||
                error.message.includes('User already registered')) {
              setError('An account with this email already exists. Please sign in instead.')
              setTimeout(() => {
                router.push('/login')
              }, 2000)
              setLoading(false)
              return
            }
            
            // If it's a network/timeout error and we have retries left, try again
            if ((error.message.includes('timeout') || 
                 error.message.includes('504') ||
                 error.message.includes('network') ||
                 error.message.includes('fetch')) && 
                attempts < maxAttempts - 1) {
              attempts++
              await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
              continue
            }
            
            // Show user-friendly error messages
            if (error.message.includes('timeout') || error.message.includes('504')) {
              setError('The server is taking too long to respond. Please try again in a moment.')
            } else {
              setError(error.message || 'Failed to sign up. Please try again.')
            }
            setLoading(false)
            return
          }
          
          // Success - break out of retry loop
          if (data?.user) {
            setSuccessMessage('Please check your email to confirm your account before signing in.')
            setEmail('')
            setPassword('')
            setConfirmPassword('')
            setLoading(false)
            return
          }
          
          break
        } catch (err: any) {
          lastError = err
          console.error('Signup attempt error:', err)
          
          // Check for retryable errors (network, timeout, fetch errors)
          const isRetryable = 
            err.name === 'AuthRetryableFetchError' ||
            err.message?.includes('timeout') || 
            err.message?.includes('504') ||
            err.message?.includes('network') ||
            err.message?.includes('fetch') ||
            err.message?.includes('Failed to fetch')
          
          // If it's a retryable error and we have retries left, try again
          if (isRetryable && attempts < maxAttempts - 1) {
            attempts++
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          
          // If we've exhausted retries or it's not a retryable error, show error
          if (isRetryable) {
            setError('The server is taking too long to respond. Please try again in a moment.')
          } else {
            setError('An unexpected error occurred. Please try again.')
          }
          setLoading(false)
          return
        }
      }
      
      // If we get here and no success, show error
      if (lastError) {
        const isTimeout = 
          lastError.name === 'AuthRetryableFetchError' ||
          lastError.message?.includes('timeout') || 
          lastError.message?.includes('504')
        
        if (isTimeout) {
          setError('The server is taking too long to respond. Please try again in a moment.')
        } else {
          setError('Failed to sign up. Please try again.')
        }
        setLoading(false)
        return
      }
      
      // Check if sign up was successful
      if (data?.user) {
        setSuccessMessage('Please check your email to confirm your account before signing in.')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      } else {
        setError('Sign up failed. Please try again.')
      }
    } catch (err: any) {
      console.error('Signup error:', err)
      const errorMessage = err.message || err.error?.message || 'An error occurred. Please try again.'
      setError(errorMessage)
      
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
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create your account</h2>
            <p className="text-sm text-gray-600">Already have an account? <Link href="/login" className="text-gray-900 font-medium hover:underline">Sign in</Link></p>
          </div>

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
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                required
                className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
                placeholder="you@example.com"
              />
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
                className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

