'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'
import InstallOnPhone from '@/components/InstallOnPhone'

interface UserStats {
  totalPlaces: number
  plannedPlaces: number
  uniqueCountries: number
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState<UserStats>({
    totalPlaces: 0,
    plannedPlaces: 0,
    uniqueCountries: 0,
  })
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [email, setEmail] = useState('')
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [updatingEmail, setUpdatingEmail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Auth redirect is handled by (protected) layout

  const loadProfileData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setErrorMessage(null)

      // Optimize stats queries using COUNT instead of fetching all data
      const [totalResult, plannedResult, countriesResult] = await Promise.all([
        // Total places count
        supabase
          .from('saved_items')
          .select('id', { count: 'exact', head: true }),
        // Planned places count
        supabase
          .from('saved_items')
          .select('id', { count: 'exact', head: true })
          .not('planned_date', 'is', null),
        // Unique countries (need to fetch distinct values)
        supabase
          .from('saved_items')
          .select('location_country')
          .not('location_country', 'is', null),
      ])

      if (totalResult.error) {
        console.error('Error loading total places:', totalResult.error)
        setErrorMessage('Failed to load stats. Please refresh the page.')
      } else {
        const totalPlaces = totalResult.count || 0
        const plannedPlaces = plannedResult.count || 0
        const uniqueCountries = new Set(
          countriesResult.data?.map(item => item.location_country).filter(Boolean) || []
        ).size

        setStats({
          totalPlaces,
          plannedPlaces,
          uniqueCountries,
        })
      }

      // Load profile (display name from profiles.full_name)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle()
      setDisplayName(profile?.full_name ?? '')
      setIsAdmin(profile?.role === 'admin')

      setLoading(false)
    } catch (error) {
      console.error('Error loading profile data:', error)
      setErrorMessage('Failed to load profile data. Please refresh the page.')
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (user) {
      setEmail(user.email || '')
      loadProfileData()
    }
  }, [user, loadProfileData])

  const handleUpdateEmail = async () => {
    if (!user || !email.trim()) {
      setErrorMessage('Please enter a valid email address.')
      return
    }

    if (email === user.email) {
      setIsEditingEmail(false)
      return
    }

    setUpdatingEmail(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() })

      if (error) {
        console.error('Error updating email:', error)
        setErrorMessage(error.message || 'Failed to update email. Please try again.')
        setUpdatingEmail(false)
        return
      }

      setSuccessMessage('Email update requested. Please check your new email for a confirmation link.')
      setIsEditingEmail(false)
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error) {
      console.error('Error updating email:', error)
      setErrorMessage('Failed to update email. Please try again.')
    } finally {
      setUpdatingEmail(false)
    }
  }

  const handleCancelEmailEdit = () => {
    setEmail(user?.email || '')
    setIsEditingEmail(false)
    setErrorMessage(null)
  }

  const handleSaveDisplayName = async () => {
    if (!user) return
    setSavingName(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: displayName.trim() || null })
        .eq('id', user.id)
      if (error) {
        console.error('Error saving display name:', error)
        setErrorMessage(error.message || 'Failed to save name. Please try again.')
        return
      }
      setSuccessMessage('Name saved.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error saving display name:', err)
      setErrorMessage('Failed to save name. Please try again.')
    } finally {
      setSavingName(false)
    }
  }

  const getInitials = (emailOrName: string) => {
    if (!emailOrName) return '?'
    const name = emailOrName.includes('@') ? emailOrName.split('@')[0] : emailOrName.trim()
    if (!name) return '?'
    if (name.length >= 2) return name.substring(0, 2).toUpperCase()
    return name.charAt(0).toUpperCase()
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div>Loading your profile…</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Your personal travel space</p>
        </header>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-700 hover:text-red-900 ml-4"
              aria-label="Dismiss error message"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-700 hover:text-green-900 ml-4"
              aria-label="Dismiss success message"
            >
              ✕
            </button>
          </div>
        )}

        {/* Identity Section */}
        <section className="bg-white rounded-xl p-4 md:p-6 mb-4 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Identity</h2>
          
          <div className="flex items-center gap-3 md:gap-4 mb-4">
            {/* Avatar */}
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-accent text-white flex items-center justify-center text-base md:text-xl font-semibold flex-shrink-0">
              {getInitials(displayName || email || user.email || '')}
            </div>
            
            <div className="flex-1">
              <div className="text-sm text-gray-500 mb-1">Email</div>
              {isEditingEmail ? (
                <div className="space-y-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={updatingEmail}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="your@email.com"
                    aria-label="Email address"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateEmail}
                      disabled={updatingEmail || !email.trim() || email === user.email}
                      className="px-4 py-1.5 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Save email"
                    >
                      {updatingEmail ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEmailEdit}
                      disabled={updatingEmail}
                      className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Cancel email edit"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-base text-gray-900">{user.email}</div>
                  <button
                    onClick={() => setIsEditingEmail(true)}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                    aria-label="Edit email"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Display Name (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                disabled={savingName}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Display name"
              />
              <button
                onClick={handleSaveDisplayName}
                disabled={savingName}
                className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Save display name"
              >
                {savingName ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Used when you share trips or comment</p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href="/app/settings/email"
              className="text-sm text-gray-700 hover:text-gray-900 underline"
            >
              Email preferences
            </Link>
            <p className="text-xs text-gray-500 mt-1">Product updates and tips</p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-white rounded-xl p-4 md:p-6 mb-4 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Stats</h2>
          
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalPlaces}</div>
              <div className="text-xs text-gray-500 mt-0.5">Saved Places</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.plannedPlaces}</div>
              <div className="text-xs text-gray-500 mt-0.5">Planned</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.uniqueCountries}</div>
              <div className="text-xs text-gray-500 mt-0.5">Countries</div>
            </div>
          </div>
        </section>

        {/* More */}
        <section className="bg-white rounded-xl p-4 md:p-6 mb-4 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3">More</h2>
          <div className="space-y-2 md:space-y-3">
            <Link
              href="/app/how-to"
              className="block w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">How to save from TikTok and Instagram</div>
              <div className="text-xs text-gray-500 mt-0.5">Share on Android. Copy and paste on iPhone.</div>
            </Link>
            <InstallOnPhone />
            <a
              href="mailto:hello@fibi.world"
              className="block w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">Send feedback</div>
              <div className="text-xs text-gray-500 mt-0.5">Tell us what would help</div>
            </a>
            <Link
              href="/app/guides"
              className="block w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">Travel guides</div>
              <div className="text-xs text-gray-500 mt-0.5">Places worth keeping</div>
            </Link>
            {isAdmin && (
              <Link
                href="/app/admin"
                className="block w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Admin</div>
              </Link>
            )}
            <a
              href="/api/auth/signout"
              className="block w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">Sign out</div>
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}

