'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/app/admin', label: 'Today', exact: true },
  {
    label: 'People',
    items: [
      { href: '/app/admin/people', label: 'All people' },
      { href: '/app/admin/signup-attempts', label: 'Signup attempts' },
    ],
  },
  {
    label: 'Email',
    items: [
      { href: '/app/admin/emails/automations', label: 'Automations' },
      { href: '/app/admin/emails/templates', label: 'Templates' },
      { href: '/app/admin/emails/campaigns', label: 'Campaigns & segments' },
      { href: '/app/admin/emails/log', label: 'Log' },
    ],
  },
  {
    label: 'Content',
    items: [{ href: '/app/admin/guides', label: 'Travel guides' }],
  },
] as const

function linkActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  if (href === '/app/admin/people') {
    return pathname === href || pathname.startsWith('/app/admin/people/')
  }
  if (href === '/app/admin/guides') {
    return pathname === href || pathname.startsWith('/app/admin/guides/')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminSidebar({ adminEmail }: { adminEmail?: string | null }) {
  const pathname = usePathname() || '/app/admin'

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[#E5E5E5] bg-white">
      <div className="border-b border-[#E5E5E5] px-4 py-5">
        <Link href="/app/admin" className="text-lg font-semibold tracking-tight text-[#17181A]">
          FIBI admin
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {NAV.map((entry) => {
          if ('href' in entry) {
            const active = linkActive(pathname, entry.href, entry.exact)
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`rounded-full px-3 py-2 text-sm transition-colors duration-[130ms] ${
                  active
                    ? 'bg-[#E4F4FE] font-medium text-[#14639B]'
                    : 'text-[#5C574C] hover:bg-[#F5F2EC] hover:text-[#17181A]'
                }`}
              >
                {entry.label}
              </Link>
            )
          }
          return (
            <div key={entry.label} className="flex flex-col gap-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A857A]">
                {entry.label}
              </p>
              {entry.items.map((item) => {
                const active = linkActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-2 text-sm transition-colors duration-[130ms] ${
                      active
                        ? 'bg-[#E4F4FE] font-medium text-[#14639B]'
                        : 'text-[#5C574C] hover:bg-[#F5F2EC] hover:text-[#17181A]'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>
      <div className="mt-auto border-t border-[#E5E5E5] px-3 py-4">
        <Link
          href="/app/admin/settings"
          className={`mb-3 block rounded-full px-3 py-2 text-sm transition-colors duration-[130ms] ${
            linkActive(pathname, '/app/admin/settings')
              ? 'bg-[#E4F4FE] font-medium text-[#14639B]'
              : 'text-[#5C574C] hover:bg-[#F5F2EC] hover:text-[#17181A]'
          }`}
        >
          Settings
        </Link>
        {adminEmail ? (
          <p className="truncate px-3 text-xs text-[#8A857A]" title={adminEmail}>
            {adminEmail}
          </p>
        ) : null}
      </div>
    </aside>
  )
}
