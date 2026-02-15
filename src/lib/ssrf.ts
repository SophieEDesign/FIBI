/**
 * SSRF protection: block URLs that could target internal/private networks.
 * Used before fetching user-supplied URLs in metadata and oembed APIs.
 */

/** Hostnames that should never be fetched (case-insensitive) */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'metadata.google.com',
  '169.254.169.254', // Cloud metadata
])

/** Regex for hostnames that resolve to internal services */
const BLOCKED_HOSTNAME_PATTERNS = [
  /\.local$/i,
  /\.internal$/i,
  /\.localhost$/i,
  /^127\./,           // 127.0.0.0/8
  /^10\./,            // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
  /^192\.168\./,      // 192.168.0.0/16
  /^169\.254\./,      // 169.254.0.0/16 link-local
  /^0\./,             // 0.0.0.0/8
  /^\[::1\]$/,        // IPv6 loopback
  /^\[0*:1\]$/,
  /^\[fe80:/i,        // IPv6 link-local
  /^\[fc00:/i,        // IPv6 unique local
  /^\[fd00:/i,
]

/**
 * Returns true if the URL is safe to fetch (not targeting internal/private networks).
 * Returns false if the URL should be blocked for SSRF prevention.
 */
export function isUrlSafeForFetch(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return false
    }

    for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
      if (pattern.test(hostname)) {
        return false
      }
    }

    // Block IPv4-mapped IPv6 that resolves to private (e.g. [::ffff:127.0.0.1])
    if (hostname.startsWith('[::ffff:')) {
      const match = hostname.match(/\[::ffff:(\d+\.\d+\.\d+\.\d+)\]/)
      if (match) {
        const ipv4 = match[1]
        if (
          ipv4.startsWith('127.') ||
          ipv4.startsWith('10.') ||
          ipv4.startsWith('192.168.') ||
          ipv4.startsWith('169.254.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ipv4)
        ) {
          return false
        }
      }
    }

    return true
  } catch {
    return false
  }
}
