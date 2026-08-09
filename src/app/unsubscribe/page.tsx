import { Suspense } from 'react'
import UnsubscribeClient from '@/components/UnsubscribeClient'

export const dynamic = 'force-dynamic'

/**
 * Unsubscribe landing. With ?token=… one-click confirm; without token, point to prefs / email link.
 */
export default function UnsubscribePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f3f4f6]">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-gray-500">
            Loading…
          </div>
        }
      >
        <UnsubscribeClient />
      </Suspense>
    </div>
  )
}
