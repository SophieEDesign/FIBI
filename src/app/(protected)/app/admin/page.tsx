'use client'

import dynamic from 'next/dynamic'

const AdminTodayClient = dynamic(() => import('@/components/admin/AdminTodayClient'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center text-[#8A857A]">Loading…</div>
  ),
})

export default function AdminPage() {
  return <AdminTodayClient />
}
