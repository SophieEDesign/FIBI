import Link from 'next/link'

export const dynamic = 'force-dynamic'

/**
 * Unsubscribe landing page. Linked from email footers for CAN-SPAM / best practice.
 * Logged-in users could be shown a "Email preferences" toggle; others see instructions to log in.
 */
export default function UnsubscribePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f3f4f6]">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <h1 className="text-xl font-semibold text-[#171717] mb-2">
          Unsubscribe from FiBi emails
        </h1>
        <p className="text-[#374151] text-sm leading-relaxed mb-6">
          To stop receiving product updates and reminders, log in and we&apos;ll remember your
          preference. You&apos;ll still receive important account emails (e.g. password reset) when
          needed.
        </p>
        <Link
          href="/login"
          className="inline-block px-5 py-2.5 bg-[#171717] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Log in to FiBi
        </Link>
        <p className="mt-6 text-[#6b7280] text-xs">
          <Link href="https://fibi.world" className="underline hover:no-underline">
            fibi.world
          </Link>
        </p>
      </div>
    </div>
  )
}
