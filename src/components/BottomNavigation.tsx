'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BottomNavigationProps {
  isAdmin?: boolean
}

export default function BottomNavigation({ isAdmin }: BottomNavigationProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/app' || path === '/') {
      return pathname === '/app' || pathname === '/'
    }
    return pathname?.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white z-40 md:hidden shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          {/* Places */}
          <Link
            href="/app"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/app') || isActive('/')
                ? 'text-[#1f2937]'
                : 'text-[#6b7280]'
            }`}
            aria-label="Places"
            aria-current={isActive('/app') || isActive('/') ? 'page' : undefined}
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Places</span>
          </Link>

          {/* Trips */}
          <Link
            href="/app/calendar"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/app/calendar')
                ? 'text-[#1f2937]'
                : 'text-[#6b7280]'
            }`}
            aria-label="Trips"
            aria-current={isActive('/app/calendar') ? 'page' : undefined}
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Trips</span>
          </Link>

          {/* Map */}
          <Link
            href="/app/map"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/app/map')
                ? 'text-[#1f2937]'
                : 'text-[#6b7280]'
            }`}
            aria-label="Map"
            aria-current={isActive('/app/map') ? 'page' : undefined}
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-xs font-medium">Map</span>
          </Link>

          {/* Admin - only when user is admin */}
          {isAdmin && (
            <Link
              href="/app/admin"
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive('/app/admin')
                  ? 'text-[#1f2937]'
                  : 'text-[#6b7280]'
              }`}
              aria-label="Admin"
              aria-current={isActive('/app/admin') ? 'page' : undefined}
            >
              <svg
                className="w-6 h-6 mb-1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs font-medium">Admin</span>
            </Link>
          )}

          {/* Profile */}
          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/profile')
                ? 'text-[#1f2937]'
                : 'text-[#6b7280]'
            }`}
            aria-label="Profile"
            aria-current={isActive('/profile') ? 'page' : undefined}
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}

