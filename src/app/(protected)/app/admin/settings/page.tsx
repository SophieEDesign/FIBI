'use client'

import dynamic from 'next/dynamic'

const AdminSettingsClient = dynamic(() => import('@/components/admin/AdminSettingsClient'), {
  ssr: false,
})

export default function AdminSettingsPage() {
  return <AdminSettingsClient />
}
