import { redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>
}) {
  const params = await searchParams
  const url = params?.url

  if (url) {
    redirect(`/add?url=${encodeURIComponent(url)}`)
  }

  redirect('/')
}

