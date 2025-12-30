import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AddItemForm from '@/components/AddItemForm'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function AddPage() {
  // TEMPORARILY DISABLED FOR TESTING - Skip auth checks
  // const supabase = await createClient()
  
  // const {
  //   data: { user },
  // } = await supabase.auth.getUser()

  // if (!user) {
  //   redirect('/login')
  // }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AddItemForm />
    </Suspense>
  )
}

