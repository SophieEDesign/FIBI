import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

function getSiteUrl(): string {
  if (typeof process !== 'undefined') {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
  }
  return 'https://fibi.world'
}

export const metadata: Metadata = {
  title: 'FIBI oEmbed Test Page - Meta App Review',
  description: 'Test page demonstrating FIBI\'s Instagram oEmbed integration for Meta App Review verification',
  openGraph: {
    title: 'FIBI oEmbed Test Page - Meta App Review',
    description: 'Test page demonstrating FIBI\'s Instagram oEmbed integration for Meta App Review verification',
    type: 'website',
    url: `${getSiteUrl()}/oembed-test`,
    images: [
      {
        url: `${getSiteUrl()}/hero-image.png`,
        width: 1200,
        height: 630,
        alt: 'FIBI oEmbed Test Page',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FIBI oEmbed Test Page - Meta App Review',
    description: 'Test page demonstrating FIBI\'s Instagram oEmbed integration for Meta App Review verification',
    images: [`${getSiteUrl()}/hero-image.png`],
  },
}

export default function OEmbedTestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

