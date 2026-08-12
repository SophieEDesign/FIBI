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

  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center flex-1 h-full transition-colors duration-fast ease-standard ${
      active ? 'text-accent' : 'text-[color:var(--text-tertiary)]'
    }`

  const placesActive = isActive('/app') || isActive('/')
  const guidesActive = isActive('/app/guides') || isActive('/travel-guides')
  const saveActive = isActive('/app/add')
  const moreActive =
    isActive('/profile') ||
    isActive('/app/calendar') ||
    isActive('/app/map') ||
    Boolean(isAdmin && isActive('/app/admin'))

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

          <Link
            href="/app/guides"
            className={itemClass(guidesActive)}
            aria-label="Guides"
            aria-current={guidesActive ? 'page' : undefined}
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
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-xs font-medium">Guides</span>
          </Link>

          <Link
            href="/app/add"
            className="flex flex-col items-center justify-center -mt-4"
            aria-label="Save"
            aria-current={saveActive ? 'page' : undefined}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full shadow-soft transition-colors duration-fast ${
                saveActive ? 'bg-accent-hover text-white' : 'bg-accent text-white'
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 4v16m8-8H4" />
              </svg>
            </span>
            <span
              className={`text-xs font-medium mt-1 ${saveActive ? 'text-accent' : 'text-[color:var(--text-tertiary)]'}`}
            >
              Save
            </span>
          </Link>

          <Link
            href="/profile"
            className={itemClass(moreActive)}
            aria-label="More"
            aria-current={moreActive ? 'page' : undefined}
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
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs font-medium">More</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
