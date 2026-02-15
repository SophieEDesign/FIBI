import { getAdminSupabase } from '@/lib/admin'

const KEY_EMAIL_FOOTER_ADDRESS = 'email_footer_address'

/**
 * Get the email footer address (for CAN-SPAM) from site_settings.
 * Falls back to process.env.EMAIL_FOOTER_ADDRESS, then ''.
 */
export async function getEmailFooterAddress(): Promise<string> {
  try {
    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', KEY_EMAIL_FOOTER_ADDRESS)
      .single()
    if (error || data?.value == null) return process.env.EMAIL_FOOTER_ADDRESS || ''
    return String(data.value).trim()
  } catch {
    return process.env.EMAIL_FOOTER_ADDRESS || ''
  }
}
