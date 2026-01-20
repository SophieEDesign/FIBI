'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordClient() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  
  // Safely create Supabase client
  let supabase: ReturnType<typeof createClient> | null = null
  try {
    supabase = createClient()
  } catch (err: any) {
    console.error('Failed to create Supabase client:', err)
  }

  // Check if user has a valid session (required for password reset)
  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setError('Configuration error: Supabase client not available')
        return
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          setError('Invalid or expired reset link. Please request a new password reset.')
        }
      } catch (err: any) {
        console.error('Error checking session:', err)
        setError('Unable to verify reset link. Please try again.')
      }
    }

    if (supabase) {
      checkSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!supabase) {
      setError('Configuration error: Supabase client not available')
      return
    }
    
    // Validate passwords
    if (!password || !confirmPassword) {
      setError('Please enter both password fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    
    setLoading(true)
    setError(null)

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password,
      })
      
      if (error) {
        console.error('Password update error:', error)
        setError(error.message || 'Failed to update password. Please try again.')
        setLoading(false)
        return
      }
      
      // Success - show success message and redirect
      setSuccess(true)
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login?message=password_reset')
      }, 2000)
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(err.message || 'An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img
              src="/FIBI Logo.png"
              alt="FiBi"
              className="h-12 w-auto mx-auto mb-4"
            />
            <div className="bg-white rounded-2xl shadow-sm p-8 space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                Password updated successfully! Redirecting to login...
              </div>
            </div>
          </div>
        </div>
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
          <p className="text-gray-600">Set your new password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-sm text-gray-600">Enter your new password below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError(null)
                }}
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
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Back to login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

