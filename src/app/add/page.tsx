import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuickSaveForm from '@/components/QuickSaveForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Save a place',
  robots: { index: false, follow: false },
}

export default function AddPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-fibi-muted">
          Loading…
        </div>
      }
    >
      <QuickSaveForm />
    </Suspense>
  )
}
