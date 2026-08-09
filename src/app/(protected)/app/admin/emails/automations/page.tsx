'use client'

import dynamic from 'next/dynamic'

const EmailAutomationsClient = dynamic(() => import('@/components/EmailAutomationsClient'), {
  ssr: false,
})

export default function AdminEmailsAutomationsPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <EmailAutomationsClient />
      </div>
    </div>
  )
}
