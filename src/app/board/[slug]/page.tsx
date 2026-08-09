import TripBoardView from '@/components/TripBoardView'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

function getSiteUrl(): string {
  if (typeof process !== 'undefined') {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
  }
  return 'https://fibi.world'
}

async function loadBoard(slug: string) {
  const supabase = await createClient()
  const { data: boards, error } = await supabase.rpc('get_published_board', {
    slug_param: slug,
  })
  if (error || !boards?.length) return null

  const { data: items } = await supabase.rpc('get_published_board_items', {
    slug_param: slug,
  })

  return { board: boards[0], items: items ?? [] }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const siteUrl = getSiteUrl()
  const loaded = await loadBoard(slug)

  if (!loaded) {
    return {
      title: 'Trip board | FIBI',
      description: 'A shared trip board on FIBI',
    }
  }

  const { board, items } = loaded
  const count = Number(board.place_count) || items.length
  const cities = [
    ...new Set(
      items
        .map((i: { location_city?: string | null }) => i.location_city)
        .filter(Boolean)
    ),
  ]
  const placeHint =
    cities.length === 1
      ? `${count} places in ${cities[0]}`
      : `${count} place${count === 1 ? '' : 's'}`

  const description = `${placeHint}, saved on FIBI. By ${board.author_name}.`
  const image =
    board.cover_image_url ||
    items.find((i: { screenshot_url?: string | null; thumbnail_url?: string | null }) =>
      i.screenshot_url || i.thumbnail_url
    )?.screenshot_url ||
    items.find((i: { thumbnail_url?: string | null }) => i.thumbnail_url)?.thumbnail_url ||
    `${siteUrl}/hero-image.png`

  const title = `${board.name} · Trip board | FIBI`

  return {
    title,
    description,
    openGraph: {
      title: board.name,
      description,
      type: 'website',
      url: `${siteUrl}/board/${slug}`,
      images: [{ url: image, width: 1200, height: 630, alt: board.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: board.name,
      description,
      images: [image],
    },
  }
}

export default async function TripBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const loaded = await loadBoard(slug)
  if (!loaded) notFound()

  return (
    <TripBoardView
      slug={slug}
      board={loaded.board}
      items={loaded.items}
    />
  )
}
