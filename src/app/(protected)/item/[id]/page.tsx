import ItemDetail from '@/components/ItemDetail'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Auth is handled by (protected)/layout.tsx
export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ItemDetail itemId={id} />
}

