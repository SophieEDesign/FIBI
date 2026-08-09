'use client'

import dynamic from 'next/dynamic'

const AdminSignupAttemptsClient = dynamic(
  () => import('@/components/admin/AdminSignupAttemptsClient'),
  { ssr: false }
)

export default function AdminSignupAttemptsPage() {
  return <AdminSignupAttemptsClient />
}
