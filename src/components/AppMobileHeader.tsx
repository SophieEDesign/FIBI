'use client'

import Link from 'next/link'

/** Shared mobile header. Places, Map, Trips and Profile live in the tab bar. */
export default function AppMobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-20 border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] backdrop-blur-[18px] backdrop-saturate-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <Link href="/app" className="flex items-center gap-2 w-fit">
          <img src="/FIBI Logo.png" alt="FIBI" className="h-7 w-auto" />
          <span className="text-lg font-semibold text-charcoal tracking-tight">FIBI</span>
        </Link>
      </div>
    </header>
  )
}
