import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AddItemForm from '@/components/AddItemForm'

export default async function AddPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <AddItemForm />
}

