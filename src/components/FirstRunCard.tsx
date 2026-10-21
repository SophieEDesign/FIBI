'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePWAInstall } from '@/hooks/usePWAInstall'

interface FirstRunCardProps {
  /** The user already has at least one trip */
  hasTrip: boolean
}

type Phone = 'iphone' | 'android'

const STEPS: Record<Phone, string[]> = {
  iphone: ['In TikTok or Instagram, tap Share, then Copy link.', 'Come back to Fibi and tap Paste.'],
  android: ['Add Fibi to your home screen from the browser menu.', 'In TikTok or Instagram, tap Share and choose Fibi.'],
}

function looksLikeUrl(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  try {
    const u = new URL(v.startsWith('http') ? v : `https://${v}`)
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

/** Shown on Places while the user has nothing saved. Replaces the old "Start building your next trip" empty state. */
export default function FirstRunCard({ hasTrip }: FirstRunCardProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const { isInstalled, isInstallable, promptInstall } = usePWAInstall()
  const [link, setLink] = useState('')
  const [phone, setPhone] = useState<Phone>('iphone')
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    setPhone(/Android/i.test(navigator.userAgent) ? 'android' : 'iphone')
  }, [])

  const openAdd = (value: string) => {
    const url = value.trim()
    router.push(`/add?url=${encodeURIComponent(url.startsWith('http') ? url : `https://${url}`)}`)
  }

  const handlePaste = async () => {
    setHint(null)
    try {
      const text = await navigator.clipboard.readText()
      const match = text.match(/https?:\/\/\S+/)
      if (match) {
        setLink(match[0])
        openAdd(match[0])
      } else {
        setHint("There's no link on your clipboard. Copy one from TikTok or Instagram first.")
        inputRef.current?.focus()
      }
    } catch {
      setHint('Paste the link into the box instead.')
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (looksLikeUrl(link)) openAdd(link)
    else setHint("That doesn't look like a link. Try copying it again.")
  }

  const checklist = [
    { done: false, title: 'Save your first place', sub: 'Paste a link or share one to Fibi.', onClick: () => inputRef.current?.focus() },
    { done: hasTrip, title: 'Put it in a trip', sub: 'Group places by city or holiday.', href: '/app/calendar' },
    {
      done: isInstalled,
      title: 'Add Fibi to your home screen',
      sub: 'It opens like an app and keeps you signed in.',
      onClick: isInstallable ? () => { promptInstall() } : undefined,
      href: isInstallable ? undefined : '/app/how-to',
    },
  ]
  const doneCount = checklist.filter((c) => c.done).length

  return (
    <div className="max-w-md mx-auto grid gap-6 py-4 md:py-10 relative">
      <div className="p-5 rounded-2xl border border-gray-200 bg-white bg-aurora shadow-soft grid gap-4">
        <div>
          <h2 className="text-[22px] leading-tight font-medium text-charcoal">Save your first place</h2>
          <p className="mt-1.5 text-[15px] text-secondary">
            Nothing saved yet — share a link from TikTok or Instagram and it lands here.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <label htmlFor="first-run-link" className="sr-only">Link to a post</label>
          <input
            ref={inputRef}
            id="first-run-link"
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => {
              setLink(e.target.value)
              setHint(null)
            }}
            placeholder="Link to a post"
            className="h-11 min-w-0 px-3.5 rounded-xl border border-gray-300 bg-white text-[15px] text-charcoal focus:border-sky-400 focus:outline-none"
          />
          {link.trim() ? (
            <button type="submit" className="h-11 px-4 rounded-full bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 active:scale-[0.985] transition">
              Save
            </button>
          ) : (
            <button type="button" onClick={handlePaste} className="h-11 px-4 inline-flex items-center gap-1.5 rounded-full bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 active:scale-[0.985] transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
                <rect x="8" y="2" width="8" height="4" rx="1" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              </svg>
              Paste
            </button>
          )}
        </form>
        {hint && <p className="-mt-2 text-sm text-secondary">{hint}</p>}

        <div className="grid grid-cols-2 p-[3px] rounded-full bg-gray-100" role="tablist" aria-label="Your phone">
          {(['iphone', 'android'] as Phone[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={phone === p}
              onClick={() => setPhone(p)}
              className={`h-[30px] rounded-full text-sm font-medium transition-colors ${phone === p ? 'bg-white text-charcoal shadow-soft' : 'text-secondary'}`}
            >
              {p === 'iphone' ? 'iPhone' : 'Android'}
            </button>
          ))}
        </div>
        <ol className="grid gap-2.5">
          {STEPS[phone].map((text, i) => (
            <li key={text} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 text-sm text-secondary">
              <span className="w-[22px] h-[22px] rounded-full bg-sky-100 text-sky-700 text-xs font-semibold leading-[22px] text-center">{i + 1}</span>
              <span className="pt-px">{text}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-2">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-charcoal">Getting started</span>
          <span className="text-gray-500">{doneCount} of {checklist.length}</span>
        </div>
        <ul className="rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-200 bg-white">
          {checklist.map((c) => {
            const content = (
              <>
                <span className={`w-5 h-5 rounded-full grid place-items-center ${c.done ? 'bg-sky-500 text-white' : 'border-[1.5px] border-gray-300'}`}>
                  {c.done && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[15px] font-medium ${c.done ? 'text-gray-500 line-through' : 'text-charcoal'}`}>{c.title}</span>
                  <span className="block text-xs text-secondary">{c.sub}</span>
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                </svg>
              </>
            )
            const cls = 'w-full grid grid-cols-[20px_minmax(0,1fr)_16px] gap-3.5 items-center px-4 py-3.5 text-left hover:bg-gray-50 transition-colors'
            return (
              <li key={c.title}>
                {c.href ? (
                  <Link href={c.href} className={cls}>{content}</Link>
                ) : (
                  <button type="button" onClick={c.onClick} className={cls}>{content}</button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
