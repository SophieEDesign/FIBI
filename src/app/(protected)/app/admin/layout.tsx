'use client'

import AdminSidebar from '@/components/admin/AdminSidebar'
import { useRequireAdmin } from '@/lib/useRequireAdmin'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useRequireAdmin('/app/admin')

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[#8A857A]">
        Loading…
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-[#F5F2EC]">
      <AdminSidebar adminEmail={user?.email ?? null} />
      <main className="min-w-0 flex-1 overflow-x-auto">{children}</main>
    </div>
  )
}
