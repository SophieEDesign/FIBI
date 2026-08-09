'use client'

import dynamic from 'next/dynamic'

const EmailLogClient = dynamic(() => import('@/components/EmailLogClient'), { ssr: false })

export default function AdminEmailsLogPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <EmailLogClient />
      </div>
    </div>
  )
}
