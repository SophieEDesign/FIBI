import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Redirect /admin to /app/admin so the admin dashboard lives inside the app layout. */
export default function AdminRedirect() {
  redirect('/app/admin')
}
