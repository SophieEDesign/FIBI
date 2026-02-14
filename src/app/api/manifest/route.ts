import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Public manifest endpoint – no auth.
 * Use this URL for the PWA manifest so it can be fetched without cookies.
 * If you use Vercel Deployment Protection, allowlist this path or disable protection
 * so the manifest returns 200 and the app can be installed as a PWA.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HEADERS = {
  'Content-Type': 'application/manifest+json',
  'Cache-Control': 'public, max-age=3600, must-revalidate',
  'Access-Control-Allow-Origin': '*',
}

export async function GET() {
  try {
    const path = join(process.cwd(), 'public', 'manifest.json')
    const raw = readFileSync(path, 'utf-8')
    const manifest = JSON.parse(raw)
    return NextResponse.json(manifest, { status: 200, headers: HEADERS })
  } catch {
    return NextResponse.json(
      {
        name: 'FiBi',
        short_name: 'FiBi',
        description: 'Save travel places from social media before you lose them',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#171717',
        orientation: 'portrait',
        icons: [
          { src: '/FIBI Logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      { status: 200, headers: HEADERS }
    )
  }
}
