'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'

const EmailCampaignDetailClient = dynamic(
  () => import('@/components/EmailCampaignDetailClient'),
  { ssr: false }
)

export default function AdminEmailCampaignDetailPage() {
  const params = useParams()
  const campaignId = typeof params?.id === 'string' ? params.id : ''

  if (!campaignId) return null

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <EmailCampaignDetailClient campaignId={campaignId} />
      </div>
    </div>
  )
}
