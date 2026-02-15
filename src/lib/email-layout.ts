/**
 * Shared email layout (header + footer) for automation templates.
 * Matches the design used in itinerary share and invite emails.
 */

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) return bodyMatch[1].trim()
  return html.trim()
}

function hasLayout(html: string): boolean {
  return (
    html.includes('Made with ❤️') ||
    html.includes('linear-gradient(135deg, #2563eb')
  )
}

const HEADER = `
<tr>
  <td style="background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
    <img src="https://fibi.world/FIBI%20Logo.png" alt="FiBi" style="height: 40px; width: auto; margin-bottom: 10px;" />
    <div style="height: 2px; background: rgba(255, 255, 255, 0.3); margin-top: 20px;"></div>
  </td>
</tr>
`.trim()

/** Optional: set in env or replace with your business address for CAN-SPAM compliance */
const FOOTER_ADDRESS = process.env.EMAIL_FOOTER_ADDRESS || ''

function getFooterTable(unsubscribeUrl?: string): string {
  const unsubLink = unsubscribeUrl || 'https://fibi.world/unsubscribe'
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin-top: 20px;">
  <tr>
    <td align="center" style="padding: 20px; color: #6b7280; font-size: 14px;">
      <p style="margin: 0 0 8px 0;">Made with ❤️ by the FiBi team</p>
      <p style="margin: 0 0 8px 0; font-size: 12px;">
        <a href="https://fibi.world" style="color: #3b82f6; text-decoration: none;">fibi.world</a>
      </p>
      <p style="margin: 0 0 8px 0; font-size: 12px;">
        <a href="${unsubLink}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> from these emails
      </p>
      ${FOOTER_ADDRESS ? `<p style="margin: 0; font-size: 11px; color: #9ca3af;">${FOOTER_ADDRESS}</p>` : ''}
    </td>
  </tr>
</table>
`.trim()
}

/**
 * Wrap body content with shared header (gradient + logo) and footer (Made with ❤️, fibi.world, unsubscribe, optional address).
 * If content already has the layout, return as-is.
 * @param htmlContent - Body or full HTML to wrap
 * @param options - Optional unsubscribe URL (e.g. one-click token link); defaults to https://fibi.world/unsubscribe
 */
export function wrapEmailWithLayout(
  htmlContent: string,
  options?: { unsubscribeUrl?: string }
): string {
  if (!htmlContent || !htmlContent.trim()) return htmlContent
  if (hasLayout(htmlContent)) return htmlContent

  const inner = extractBodyContent(htmlContent)
  const contentRow = `
<tr>
  <td style="padding: 40px 30px; font-size: 16px; color: #374151; line-height: 1.6;">
    ${inner}
  </td>
</tr>
`.trim()
  const footer = getFooterTable(options?.unsubscribeUrl)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          ${HEADER}
          ${contentRow}
        </table>
        ${footer}
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
