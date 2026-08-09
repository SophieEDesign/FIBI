'use client'

import dynamic from 'next/dynamic'

const EmailTemplatesClient = dynamic(() => import('@/components/EmailTemplatesClient'), {
  ssr: false,
})

export default function AdminEmailsTemplatesPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <EmailTemplatesClient />
      </div>
    </div>
  )
}
