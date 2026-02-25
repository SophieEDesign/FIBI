import type { Metadata } from 'next'
import SignupClient from './SignupClient'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  return <SignupClient />
}

