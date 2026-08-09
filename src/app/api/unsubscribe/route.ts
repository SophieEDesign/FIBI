import { NextRequest, NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'
import { applyMarketingUnsubscribe } from '@/lib/marketing-unsubscribe'

export const dynamic = 'force-dynamic'

function extractToken(request: NextRequest, body: Record<string, unknown> | null): string | null {
  const fromQuery = request.nextUrl.searchParams.get('token')?.trim()
  if (fromQuery) return fromQuery
  if (body && typeof body.token === 'string' && body.token.trim()) return body.token.trim()
  return null
}

/**
 * POST /api/unsubscribe?token=…
 * One-click (RFC 8058) and form unsubscribe. Sets marketing_opt_in = false.
 * Also accepts JSON { token } or form body token=.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> | null = null
  const contentType = request.headers.get('content-type') || ''

  try {
    if (contentType.includes('application/json')) {
      body = (await request.json()) as Record<string, unknown>
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await request.formData()
      body = { token: form.get('token')?.toString() }
    } else {
      // RFC 8058 one-click often posts List-Unsubscribe=One-Click with empty/simple body
      const text = await request.text()
      if (text.includes('token=')) {
        const params = new URLSearchParams(text)
        body = { token: params.get('token') }
      } else {
        body = {}
      }
    }
  } catch {
    body = {}
  }

  const token = extractToken(request, body)
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const userId = verifyUnsubscribeToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
  }

  const result = await applyMarketingUnsubscribe(userId)
  if (!result.ok) {
    return NextResponse.json({ error: 'That didn\'t work. Try again.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    alreadyOptedOut: result.alreadyOptedOut,
    message: result.alreadyOptedOut
      ? 'You were already unsubscribed.'
      : 'You\'re unsubscribed from product updates.',
  })
}

/**
 * GET /api/unsubscribe?token=… — soft redirect helpers / health for clients that prefetch.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/unsubscribe', request.url))
  }
  return NextResponse.redirect(new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, request.url))
}
