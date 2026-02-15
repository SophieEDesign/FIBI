import DOMPurify from 'dompurify'

/**
 * Regex for trusted oEmbed URLs (TikTok, YouTube, Instagram, Facebook).
 * Only allow https from these embed providers.
 */
const TRUSTED_EMBED_URI_REGEXP = /^https:\/\/(www\.)?(tiktok\.com|youtube\.com|youtube-nocookie\.com|instagram\.com|facebook\.com|fb\.com)(\/|$)/i

/**
 * Sanitize oEmbed HTML (from TikTok, Instagram, YouTube, etc.) before rendering.
 * Allows iframes, scripts, and blockquotes only with src/href from trusted embed origins.
 */
export function sanitizeOembedHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''

  const hook = (node: Element, hookEvent: { attrName: string; attrValue: string }) => {
    if (hookEvent.attrName === 'src' || hookEvent.attrName === 'cite') {
      const tagName = node.tagName?.toLowerCase?.()
      if ((tagName === 'script' || tagName === 'iframe' || tagName === 'blockquote') && hookEvent.attrValue) {
        if (!TRUSTED_EMBED_URI_REGEXP.test(hookEvent.attrValue)) {
          hookEvent.attrValue = ''
        }
      }
    }
  }

  DOMPurify.addHook('uponSanitizeAttribute', hook)

  const sanitized = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe', 'script', 'blockquote'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'cite', 'data-id', 'data-video-id', 'loading', 'src', 'href', 'class'],
  })

  DOMPurify.removeHook('uponSanitizeAttribute')

  return sanitized
}
