import type { Metadata } from 'next'
import LoginClient from './LoginClient'

// Force dynamic rendering - this prevents static generation
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <LoginClient />
}

