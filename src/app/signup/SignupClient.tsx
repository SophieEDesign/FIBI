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

