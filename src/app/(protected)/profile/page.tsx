'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'

interface UserStats {
  totalPlaces: number
  plannedPlaces: number
  uniqueCountries: number
}

interface UserPreferences {
  defaultView: 'grid' | 'map' | 'calendar'
  defaultHomeFilter: 'all' | 'planned' | 'unplanned'
  units: 'km' | 'miles'
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [stats, setStats] = useState<UserStats>({
    totalPlaces: 0,
    plannedPlaces: 0,
    uniqueCountries: 0,
  })
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultView: 'grid',
    defaultHomeFilter: 'all',
    units: 'km',
  })
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      loadProfileData()
    }
  }, [user])

  const loadProfileData = async () => {
    if (!user) return

    try {
      // Load stats
      const { data: allItems, error: itemsError } = await supabase
        .from('saved_items')
        .select('id, planned_date, location_country')

      if (itemsError) {
        console.error('Error loading stats:', itemsError)
      } else {
        const totalPlaces = allItems?.length || 0
        const plannedPlaces = allItems?.filter(item => item.planned_date !== null).length || 0
        const uniqueCountries = new Set(
          allItems?.filter(item => item.location_country).map(item => item.location_country)
        ).size

        setStats({
          totalPlaces,
          plannedPlaces,
          uniqueCountries,
        })
      }

      // Load preferences (from user_custom_options or defaults)
      // For now, we'll use defaults. In the future, we can store these in user_custom_options
      // or create a separate user_preferences table

      // Load display name (if stored in user metadata or custom options)
      // For now, we'll use email as display name

      setLoading(false)
    } catch (error) {
      console.error('Error loading profile data:', error)
      setLoading(false)
    }
  }

  const handleClearTestData = async () => {
    if (!user) return

    setClearing(true)
    try {
      // Delete all items for this user
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('Error clearing test data:', error)
        alert('Failed to clear test data. Please try again.')
      } else {
        // Reload stats
        await loadProfileData()
        setShowClearConfirm(false)
        alert('Test data cleared successfully.')
      }
    } catch (error) {
      console.error('Error clearing test data:', error)
      alert('Failed to clear test data. Please try again.')
    } finally {
      setClearing(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const getInitials = (email: string) => {
    if (!email) return '?'
    const parts = email.split('@')[0]
    if (parts.length >= 2) {
      return parts.substring(0, 2).toUpperCase()
    }
    return parts.charAt(0).toUpperCase()
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
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My FiBi</h1>
          <p className="text-sm text-gray-500 mt-1">Your personal travel space</p>
        </header>

        {/* Identity Section */}
        <section className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Identity</h2>
          
          <div className="flex items-center gap-4 mb-6">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl font-semibold">
              {getInitials(user.email || '')}
            </div>
            
            <div className="flex-1">
              <div className="text-sm text-gray-500 mb-1">Email</div>
              <div className="text-base text-gray-900">{user.email}</div>
            </div>
          </div>

          {/* Display Name (optional, for future) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name (optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">This is just for you</p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stats</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalPlaces}</div>
              <div className="text-xs text-gray-500 mt-1">Saved Places</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.plannedPlaces}</div>
              <div className="text-xs text-gray-500 mt-1">Planned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.uniqueCountries}</div>
              <div className="text-xs text-gray-500 mt-1">Countries</div>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h2>
          
          <div className="space-y-6">
            {/* Default View */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default View
              </label>
              <div className="flex gap-2">
                {(['grid', 'map', 'calendar'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setPreferences({ ...preferences, defaultView: view })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.defaultView === view
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Home Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Home Filter
              </label>
              <div className="flex gap-2">
                {(['all', 'planned', 'unplanned'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPreferences({ ...preferences, defaultHomeFilter: filter })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.defaultHomeFilter === filter
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Units */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance Units
              </label>
              <div className="flex gap-2">
                {(['km', 'miles'] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setPreferences({ ...preferences, units: unit })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.units === unit
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {unit === 'km' ? 'Kilometers' : 'Miles'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Actions Section */}
        <section className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          
          <div className="space-y-3">
            {/* Export */}
            <button
              onClick={() => {
                // Stub for now
                alert('Export feature coming soon!')
              }}
              className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">Export Saved Places</div>
              <div className="text-xs text-gray-500 mt-0.5">Download your data (coming soon)</div>
            </button>

            {/* Clear Test Data */}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full text-left px-4 py-3 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
            >
              <div className="font-medium">Clear Test Data</div>
              <div className="text-xs text-red-500 mt-0.5">Delete all your saved places</div>
            </button>

            {/* Log Out */}
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">Log Out</div>
              <div className="text-xs text-gray-500 mt-0.5">Sign out of your account</div>
            </button>
          </div>
        </section>
      </div>

      {/* Clear Test Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Clear Test Data?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete all your saved places. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={clearing}
              >
                Cancel
              </button>
              <button
                onClick={handleClearTestData}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={clearing}
              >
                {clearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

