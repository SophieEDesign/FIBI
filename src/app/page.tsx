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
  try {
    // Safely await searchParams - handle potential errors
    let params: { code?: string; confirmed?: string } = {}
    try {
      params = await searchParams
    } catch (searchParamsError) {
      // If searchParams fails, use empty object
      console.warn('Error reading searchParams:', searchParamsError)
      params = {}
    }

    const code = params?.code

    // If there's a code parameter, redirect to auth callback
    if (code) {
      redirect(`/auth/callback?code=${encodeURIComponent(code)}`)
    }

    // Safely create Supabase client
    let supabase
    try {
      supabase = await createClient()
    } catch (clientError) {
      console.error('Failed to create Supabase client:', clientError)
      redirect('/login')
    }

    if (!supabase) {
      redirect('/login')
    }
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // If auth check fails or no user, redirect to login
    if (authError || !user) {
      redirect('/login')
    }

    return <HomeGrid confirmed={params?.confirmed === 'true'} />
  } catch (error) {
    // If there's any error, redirect to login
    console.error('Home page error:', error)
    redirect('/login')
  }
}

