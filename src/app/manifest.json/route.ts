import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Route segment config - ensure this is publicly accessible
// This route MUST be public - no authentication checks
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Explicitly mark as public route (no auth required)
export const revalidate = 0

// IMPORTANT: This route handler serves manifest.json publicly
// It bypasses any authentication or middleware checks
// This route handler takes precedence over the static file in public/
export async function GET() {
  try {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json')
    const manifestContent = await readFile(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent)
    
    // Return with explicit public headers - no authentication required
    const response = NextResponse.json(manifest, {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, must-revalidate',
        // Explicitly allow CORS and public access
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        // Ensure no authentication is required
        'X-Content-Type-Options': 'nosniff',
      },
    })
    
    return response
  } catch (error) {
    console.error('Error serving manifest.json:', error)
    // Return a basic manifest even on error to prevent 401
    // This ensures the PWA can still install even if file read fails
    return NextResponse.json({
      name: 'FiBi',
      short_name: 'FiBi',
      start_url: '/',
      display: 'standalone',
      icons: [{
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      }],
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
    })
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}

