'use client'

import { useEffect } from 'react'

/** Fire-and-forget view beacon for published guide pages. */
export default function GuideViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return
    const key = `fibi_guide_view_${slug}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      /* ignore */
    }
    void fetch(`/api/travel-guides/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => {})
  }, [slug])

  return null
}
