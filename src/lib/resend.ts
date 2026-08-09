import { Resend } from 'resend'
import { wrapEmailWithLayout } from '@/lib/email-layout'
import { getEmailFooterAddress } from '@/lib/site-settings'
import { buildUnsubscribeApiUrl, buildUnsubscribeUrl } from '@/lib/unsubscribe-token'

/**
 * Initialize Resend client
 * Uses RESEND_API_KEY from environment variables
 */
export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set in environment variables')
  }

  return new Resend(apiKey)
}

/**
 * Strip control characters and zero-width/invisible chars that Resend rejects.
 * Keeps normal printable ASCII and common email chars (e.g. + in user+tag@domain.com).
 */
function sanitizeEmailAddress(s: string): string {
  return s.replace(/[\0-\x1F\x7F\u200B-\u200D\uFEFF]/g, '').trim()
}

/**
 * Normalize recipient(s) for Resend: must be "email@example.com" or "Name <email@example.com>".
 * Trims whitespace, strips control/invisible chars, and filters out empty entries.
 */
function normalizeTo(to: string | string[]): string[] {
  const arr = Array.isArray(to) ? to : [to]
  const normalized = arr
    .map((entry) => (typeof entry === 'string' ? sanitizeEmailAddress(entry) : ''))
    .filter((entry) => entry.length > 0)
  if (normalized.length === 0) {
    throw new Error('Invalid `to` field. At least one valid email address is required (e.g. email@example.com or Name <email@example.com>).')
  }
  return normalized
}

/**
 * Send an email using Resend.
 * All HTML emails are wrapped with the shared header and footer (gradient logo, Made with ❤️).
 * Optional text: when provided, sends multipart (text + html) for better deliverability.
 * Pass userId for marketing/lifecycle sends to attach tokenized unsubscribe + List-Unsubscribe headers.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = 'hello@fibi.world',
  replyTo,
  userId,
  unsubscribeUrl: unsubscribeUrlOverride,
  skipUnsubscribeHeaders = false,
}: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  /** When set, footer + List-Unsubscribe use a signed per-user link. */
  userId?: string
  unsubscribeUrl?: string
  /** Skip List-Unsubscribe (e.g. pure transactional like password reset). */
  skipUnsubscribeHeaders?: boolean
}) {
  try {
    const toList = normalizeTo(to)
    const resend = getResendClient()
    const footerAddress = await getEmailFooterAddress()

    let unsubscribeUrl = unsubscribeUrlOverride
    let listUnsubApi: string | undefined
    if (userId && !skipUnsubscribeHeaders) {
      try {
        unsubscribeUrl = unsubscribeUrl ?? buildUnsubscribeUrl(userId)
        listUnsubApi = buildUnsubscribeApiUrl(userId)
      } catch (err) {
        console.warn('[sendEmail] Could not build unsubscribe token:', err)
      }
    }

    const wrappedHtml = wrapEmailWithLayout(html, {
      footerAddress,
      unsubscribeUrl,
    })

    const headers: Record<string, string> = {}
    if (listUnsubApi && !skipUnsubscribeHeaders) {
      headers['List-Unsubscribe'] = `<${listUnsubApi}>`
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
    }

    const { data, error } = await resend.emails.send({
      from,
      to: toList,
      subject,
      html: wrappedHtml,
      ...(text && { text }),
      ...(replyTo && { reply_to: replyTo }),
      ...(Object.keys(headers).length > 0 && { headers }),
    })

    if (error) {
      console.error('Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return data as { id?: string } | undefined
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

/**
 * Send a plain text email
 */
export async function sendTextEmail({
  to,
  subject,
  text,
  from = 'hello@fibi.world',
  replyTo,
}: {
  to: string | string[]
  subject: string
  text: string
  from?: string
  replyTo?: string
}) {
  try {
    const toList = normalizeTo(to)
    const resend = getResendClient()
    
    const { data, error } = await resend.emails.send({
      from,
      to: toList,
      subject,
      text,
      ...(replyTo && { reply_to: replyTo }),
    })
    
    if (error) {
      console.error('Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }
    
    return data
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}
