'use client'

import BottomNavigation from '@/components/BottomNavigation'
import DesktopNavigation from '@/components/DesktopNavigation'
import { useAuth } from '@/lib/useAuth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Pages are public - auth is checked at action level (save/share)
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()

  return (
    <>
      {!loading && <DesktopNavigation user={user} />}
      {children}
      <BottomNavigation />
    </>
  )
}

