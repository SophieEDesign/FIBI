'use client'

import dynamic from 'next/dynamic'

const EmailCampaignsClient = dynamic(() => import('@/components/EmailCampaignsClient'), {
  ssr: false,
})
const EmailSegmentsClient = dynamic(() => import('@/components/EmailSegmentsClient'), {
  ssr: false,
})

export default function AdminEmailsCampaignsPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <EmailCampaignsClient />
        <div className="border-t border-[#E5E5E5] pt-10">
          <EmailSegmentsClient />
        </div>
      </div>
    </div>
  )
}
