/**
 * Modern email templates for FiBi
 * All templates use inline CSS for maximum email client compatibility
 */

import { sendEmail } from './resend'

export interface EmailTemplateProps {
  recipientName?: string
  senderName?: string
  ctaText?: string
  ctaUrl?: string
  footerText?: string
}

/**
 * Base email template with modern styling
 */
function BaseEmailTemplate({
  children,
  title,
  preheader,
}: {
  children: string
  title: string
  preheader?: string
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  ${preheader ? `<style type="text/css">.preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }</style>` : ''}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
  ${preheader ? `<div class="preheader" style="display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">${preheader}</div>` : ''}
  
  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Content Table -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          ${children}
        </table>
        
        <!-- Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin-top: 20px;">
          <tr>
            <td align="center" style="padding: 20px; color: #6b7280; font-size: 14px;">
              <p style="margin: 0 0 8px 0;">Made with ❤️ by the FiBi team</p>
              <p style="margin: 0; font-size: 12px;">
                <a href="https://fibi.world" style="color: #3b82f6; text-decoration: none;">fibi.world</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Header component for emails
 */
function EmailHeader() {
  return `
  <tr>
    <td style="background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
      <img src="https://fibi.world/FIBI%20Logo.png" alt="FiBi" style="height: 40px; width: auto; margin-bottom: 10px;" />
      <div style="height: 2px; background: rgba(255, 255, 255, 0.3); margin-top: 20px;"></div>
    </td>
  </tr>
  `.trim()
}

/**
 * CTA Button component
 */
function CTAButton({ text, url }: { text: string; url: string }) {
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding: 20px 30px;">
        <a href="${url}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: all 0.3s ease;">
          ${text}
        </a>
      </td>
    </tr>
  </table>
  `.trim()
}

/**
 * Invite Email Template
 * Sent when someone shares an itinerary
 */
export function getInviteEmailTemplate({
  recipientName = 'there',
  senderName = 'A friend',
  itineraryName = 'an itinerary',
  shareUrl,
  shareType = 'copy',
}: {
  recipientName?: string
  senderName?: string
  itineraryName?: string
  shareUrl: string
  shareType?: 'copy' | 'collaborate'
}): string {
  const isCollaborate = shareType === 'collaborate'
  const ctaText = isCollaborate ? 'Join as collaborator' : 'View itinerary'
  const bodyCopy = isCollaborate
    ? `<strong style="color: #2563eb;">${senderName}</strong> invited you to collaborate on <strong>${itineraryName}</strong>. You'll see it in your calendar and can edit it together.`
    : `<strong style="color: #2563eb;">${senderName}</strong> wants to share <strong>${itineraryName}</strong> with you on FiBi! Check out their travel plans and you can add a copy to your account.`
  return BaseEmailTemplate({
    title: isCollaborate ? `${senderName} invited you to collaborate` : `${senderName} shared an itinerary with you`,
    preheader: isCollaborate ? `Collaborate on ${itineraryName} on FiBi` : `${senderName} wants to share ${itineraryName} with you on FiBi`,
    children: `
      ${EmailHeader()}
      <tr>
        <td style="padding: 40px 30px;">
          <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #111827; line-height: 1.2;">
            👋 Hey ${recipientName}!
          </h1>
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">
            ${bodyCopy}
          </p>
          <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
            ${isCollaborate ? 'Open the link below to join and start planning together.' : 'Check out their travel plans and start planning your next adventure together.'} 🗺️✨
          </p>
          ${CTAButton({ text: ctaText, url: shareUrl })}
          <p style="margin: 30px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
            Or copy and paste this link into your browser:<br />
            <a href="${shareUrl}" style="color: #2563eb; text-decoration: underline; word-break: break-all;">${shareUrl}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px 40px 30px;">
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #ecfeff 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #2563eb;">
            <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
              <strong>💡 New to FiBi?</strong><br />
              FiBi helps you save and organize places you want to visit. Share from any app, add notes, and plan your perfect trip!
            </p>
          </div>
        </td>
      </tr>
    `,
  })
}

/**
 * Welcome Email Template
 * Sent when someone signs up
 */
export function getWelcomeEmailTemplate({
  recipientName = 'there',
}: {
  recipientName?: string
}): string {
  return BaseEmailTemplate({
    title: 'Welcome to FiBi! 🎉',
    preheader: 'Start saving your favorite places and planning your next adventure',
    children: `
      ${EmailHeader()}
      <tr>
        <td style="padding: 40px 30px;">
          <h1 style="margin: 0 0 20px 0; font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.2;">
            Welcome to FiBi! 🎉
          </h1>
          <p style="margin: 0 0 20px 0; font-size: 18px; color: #374151; line-height: 1.6;">
            Hey ${recipientName},
          </p>
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">
            We're so excited to have you on board! FiBi is your personal travel companion for saving and organizing all those amazing places you discover.
          </p>
          <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
            Here's how to get started:
          </p>
          
          <!-- Feature List -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
            <tr>
              <td style="padding: 15px; background: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
                <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">
                  📱 Share from anywhere
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">
                  Share places from TikTok, Instagram, or any app. Visual previews pull through automatically!
                </p>
              </td>
            </tr>
            <tr><td style="height: 10px;"></td></tr>
            <tr>
              <td style="padding: 15px; background: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
                <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">
                  ✨ Add your own places
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">
                  Manually add places with photos, notes, and custom details.
                </p>
              </td>
            </tr>
            <tr><td style="height: 10px;"></td></tr>
            <tr>
              <td style="padding: 15px; background: #f9fafb; border-radius: 8px;">
                <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">
                  🗺️ Plan your trips
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">
                  Organize places into itineraries, view on a map, and share with friends!
                </p>
              </td>
            </tr>
          </table>
          
          ${CTAButton({ text: 'Get Started', url: 'https://fibi.world/app' })}
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px 40px 30px;">
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #ecfeff 100%); border-radius: 12px; padding: 20px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 16px; color: #1e40af; font-weight: 600;">
              💡 Pro Tip
            </p>
            <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
              Install FiBi as a PWA to share places in one tap from any app!
            </p>
          </div>
        </td>
      </tr>
    `,
  })
}

/**
 * Password Reset Email Template
 */
export function getPasswordResetEmailTemplate({
  recipientName = 'there',
  resetUrl,
}: {
  recipientName?: string
  resetUrl: string
}): string {
  return BaseEmailTemplate({
    title: 'Reset your FiBi password',
    preheader: 'Click here to reset your password',
    children: `
      ${EmailHeader()}
      <tr>
        <td style="padding: 40px 30px;">
          <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #111827; line-height: 1.2;">
            Reset Your Password
          </h1>
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">
            Hey ${recipientName},
          </p>
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          ${CTAButton({ text: 'Reset Password', url: resetUrl })}
          <p style="margin: 30px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
            Or copy and paste this link into your browser:<br />
            <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline; word-break: break-all;">${resetUrl}</a>
          </p>
          <p style="margin: 30px 0 0 0; font-size: 14px; color: #dc2626; line-height: 1.6;">
            <strong>⚠️ Didn't request this?</strong><br />
            If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px 40px 30px;">
          <div style="background: #fef2f2; border-radius: 12px; padding: 15px; border-left: 4px solid #dc2626;">
            <p style="margin: 0; font-size: 12px; color: #991b1b; line-height: 1.6;">
              <strong>Security Note:</strong> This link will expire in 1 hour for your security.
            </p>
          </div>
        </td>
      </tr>
    `,
  })
}

/**
 * Helper function to send an invite email
 */
export async function sendInviteEmail({
  to,
  recipientName,
  senderName,
  itineraryName,
  shareUrl,
  shareType = 'copy',
}: {
  to: string | string[]
  recipientName?: string
  senderName?: string
  itineraryName?: string
  shareUrl: string
  shareType?: 'copy' | 'collaborate'
}) {
  const html = getInviteEmailTemplate({
    recipientName,
    senderName,
    itineraryName,
    shareUrl,
    shareType,
  })

  const subject = shareType === 'collaborate'
    ? `${senderName || 'Someone'} invited you to collaborate on ${itineraryName || 'an itinerary'} on FiBi`
    : `${senderName || 'Someone'} shared ${itineraryName || 'an itinerary'} with you on FiBi`

  return sendEmail({
    to,
    subject,
    html,
  })
}

/**
 * Helper function to send a welcome email
 */
export async function sendWelcomeEmail({
  to,
  recipientName,
}: {
  to: string | string[]
  recipientName?: string
}) {
  const html = getWelcomeEmailTemplate({ recipientName })

  return sendEmail({
    to,
    subject: 'Welcome to FiBi! 🎉',
    html,
  })
}

/**
 * Helper function to send a password reset email
 */
export async function sendPasswordResetEmail({
  to,
  recipientName,
  resetUrl,
}: {
  to: string | string[]
  recipientName?: string
  resetUrl: string
}) {
  const html = getPasswordResetEmailTemplate({ recipientName, resetUrl })

  return sendEmail({
    to,
    subject: 'Reset your FiBi password',
    html,
  })
}

// --- Admin onboarding emails (product-ready copy) ---

export const ADMIN_WELCOME_EMAIL_SUBJECT = "You're in. Let's start properly ✨"

/**
 * Admin welcome email HTML (exact product copy)
 */
export function getAdminWelcomeEmailHtml(): string {
  const body = `
<h2>Welcome to FIBI</h2>
<p>FIBI helps you save and organise travel places you don't want to forget.</p>
<p>Here's how to start:</p>
<ol>
  <li>Add one place you've saved recently</li>
  <li>Create a trip</li>
  <li>Keep building from there</li>
</ol>
<p>
  <a href="https://fibi.world/login" style="display:inline-block;padding:12px 20px;background:#171717;color:#ffffff;text-decoration:none;border-radius:6px;">
    Open FIBI
  </a>
</p>
<p style="margin-top:24px;color:#666;font-size:14px;">
  If anything feels confusing, just reply to this email.
</p>
  `.trim()
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to FIBI</title></head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#171717;">${body}</body></html>`
}

/** Subject for "Add your first place" nudge */
export const NUDGE_FIRST_PLACE_SUBJECT = 'Add your first place to FIBI'

/**
 * Nudge email when places_count === 0
 */
export function getNudgeFirstPlaceEmailHtml(): string {
  const body = `
<h2>You're all set — add your first place</h2>
<p>FIBI is ready for you. Save a place you've had on your list (from Instagram, TikTok, or anywhere) and see it in one place.</p>
<p>
  <a href="https://fibi.world/app" style="display:inline-block;padding:12px 20px;background:#171717;color:#ffffff;text-decoration:none;border-radius:6px;">
    Open FIBI
  </a>
</p>
<p style="margin-top:24px;color:#666;font-size:14px;">
  If you have any questions, just reply to this email.
</p>
  `.trim()
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Add your first place</title></head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#171717;">${body}</body></html>`
}

/** Subject for "Nice start" nudge */
export const NUDGE_NICE_START_SUBJECT = 'Nice start — keep building your list'

/**
 * Nudge email when places_count > 0
 */
export function getNudgeNiceStartEmailHtml(): string {
  const body = `
<h2>Nice start</h2>
<p>You've added places to FIBI. Create a trip to group them, or keep saving — your list, your way.</p>
<p>
  <a href="https://fibi.world/app" style="display:inline-block;padding:12px 20px;background:#171717;color:#ffffff;text-decoration:none;border-radius:6px;">
    Open FIBI
  </a>
</p>
<p style="margin-top:24px;color:#666;font-size:14px;">
  Reply to this email if you need anything.
</p>
  `.trim()
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Nice start</title></head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#171717;">${body}</body></html>`
}

// --- Founding follow-up (personal feedback ask from Sophie) ---

export const FOUNDING_FOLLOWUP_EMAIL_SUBJECT =
  'You joined FIBI recently — can I ask you something?'

/**
 * Founding follow-up email: human, invites replies, asks why they signed up.
 */
export function getFoundingFollowupEmailHtml(): string {
  const body = `
<h2>Quick question</h2>
<p>I noticed you joined FIBI recently — thank you.</p>
<p>I'm still shaping the product and would genuinely love to know:</p>
<p><strong>What made you sign up?</strong></p>
<p>Was there something specific that frustrates you about planning trips?</p>
<p>You can just reply to this email — I read every response.</p>
<p>– Sophie</p>
  `.trim()
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Quick question</title></head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#171717;">${body}</body></html>`
}

