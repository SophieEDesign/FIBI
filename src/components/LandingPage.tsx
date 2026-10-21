'use client'

import Link from 'next/link'
import { useState } from 'react'

type PhotoCredit = {
  photographer: string
  license: 'CC BY-SA 4.0' | 'CC BY-SA 2.0' | 'Public domain'
  licenseUrl?: string
  /** CC works that were cropped or otherwise altered for the card */
  altered?: 'cropped' | 'edited'
}

type ExamplePlace = {
  name: string
  location: string
  note: string
  source: string
  image: string | null
  credit?: PhotoCredit
}

const EXAMPLES: ExamplePlace[] = [
  {
    name: 'Time Out Market',
    location: 'Cais do Sodré, Lisbon',
    note: 'Go early — the seafood counter gets busy.',
    source: 'TikTok',
    image: '/landing/time-out-market.jpg',
    credit: {
      photographer: 'Neitram',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      altered: 'cropped',
    },
  },
  {
    name: 'Praia da Ursa',
    location: 'Sintra',
    note: 'Steep path down. Worth it at sunset.',
    source: 'Instagram',
    image: '/landing/praia-da-ursa.jpg',
    credit: {
      photographer: 'Filipemigu',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      altered: 'cropped',
    },
  },
  {
    name: 'Park Bar',
    location: 'Bairro Alto, Lisbon',
    note: 'Rooftop on a car park. Go for sunset.',
    source: 'Instagram',
    image: '/landing/park-bar.jpg',
    credit: {
      photographer: 'Vitor Oliveira',
      license: 'CC BY-SA 2.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
      altered: 'cropped',
    },
  },
  {
    name: 'Miradouro da Senhora do Monte',
    location: 'Graça, Lisbon',
    note: 'Best view over the city, free.',
    source: 'YouTube',
    image: '/landing/senhora-do-monte.jpg',
    credit: {
      photographer: 'Reino Baptista',
      license: 'Public domain',
    },
  },
]

const STEPS = [
  { n: '01', title: 'Save it', body: 'Share a link to Fibi directly from any app or website.' },
  { n: '02', title: 'Make it yours', body: 'Add a screenshot, name, and location to remember why you saved it.' },
  { n: '03', title: 'Find it later', body: 'Everything is organised in one calm, algorithm-free place for easy access.' },
]

// Pin positions on the map band (percent of width/height). Sky blues only — matches FIBI throughout.
const PINS = [
  { x: 24, y: 58, tone: 'sky' }, { x: 62, y: 36, tone: 'sky' }, { x: 46, y: 50, tone: 'sky-deep' },
  { x: 12, y: 32, tone: 'sky' }, { x: 78, y: 62, tone: 'sky-deep' },
]

function formatCredit(credit: PhotoCredit): string {
  const alter =
    credit.altered === 'cropped'
      ? ' Cropped from original.'
      : credit.altered === 'edited'
        ? ' Edited from original.'
        : ''
  if (credit.license === 'Public domain') {
    return `Photo by ${credit.photographer} / Wikimedia Commons / Public domain.${alter}`
  }
  return `Photo by ${credit.photographer} / Wikimedia Commons / ${credit.license}.${alter}`
}

function PinIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

/** Filled map pin for the landing map band — FIBI sky only */
function MapPin({ tone }: { tone: 'sky' | 'sky-deep' }) {
  const fill = tone === 'sky-deep' ? '#2E9EE8' : '#58B8F8'
  return (
    <svg className="w-8 h-8 drop-shadow-[0_6px_14px_rgba(46,158,232,0.45)]" viewBox="0 0 24 24" aria-hidden>
      <path
        fill={fill}
        stroke="#FFFFFF"
        strokeWidth={1.75}
        d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"
      />
      <circle cx="12" cy="10" r="2.5" fill="#FFFFFF" />
    </svg>
  )
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="FIBI home">
      <img src="/fibi-mark.png" alt="" className="h-7 w-auto" />
      <span className="text-[16px] font-semibold tracking-[0.11em] text-mist">FIBI</span>
    </Link>
  )
}

