import { notFound } from 'next/navigation'
import TravelGuideView from '@/components/guides/TravelGuideView'
import GuideViewBeacon from '@/components/guides/GuideViewBeacon'
import {
  destinationSlug,
  getPublishedGuideBySlug,
  guideDestinationKey,
  listGuideDestinations,
  listRelatedGuides,
} from '@/lib/travel-guides'

export const dynamic = 'force-dynamic'

export default async function AppGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const loaded = await getPublishedGuideBySlug(slug)
  if (!loaded) notFound()

  const { guide, places } = loaded
  const related = await listRelatedGuides(guide, 4)
  const destinations = await listGuideDestinations()
  const destKey = guideDestinationKey(guide)
  const destSlug = destKey ? destinationSlug(destKey) : null
  const hub =
    destSlug && destinations.some((d) => d.slug === destSlug && d.count >= 2)
      ? destSlug
      : null

  return (
    <>
      <TravelGuideView
        guide={guide}
        places={places}
        related={related}
        destinationHubSlug={hub}
        embedded
      />
      <GuideViewBeacon slug={guide.slug} />
    </>
  )
}
