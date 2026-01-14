import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Route handler for manifest.json
 * Serves the manifest.json file from the public folder
 * This ensures it's always accessible without authentication
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Read the manifest.json file from the public folder
    const manifestPath = join(process.cwd(), 'public', 'manifest.json')
    const manifestContent = readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent)

    return NextResponse.json(manifest, {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error serving manifest.json:', error)
    // Return a basic manifest if file read fails
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
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'public, max-age=3600, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}

