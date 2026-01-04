'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface DesktopNavigationProps {
  user: any
  onSignOut?: () => void
}

export default function DesktopNavigation({ user, onSignOut }: DesktopNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    if (onSignOut) {
      onSignOut()
    } else {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    }
  }

  const isActive = (path: string) => {
    if (path === '/app' || path === '/') {
      return pathname === '/app' || pathname === '/'
    }
    return pathname?.startsWith(path)
  }

  // Don't show on login page
  if (!user) return null

  return (
    <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link href="/app" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-gray-900">FiBi</span>
          </Link>

          {/* Main Navigation */}
          <div className="flex items-center space-x-1">
            <Link
              href="/app"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/app') || isActive('/')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Home
            </Link>
            <Link
              href="/app/map"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/app/map')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Map
            </Link>
            <Link
              href="/app/calendar"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/app/calendar')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Planner
            </Link>
            <Link
              href="/profile"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/profile')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Profile
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Link
              href="/app/add"
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Add Place
            </Link>
            <button
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

