'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSiteUrl } from '@/lib/utils'
import Link from 'next/link'
import SocialAuthButtons from '@/components/SocialAuthButtons'

type ViewMode = 'login' | 'forgot-password' | 'magic-link'

export default function LoginClient() {
  const [viewMode, setViewMode] = useState<ViewMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  let supabase: ReturnType<typeof createClient> | null = null
  try {
    supabase = createClient()
  } catch (err: unknown) {
    console.error('Failed to create Supabase client:', err)
    if (typeof window !== 'undefined') {
      const message = err instanceof Error ? err.message : 'Missing Supabase credentials. Please check your environment variables.'
      setError(`Configuration error: ${message}`)
      setCheckingAuth(false)
    }
  }

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    const errorDescription = searchParams.get('error_description')

    if (!checkingAuth) {
      if (errorParam === 'confirmation_failed') {
        setError('Email confirmation failed. Please try signing up again or contact support.')
      } else if (errorParam === 'auth_failed' || errorParam === 'access_denied') {
        setError(errorDescription?.replace(/\+/g, ' ') || "That didn't work. Try again.")
      } else if (errorParam && errorParam !== 'confirmation_failed') {
        setError(errorDescription?.replace(/\+/g, ' ') || "That didn't work. Try again.")
      } else if (messageParam === 'confirmed') {
        setSuccessMessage('Your email has been confirmed. You can log in now.')
      } else if (messageParam === 'password_reset') {
        setSuccessMessage('Your password has been reset. You can log in now.')
      } else if (messageParam === 'signout_preview') {
        setSuccessMessage("If you're on a preview link, sign out may not have cleared your session. Try the live site (fibi.world) to sign out fully.")
      }
    }
  }, [searchParams, checkingAuth])

  useEffect(() => {
    const redirectParam = searchParams.get('redirect')
    if (redirectParam && typeof document !== 'undefined') {
      document.cookie = `redirect_after_login=${encodeURIComponent(redirectParam)}; path=/; max-age=600; samesite=lax`
    }
  }, [searchParams])

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
      } catch (err: unknown) {
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

  const resetToLogin = () => {
    setViewMode('login')
    setError(null)
    setSuccessMessage(null)
    setEmail('')
    setPassword('')
  }

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
          setError(error.message || "That didn't work. Try again.")
          setLoading(false)
          return
        }

        setSuccessMessage('Password reset instructions have been sent to your email. Please check your inbox.')
        setEmail('')
      } else if (viewMode === 'magic-link') {
        if (!email) {
          setError('Please enter your email address.')
          setLoading(false)
          return
        }

        const siteUrl = getSiteUrl()
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
            shouldCreateUser: true,
          },
        })

        if (error) {
          console.error('Magic link error:', error)
          setError(error.message || "That didn't work. Try again.")
          setLoading(false)
          return
        }

        setSuccessMessage('Check your email for a sign-in link.')
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          if (
            error.message.includes('Invalid login credentials') ||
            error.message.includes('Invalid email or password')
          ) {
            setError("That email or password doesn't look right. Try again, or sign up if you're new.")
            setLoading(false)
            return
          }

          if (
            error.message.toLowerCase().includes('user not found') ||
            error.message.toLowerCase().includes('does not exist')
          ) {
            setError('No account found with this email. Please sign up instead.')
            setLoading(false)
            return
          }

          setError(error.message || "That didn't work. Try again.")
          setLoading(false)
          return
        }

        if (!data.session) {
          setError("That didn't work. Try again.")
          setLoading(false)
          return
        }

        const redirectParam = searchParams.get('redirect')
        router.push(redirectParam || '/app')
      }
    } catch (err: unknown) {
      console.error('Login error:', err)
      const errorMessage =
        err instanceof Error
          ? err.message
          : "That didn't work. Try again."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" aria-live="polite" aria-busy="true">
        <div className="text-gray-600" role="status" aria-label="Loading">Loading...</div>
      </div>
    )
  }

  const heading =
    viewMode === 'forgot-password'
      ? 'Reset password'
      : viewMode === 'magic-link'
        ? 'Email me a link'
        : 'Welcome back'

  const subheading =
    viewMode === 'forgot-password'
      ? "Enter your email and we'll send you a link to reset your password."
      : viewMode === 'magic-link'
        ? "We'll send a one-time link to your inbox. No password needed."
        : null

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
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{heading}</h2>
            {subheading ? (
              <p className="text-sm text-gray-600">{subheading}</p>
            ) : (
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-gray-900 font-medium hover:underline">
                  Sign up
                </Link>
              </p>
            )}
          </div>

          {viewMode === 'login' && (
            <>
              <SocialAuthButtons
                disabled={loading}
                onError={(message) => {
                  setSuccessMessage(null)
                  setError(message || null)
                }}
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-3 text-gray-500">or</span>
                </div>
              </div>
            </>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            aria-busy={loading}
            aria-describedby={error ? 'login-error' : successMessage ? 'login-success' : undefined}
          >
            {successMessage && (
              <div
                id="login-success"
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm"
                role="status"
                aria-live="polite"
              >
                {successMessage}
              </div>
            )}
            {error && (
              <div
                id="login-error"
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                role="alert"
                aria-live="assertive"
              >
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
                    setError(null)
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {viewMode === 'login' && (
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
                    autoComplete="current-password"
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
              </div>
            )}

            {viewMode === 'login' && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('magic-link')
                    setError(null)
                    setSuccessMessage(null)
                    setPassword('')
                  }}
                  className="text-gray-600 hover:text-gray-900 underline"
                >
                  Email me a link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('forgot-password')
                    setError(null)
                    setSuccessMessage(null)
                    setPassword('')
                    setEmail('')
                  }}
                  className="text-gray-600 hover:text-gray-900 underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              {loading
                ? 'Loading...'
                : viewMode === 'forgot-password'
                  ? 'Send reset link'
                  : viewMode === 'magic-link'
                    ? 'Send sign-in link'
                    : 'Log in'}
            </button>

            {viewMode !== 'login' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={resetToLogin}
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
