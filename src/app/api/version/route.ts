import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Version API Endpoint
 * 
 * Returns the current app version from package.json.
 * Used by the service worker and client to check for updates.
 */
export async function GET() {
  try {
    const packagePath = join(process.cwd(), 'package.json')
    const packageContent = readFileSync(packagePath, 'utf-8')
    const packageJson = JSON.parse(packageContent)
    
    return NextResponse.json(
      { version: packageJson.version || '0.1.0' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Error reading version:', error)
    // Fallback version
    return NextResponse.json(
      { version: '0.1.0' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  }
}


