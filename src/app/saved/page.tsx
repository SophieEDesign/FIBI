'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getGuestSaves, removeGuestSave, type GuestSave } from '@/lib/guest-saves'
import { createClient } from '@/lib/supabase/client'
import SiteFooter from '@/components/SiteFooter'

export default function GuestSavedPage() {
  const [saves, setSaves] = useState<GuestSave[]>([])
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace('/app')
        return
      }
      setSaves(getGuestSaves())
      setReady(true)
    }
    check()
  }, [router, supabase])

  const grouped = useMemo(() => {
    const withCity: Record<string, GuestSave[]> = {}
    const needsPin: GuestSave[] = []
    for (const s of saves) {
      const city = s.location_city?.trim()
      if (!city && s.latitude == null) {
        needsPin.push(s)
      } else {
        const key = city || s.location_country || 'Somewhere'
        if (!withCity[key]) withCity[key] = []
        withCity[key].push(s)
      }
    }
    return { withCity, needsPin }
  }, [saves])

  const handleRemove = (id: string) => {
    removeGuestSave(id)
    setSaves(getGuestSaves())
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-fibi-muted">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fibi-bg-light flex flex-col">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-fibi-text-primary">
            FIBI
          </Link>
          <Link
            href="/add"
            className="text-sm font-medium text-fibi-primary hover:underline"
          >
            Save another
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-fibi-text-primary">Your saves</h1>
          <p className="text-sm text-fibi-muted mt-1">
            On this device for now. Create an account to keep them across phones.
          </p>
        </div>

        {saves.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
            <p className="text-fibi-muted">No saved places yet. Start with something you love.</p>
            <Link
              href="/add"
              className="inline-block bg-fibi-gradient-cta text-white px-6 py-3 rounded-lg font-medium"
            >
              Try a save
            </Link>
          </div>
        ) : (
          <>
            {Object.entries(grouped.withCity).map(([city, items]) => (
              <section key={city}>
                <h2 className="text-sm font-medium text-fibi-muted uppercase tracking-wide mb-3">
                  {city}
                </h2>
                <ul className="space-y-2">
                  {items.map((s) => (
                    <GuestSaveRow key={s.id} save={s} onRemove={handleRemove} />
                  ))}
                </ul>
              </section>
            ))}

            {grouped.needsPin.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-fibi-muted uppercase tracking-wide mb-3">
                  Needs a pin
                </h2>
                <ul className="space-y-2">
                  {grouped.needsPin.map((s) => (
                    <GuestSaveRow key={s.id} save={s} onRemove={handleRemove} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {saves.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-3">
            <p className="text-sm text-fibi-muted">
              Ready to keep these? We&apos;ll move them into your account.
            </p>
            <Link
              href="/signup?redirect=/app"
              className="inline-block bg-fibi-gradient-cta text-white px-6 py-3 rounded-lg font-medium"
            >
              Create an account
            </Link>
            <p className="text-xs text-fibi-muted">
              Already have one?{' '}
              <Link href="/login?redirect=/app" className="text-fibi-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </main>

      <SiteFooter showSignIn />
    </div>
  )
}

function GuestSaveRow({
  save,
  onRemove,
}: {
  save: GuestSave
  onRemove: (id: string) => void
}) {
  return (
    <li className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 items-start">
      {save.thumbnail_url ? (
        <img
          src={save.thumbnail_url}
          alt=""
          className="w-14 h-14 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-fibi-blue-light/30 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fibi-text-primary truncate">
          {save.title || save.place_name || 'Saved place'}
        </p>
        {save.notes && (
          <p className="text-xs text-fibi-muted mt-0.5 line-clamp-2">{save.notes}</p>
        )}
        <a
          href={save.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-fibi-primary hover:underline mt-1 inline-block"
        >
          Open original
        </a>
      </div>
      <button
        type="button"
        onClick={() => onRemove(save.id)}
        className="text-xs text-fibi-muted hover:text-red-600 shrink-0"
      >
        Remove
      </button>
    </li>
  )
}
