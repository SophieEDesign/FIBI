import { describe, expect, it } from 'vitest'
import {
  buildTikTokOEmbedSourceUrl,
  extractTikTokVideoId,
  isTikTokShellTitle,
  isTikTokShortLink,
  isTikTokUrl,
} from '@/lib/tiktok-oembed'

describe('tiktok-oembed helpers', () => {
  it('detects TikTok hosts including short links', () => {
    expect(isTikTokUrl('https://www.tiktok.com/@u/video/123')).toBe(true)
    expect(isTikTokUrl('https://vm.tiktok.com/ZGduXh8T9/')).toBe(true)
    expect(isTikTokUrl('https://vt.tiktok.com/ZSxabc/')).toBe(true)
    expect(isTikTokUrl('https://instagram.com/p/x')).toBe(false)
  })

  it('flags short links', () => {
    expect(isTikTokShortLink('https://vm.tiktok.com/ZGduXh8T9/')).toBe(true)
    expect(isTikTokShortLink('https://www.tiktok.com/t/ZTxxxxx/')).toBe(true)
    expect(isTikTokShortLink('https://www.tiktok.com/@u/video/123')).toBe(false)
  })

  it('extracts video ids from path and share_item_id', () => {
    expect(
      extractTikTokVideoId('https://www.tiktok.com/@user/video/7612124153478499604')
    ).toBe('7612124153478499604')
    expect(
      extractTikTokVideoId(
        'https://www.tiktok.com/@/video/7612124153478499604?share_item_id=7612124153478499604'
      )
    ).toBe('7612124153478499604')
    expect(
      extractTikTokVideoId(
        'https://www.tiktok.com/share?share_item_id=7612124153478499604'
      )
    ).toBe('7612124153478499604')
    expect(extractTikTokVideoId('https://vm.tiktok.com/ZGduXh8T9/')).toBeNull()
  })

  it('builds oEmbed-friendly source URLs', () => {
    expect(buildTikTokOEmbedSourceUrl('7612124153478499604')).toBe(
      'https://www.tiktok.com/@/video/7612124153478499604'
    )
  })

  it('detects shell titles', () => {
    expect(isTikTokShellTitle('TikTok - Make Your Day')).toBe(true)
    expect(isTikTokShellTitle('#Bro #grind')).toBe(false)
  })
})
