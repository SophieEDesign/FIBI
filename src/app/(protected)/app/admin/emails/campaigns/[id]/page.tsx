'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'
import EmailAdminNav from '@/components/admin/EmailAdminNav'

const EmailCampaignDetailClient = dynamic(
  () => import('@/components/EmailCampaignDetailClient'),
  { ssr: false }
)

export default function AdminEmailCampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = typeof params?.id === 'string' ? params.id : ''
  const { user, loading: authLoading } = useAuth()
  const [adminChecked, setAdminChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (authLoading || !user?.id) {
      if (!authLoading && !user) {
        router.replace(`/login?redirect=/app/admin/emails/campaigns/${campaignId}`)
      }
      return
    }
    let cancelled = false
    const client = createClient()
    Promise.resolve(client.from('profiles').select('role').eq('id', user.id).single())
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
    return () => {
      cancelled = true
    }
  }, [authLoading, user, router, campaignId])

  useEffect(() => {
    if (!adminChecked || isAdmin) return
    router.replace('/app')
  }, [adminChecked, isAdmin, router])

  if (authLoading || !adminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
    )
  }

  if (!isAdmin || !campaignId) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <EmailAdminNav current="/app/admin/emails/campaigns" />
        <EmailCampaignDetailClient campaignId={campaignId} />
      </div>
    </div>
  )
}
