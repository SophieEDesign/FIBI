'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'

const AdminPersonClient = dynamic(() => import('@/components/admin/AdminPersonClient'), {
  ssr: false,
})

export default function AdminPersonPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  if (!id) return null
  return <AdminPersonClient userId={id} />
}
