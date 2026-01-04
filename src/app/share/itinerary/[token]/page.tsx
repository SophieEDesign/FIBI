import SharedItineraryView from '@/components/SharedItineraryView'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: {
    token: string
  }
}

export default function SharedItineraryPage({ params }: PageProps) {
  return <SharedItineraryView shareToken={params.token} />
}

