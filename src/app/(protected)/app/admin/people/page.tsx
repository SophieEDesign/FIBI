'use client'

import dynamic from 'next/dynamic'

const AdminPeopleClient = dynamic(() => import('@/components/admin/AdminPeopleClient'), {
  ssr: false,
})

export default function AdminPeoplePage() {
  return <AdminPeopleClient />
}
