'use client'

import BottomNavigation from '@/components/BottomNavigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Pages are public - auth is checked at action level (save/share)
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <BottomNavigation />
    </>
  )
}

