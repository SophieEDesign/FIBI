'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface DesktopNavigationProps {
  user: any
  isAdmin?: boolean
  onSignOut?: () => void
}

export default function DesktopNavigation({ user, isAdmin, onSignOut }: DesktopNavigationProps) {
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

  // Don't show if no user
  if (!user) return null

  return (
    <nav className="hidden md:block bg-white sticky top-0 z-30 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between h-12">
          {/* Logo + Early Access */}
          <div className="flex items-center gap-3">
            <Link href="/app" className="flex items-center">
              <img
                src="/FIBI Logo.png"
                alt="FiBi"
                className="h-7 w-auto"
              />
            </Link>
            <span className="text-[10px] font-medium text-secondary border border-gray-200 rounded-full px-2 py-0.5 bg-gray-50/80">
              Early Access
            </span>
            <a
              href="mailto:feedback@fibi.app?subject=FIBI%20Feedback"
              className="text-xs text-secondary hover:text-charcoal transition-colors hidden sm:inline"
            >
              Send feedback
            </a>
          </div>

          {/* Main Navigation: Places, Trips, Profile */}
          <div className="flex items-center space-x-1">
            <Link
              href="/app"
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive('/app') || isActive('/')
                  ? 'bg-charcoal text-white'
                  : 'text-secondary hover:bg-gray-100 hover:text-charcoal'
              }`}
            >
              Places
            </Link>
            <Link
              href="/app/calendar"
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive('/app/calendar')
                  ? 'bg-charcoal text-white'
                  : 'text-secondary hover:bg-gray-100 hover:text-charcoal'
              }`}
            >
              Trips
            </Link>
            <Link
              href="/profile"
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive('/profile')
                  ? 'bg-charcoal text-white'
                  : 'text-secondary hover:bg-gray-100 hover:text-charcoal'
              }`}
            >
              Profile
            </Link>
            {isAdmin && (
              <Link
                href="/app/admin"
                className="px-4 py-2 rounded-xl text-sm font-medium text-secondary hover:bg-gray-100 hover:text-charcoal transition-colors"
              >
                Admin
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Link
              href="/app/add"
              className="bg-charcoal text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 shadow-soft transition-opacity"
            >
              Add place
            </Link>
            <button
              onClick={handleSignOut}
              className="text-secondary hover:text-charcoal text-sm font-medium transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

