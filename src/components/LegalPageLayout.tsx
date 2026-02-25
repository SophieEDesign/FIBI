import Link from 'next/link'

interface LegalPageLayoutProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

/**
 * Shared layout for legal pages (Privacy Policy, Terms). Provides consistent
 * container, back-to-home link, title, and last-updated date.
 */
export default function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/app"
          className="inline-block text-sm text-[#6b7280] hover:text-[#171717] mb-6 transition-colors"
        >
          ← Back to FiBi
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] mb-2">{title}</h1>
        <p className="text-sm text-[#6b7280] mb-8">Last updated: {lastUpdated}</p>
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 text-[#374151] text-sm sm:text-base leading-relaxed space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}
