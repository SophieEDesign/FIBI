'use client'

import Link from 'next/link'
import MobileMenu from '@/components/MobileMenu'

interface AppMobileHeaderProps {
  isAdmin?: boolean
}

/** Shared mobile header — profile, trips and map live in the overflow menu. */
export default function AppMobileHeader({ isAdmin }: AppMobileHeaderProps) {
  return (
    <header className="md:hidden sticky top-0 z-20 border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] backdrop-blur-[18px] backdrop-saturate-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between relative">
          <Link href="/app" className="flex items-center gap-2">
            <img src="/FIBI Logo.png" alt="FIBI" className="h-7 w-auto" />
            <span className="text-lg font-semibold text-charcoal tracking-tight">FIBI</span>
          </Link>
          <MobileMenu isAuthenticated isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  )
}
