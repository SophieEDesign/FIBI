import { Resend } from 'resend'
import { wrapEmailWithLayout } from '@/lib/email-layout'

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
 * Send an email using Resend.
 * All HTML emails are wrapped with the shared header and footer (gradient logo, Made with ❤️).
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = 'hello@fibi.world',
  replyTo,
}: {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}) {
  try {
    const resend = getResendClient()
    const wrappedHtml = wrapEmailWithLayout(html)

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: wrappedHtml,
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
    const resend = getResendClient()
    
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
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

