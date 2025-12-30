import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeGrid from '@/components/HomeGrid'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; confirmed?: string }>
}) {
  const params = await searchParams
  const code = params?.code

  // If there's a code parameter, redirect to auth callback
  if (code) {
    redirect(`/auth/callback?code=${code}`)
  }

  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <HomeGrid confirmed={params?.confirmed === 'true'} />
}

