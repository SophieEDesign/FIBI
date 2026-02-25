'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'

const EmailTemplatesClient = dynamic(() => import('@/components/EmailTemplatesClient'), { ssr: false })

export default function AdminEmailsTemplatesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [adminChecked, setAdminChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (authLoading || !user?.id) {
      if (!authLoading && !user) {
        router.replace('/login?redirect=/app/admin/emails/templates')
      }
      return
    }
    let cancelled = false
    const client = createClient()
    Promise.resolve(
      client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    )
      .then(({ data, error }) => {
        if (cancelled) return
        setAdminChecked(true)
        setIsAdmin(!error && data?.role === 'admin')
      })
      .catch(() => {
        if (!cancelled) {
          setAdminChecked(true)
          setIsAdmin(false)
        }
      })
    return () => { cancelled = true }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!adminChecked || isAdmin) return
    router.replace('/app')
  }, [adminChecked, isAdmin, router])

  if (authLoading || !adminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/app/admin"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Admin
          </Link>
          <Link
            href="/app/admin/emails/automations"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Automations
          </Link>
        </div>
        <EmailTemplatesClient />
      </div>
    </div>
  )
}
