import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AppAddPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.set(key, value)
    else if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry))
  }
  const qs = query.toString()
  redirect(qs ? `/add?${qs}` : '/add')
}
