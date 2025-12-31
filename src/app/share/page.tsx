import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Extract URL from share data
 * Android Share Target can send URL in different parameters:
 * - url: direct URL parameter
 * - text: may contain the URL
 * - title: may contain the URL
 */
function extractUrl(params: { url?: string; text?: string; title?: string }): string | null {
  let url = params?.url
  
  // If no url parameter, check text (Android often sends URL here)
  if (!url && params?.text) {
    // Check if text contains a URL
    const urlMatch = params.text.match(/https?:\/\/[^\s]+/)
    if (urlMatch) {
      url = urlMatch[0]
    } else {
      // If text doesn't look like a URL, use it as-is (might be a URL without protocol)
      url = params.text.trim()
    }
  }
  
  // If still no URL, check title
  if (!url && params?.title) {
    const urlMatch = params.title.match(/https?:\/\/[^\s]+/)
    if (urlMatch) {
      url = urlMatch[0]
    }
  }
  
  // Ensure URL has protocol
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  
  return url || null
}

// GET handler (for manifest method: GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const params = {
    url: searchParams.get('url') || undefined,
    text: searchParams.get('text') || undefined,
    title: searchParams.get('title') || undefined,
  }
  
  const url = extractUrl(params)
  
  if (url) {
    redirect(`/add?url=${encodeURIComponent(url)}`)
  }
  
  // If no URL found, redirect to add page anyway (user can paste manually)
  redirect('/add')
}

// POST handler (for some Android versions that use POST)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const params = {
      url: formData.get('url')?.toString() || undefined,
      text: formData.get('text')?.toString() || undefined,
      title: formData.get('title')?.toString() || undefined,
    }
    
    const url = extractUrl(params)
    
    if (url) {
      redirect(`/add?url=${encodeURIComponent(url)}`)
    }
    
    redirect('/add')
  } catch (error) {
    console.error('Error processing share POST:', error)
    redirect('/add')
  }
}

// This is a public route - no auth checks, no guards, just redirects
// Legacy page component (for GET requests via page.tsx)
export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; text?: string; title?: string }>
}) {
  const params = await searchParams
  const url = extractUrl(params)
  
  if (url) {
    redirect(`/add?url=${encodeURIComponent(url)}`)
  }
  
  redirect('/add')
}

