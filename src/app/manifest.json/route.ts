import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Manifest.json Route Handler
 * 
 * Serves the manifest.json file from the public directory.
 * This route handler ensures the manifest is always accessible
 * without authentication, even if there are middleware or auth checks.
 */
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
    return NextResponse.json(
      { error: 'Manifest not found' },
      { status: 404 }
    )
  }
}

