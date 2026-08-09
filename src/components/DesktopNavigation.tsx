'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface DesktopNavigationProps {
  user: any
  isAdmin?: boolean
  onSignOut?: () => void
}

export default function DesktopNavigation({ user, isAdmin }: DesktopNavigationProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/app' || path === '/') {
      return pathname === '/app' || pathname === '/'
    }
    return pathname?.startsWith(path)
  }

  if (!user) return null

  const navClass = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-medium transition-colors duration-fast ease-standard ${
      active
        ? 'bg-accent text-white'
        : 'text-secondary hover:bg-[color:var(--bg-inset)] hover:text-[color:var(--text-primary)]'
    }`

  return (
    <nav className="hidden md:block sticky top-0 z-30 border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] backdrop-blur-[18px] backdrop-saturate-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-3">
            <Link href="/app" className="flex items-center">
              <img
                src="/FIBI Logo.png"
                alt="FIBI"
                className="h-7 w-auto"
              />
            </Link>
            <span className="text-[10px] font-medium text-secondary border border-[color:var(--border-subtle)] rounded-full px-2 py-0.5 bg-[color:var(--bg-subtle)]">
              Early Access
            </span>
            <a
              href="mailto:feedback@fibi.app?subject=FIBI%20Feedback"
              className="text-xs text-secondary hover:text-[color:var(--text-primary)] transition-colors duration-fast hidden sm:inline"
            >
              Send feedback
            </a>
          </div>

          <div className="flex items-center space-x-1">
            <Link
              href="/app"
              className={navClass(isActive('/app') || isActive('/'))}
            >
              Places
            </Link>
            <Link
              href="/app/calendar"
              className={navClass(isActive('/app/calendar'))}
            >
              Trips
            </Link>
            <Link
              href="/app/map"
              className={navClass(isActive('/app/map'))}
            >
              Map
            </Link>
            <Link
              href="/profile"
              className={navClass(isActive('/profile'))}
            >
              Profile
            </Link>
            {isAdmin && (
              <Link
                href="/app/admin"
                className={navClass(isActive('/app/admin'))}
              >
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <Button href="/app/add" size="sm">
              Add place
            </Button>
            <a
              href="/api/auth/signout"
              className="text-secondary hover:text-[color:var(--text-primary)] text-sm font-medium transition-colors duration-fast"
            >
              Sign out
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
