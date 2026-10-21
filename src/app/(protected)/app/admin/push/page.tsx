'use client'

import dynamic from 'next/dynamic'

const AdminPushClient = dynamic(() => import('@/components/AdminPushClient'), {
  ssr: false,
})

export default function AdminPushPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <AdminPushClient />
    </div>
  )
}
