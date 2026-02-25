import type { MetadataRoute } from 'next'

function getBaseUrl(): string {
  if (typeof process !== 'undefined') {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
  }
  return 'https://fibi.world'
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app', '/dashboard', '/api', '/auth'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
