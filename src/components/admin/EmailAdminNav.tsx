'use client'

import Link from 'next/link'

const LINKS = [
  { href: '/app/admin/emails/templates', label: 'Templates' },
  { href: '/app/admin/emails/segments', label: 'Segments' },
  { href: '/app/admin/emails/campaigns', label: 'Campaigns' },
  { href: '/app/admin/emails/automations', label: 'Automations' },
  { href: '/app/admin/emails/log', label: 'Email log' },
] as const

export default function EmailAdminNav({ current }: { current?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Link href="/app/admin" className="text-sm text-gray-600 hover:text-gray-900">
        ← Admin
      </Link>
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`text-sm ${
            current === l.href ? 'font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </div>
  )
}
