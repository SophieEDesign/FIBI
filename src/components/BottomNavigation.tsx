'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNavigation() {
  const pathname = usePathname()

  const placesActive = pathname === '/app' || pathname === '/'
  const mapActive = pathname?.startsWith('/app/map') ?? false
  const tripsActive = pathname?.startsWith('/app/calendar') ?? false
  const profileActive = pathname === '/profile' || (pathname?.startsWith('/profile/') ?? false)

  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center flex-1 h-full transition-colors duration-fast ease-standard ${
      active ? 'text-accent' : 'text-[color:var(--text-tertiary)]'
    }`

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] backdrop-blur-[18px] backdrop-saturate-150 shadow-soft">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-end justify-around h-16 pb-1">
          <Link
            href="/app"
            className={itemClass(placesActive)}
            aria-label="Places"
            aria-current={placesActive ? 'page' : undefined}
          >
            <svg className="w-6 h-6 mb-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Places</span>
          </Link>

          <Link
            href="/app/map"
            className={itemClass(mapActive)}
            aria-label="Map"
            aria-current={mapActive ? 'page' : undefined}
          >
            <svg className="w-6 h-6 mb-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-xs font-medium">Map</span>
          </Link>

          <Link
            href="/app/calendar"
            className={itemClass(tripsActive)}
            aria-label="Trips"
            aria-current={tripsActive ? 'page' : undefined}
          >
            <svg className="w-6 h-6 mb-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Trips</span>
          </Link>

          <Link
            href="/profile"
            className={itemClass(profileActive)}
            aria-label="Profile"
            aria-current={profileActive ? 'page' : undefined}
          >
            <svg className="w-6 h-6 mb-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
