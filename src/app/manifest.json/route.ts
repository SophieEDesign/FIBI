import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// Explicitly serve manifest.json to avoid 401 errors
// This route handler ensures the manifest is always publicly accessible
export async function GET() {
  try {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json')
    const manifestContent = readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent)
    
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error reading manifest.json:', error)
    // Fallback manifest if file read fails
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
        headers: {
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'public, max-age=3600',
        },
      }
    )
  }
}