export default function LandingPage() {
  const [mapImageFailed, setMapImageFailed] = useState(false)
  const creditedExamples = EXAMPLES.filter((p) => p.credit)

  return (
    <div className="min-h-screen bg-night-950 text-mist">
      <header className="sticky top-0 z-20 bg-night-950/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link href="/login" className="px-3 sm:px-4 h-10 inline-flex items-center rounded-full text-sm font-medium text-mist hover:bg-night-800 transition-colors">
              Sign in
            </Link>
            {/* Hero already has Get started; keep header CTA from sm up so the bar stays tidy on phones */}
            <Link href="/signup" className="hidden sm:inline-flex px-4 h-10 items-center rounded-full text-sm font-medium bg-sky-400 text-night-950 hover:bg-sky-300 transition-colors">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-aurora">
          <div className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-16 sm:pt-24 text-center">
            <h1 className="mx-auto max-w-[940px] text-[40px] sm:text-[56px] lg:text-[64px] leading-[1.06] font-semibold tracking-[-0.032em]">
              That restaurant you saw on Instagram? That beach from TikTok?
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-mist-muted">
              Save it before it disappears from your feed.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center h-12 px-7 rounded-full bg-sky-400 text-night-950 text-base font-medium shadow-soft-lg hover:bg-sky-300 active:scale-[0.985] transition"
              >
                Get started
              </Link>
            </div>

            {/* Example saved places */}
            <div className="mt-16 -mx-5 sm:mx-0 px-5 sm:px-0 flex gap-5 overflow-x-auto sm:overflow-visible sm:justify-center snap-x snap-mandatory scrollbar-thin pb-3">
              {EXAMPLES.map((p, i) => (
                <article
                  key={p.name}
                  className={`snap-center shrink-0 w-[248px] text-left rounded-2xl overflow-hidden bg-night-800 border border-night-700 shadow-soft-lg ${i % 2 ? 'sm:translate-y-7' : ''}`}
                >
                  <div className="relative aspect-[4/3] bg-brand-night grid place-items-center text-sky-300">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <PinIcon />
                    )}
                    <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-night-900/70 backdrop-blur text-xs font-medium text-mist">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      {p.source}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-[15px] font-medium leading-snug">{p.name}</h3>
                    <p className="mt-0.5 text-[13px] text-mist-muted">{p.location}</p>
                    <p className="mt-2 text-[13px] text-mist-muted">{p.note}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Map band */}
        <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-16 sm:pt-24">
          <div className="relative h-[300px] sm:h-[380px] rounded-2xl overflow-hidden border border-night-700 bg-night-800">
            {!mapImageFailed ? (
              <img
                src="/landing/map.jpg"
                alt="Saved places shown as pins on a map of Lisbon"
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setMapImageFailed(true)}
              />
            ) : (
              <div className="absolute inset-0 bg-brand-night opacity-60" aria-hidden />
            )}
            {/* Pins sit on top of the map (or the indigo fallback) */}
            {PINS.map((pin, i) => (
              <span
                key={i}
                className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                aria-hidden
              >
                <MapPin tone={pin.tone} />
              </span>
            ))}
            <div className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6 right-4 sm:right-auto px-5 py-3.5 rounded-2xl bg-night-800/75 backdrop-blur-xl backdrop-saturate-150">
              <p className="text-lg font-medium">Every place you save, on one map</p>
              <p className="text-sm text-mist-muted">Pins for places to visit and places you&apos;ve been.</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-[1120px] mx-auto px-5 sm:px-8 py-16 sm:py-24" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="sr-only">How it works</h2>
          <ol className="grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="pt-5 border-t border-night-700">
                <span className="font-mono text-sm text-sky-300">{s.n}</span>
                <h3 className="mt-2 text-[22px] font-medium">{s.title}</h3>
                <p className="mt-2 text-[15px] text-mist-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Final CTA */}
        <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pb-24 sm:pb-28 text-center">
          <h2 className="text-[32px] sm:text-[40px] leading-[1.1] font-semibold tracking-[-0.018em]">Ready to start saving?</h2>
          <p className="mt-4 text-[15px] text-mist-muted">
            On iPhone, copy the link and tap Paste. On Android, share straight to Fibi.
          </p>
          <div className="mt-7 flex justify-center">
            <Link href="/signup" className="inline-flex items-center h-12 px-7 rounded-full bg-sky-400 text-night-950 text-base font-medium hover:bg-sky-300 active:scale-[0.985] transition">
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-night-700">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 py-6 flex flex-col gap-5 text-xs text-mist-faint">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} Fibi. Save places before you lose them.</p>
            <div className="flex items-center gap-6">
              <Link href="/signup" className="text-sky-300 hover:text-sky-200">Sign up</Link>
              <Link href="/login" className="text-sky-300 hover:text-sky-200">Sign in</Link>
            </div>
          </div>
          {creditedExamples.length > 0 && (
            <ul className="space-y-1.5 text-left max-w-3xl" aria-label="Photo credits">
              {creditedExamples.map((p) => (
                <li key={p.name}>
                  <span className="text-mist-muted">{p.name}: </span>
                  {p.credit!.licenseUrl ? (
                    <>
                      Photo by {p.credit!.photographer} / Wikimedia Commons /{' '}
                      <a
                        href={p.credit!.licenseUrl}
                        className="text-sky-300/80 hover:text-sky-200 underline-offset-2 hover:underline"
                        rel="license noopener noreferrer"
                        target="_blank"
                      >
                        {p.credit!.license}
                      </a>
                      .
                      {p.credit!.altered === 'cropped'
                        ? ' Cropped from original.'
                        : p.credit!.altered === 'edited'
                          ? ' Edited from original.'
                          : null}
                    </>
                  ) : (
                    formatCredit(p.credit!)
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </footer>
    </div>
  )
}
