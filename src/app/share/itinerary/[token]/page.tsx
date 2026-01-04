import SharedItineraryView from '@/components/SharedItineraryView'

export const dynamic = 'force-dynamic'

export default async function SharedItineraryPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <SharedItineraryView shareToken={token} />
}

