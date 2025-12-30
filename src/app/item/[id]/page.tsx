import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ItemDetail from '@/components/ItemDetail'

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <ItemDetail itemId={id} />
}

