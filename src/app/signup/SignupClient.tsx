'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

export default function SignupClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReady, setTurnstileReady] = useState(false)
  const turnstileWidgetIdRef = useRef<string | null>(null)
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const siteKey = typeof process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === 'string'
    ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    : ''

  // Safely create Supabase client (for session check only)
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

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null)
    const tw = typeof window !== 'undefined' ? (window as unknown as { turnstile?: { reset?: (id?: string) => void } }).turnstile : undefined
    if (tw?.reset && turnstileWidgetIdRef.current) {
      tw.reset(turnstileWidgetIdRef.current)
    }
  }, [])

  // Load Turnstile script
  useEffect(() => {
    if (!siteKey || typeof document === 'undefined') {
      setTurnstileReady(true)
      return
    }
    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT_URL}"]`)
    if (existing) {
      setTurnstileReady(true)
      return
    }
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => setTurnstileReady(true)
    document.head.appendChild(script)
  }, [siteKey])

  // Explicit render Turnstile when script is ready and container is mounted
  useEffect(() => {
    if (!siteKey || !turnstileReady || typeof window === 'undefined') return
    const container = turnstileContainerRef.current
    if (!container) return
    const tw = (window as unknown as { turnstile?: { ready: (cb: () => void) => void; render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string; remove?: (id: string) => void } }).turnstile
    if (!tw) return
    let cancelled = false
    tw.ready(() => {
      if (cancelled || !container.isConnected) return
      if (turnstileWidgetIdRef.current) return
      const widgetId = tw.render(container, {
        sitekey: siteKey,
        callback: (token: string) => setTurnstileToken(token),
      })
      turnstileWidgetIdRef.current = widgetId
    })
    return () => {
      cancelled = true
      const id = turnstileWidgetIdRef.current
      if (id && tw.remove) {
        tw.remove(id)
        turnstileWidgetIdRef.current = null
      }
    }
  }, [siteKey, turnstileReady])

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
    
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.')
        setLoading(false)
        return
      }

      if (siteKey && !turnstileToken) {
        setError('Please complete the verification challenge below.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          captchaToken: turnstileToken || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))
      const message = typeof data.error === 'string' ? data.error : data.message

      if (!res.ok) {
        if (res.status === 429) {
          setError(message || 'Too many signup attempts. Please try again in an hour.')
        } else if (res.status === 409) {
          setError(message || 'An account with this email already exists. Please sign in instead.')
          setTimeout(() => router.push('/login'), 2000)
        } else {
          setError(message || 'Failed to sign up. Please try again.')
        }
        resetTurnstile()
        setLoading(false)
        return
      }

      setSuccessMessage(message || 'Account created! Please check your email to confirm your account, then you can sign in.')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      resetTurnstile()
      setLoading(false)
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || err.error?.message || 'An error occurred. Please try again.')
      resetTurnstile()
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
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 pr-11 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 pr-11 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {siteKey && (
              <div className="flex justify-center">
                {turnstileReady ? (
                  <div ref={turnstileContainerRef} />
                ) : (
                  <p className="text-sm text-gray-500">Loading verification...</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
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

