import { Suspense } from 'react'
import AddItemForm from '@/components/AddItemForm'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Auth is handled by (protected)/layout.tsx
export default function AddPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AddItemForm />
    </Suspense>
  )
}

