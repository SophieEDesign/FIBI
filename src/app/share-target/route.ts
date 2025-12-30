import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract URL from shared data
    // Priority: url field > text field (if it's a URL) > title field (if it's a URL)
    let sharedUrl = formData.get('url') as string | null
    
    if (!sharedUrl) {
      const text = formData.get('text') as string | null
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        sharedUrl = text
      }
    }
    
    if (!sharedUrl) {
      const title = formData.get('title') as string | null
      if (title && (title.startsWith('http://') || title.startsWith('https://'))) {
        sharedUrl = title
      }
    }
    
    // If we found a URL, redirect to /add with it as a query parameter
    if (sharedUrl) {
      const url = new URL('/add', request.url)
      url.searchParams.set('url', sharedUrl)
      return NextResponse.redirect(url)
    }
    
    // If no URL found, just redirect to /add
    return NextResponse.redirect(new URL('/add', request.url))
  } catch (error) {
    console.error('Share target error:', error)
    // On error, redirect to /add
    return NextResponse.redirect(new URL('/add', request.url))
  }
}

