import { Resend } from 'resend'

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
 * Send an email using Resend
 * @param to - Recipient email address or array of addresses
 * @param subject - Email subject
 * @param html - HTML content of the email
 * @param from - Sender email (defaults to hello@fibi.world)
 * @param replyTo - Reply-to email address (optional)
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
    
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
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

