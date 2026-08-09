'use client'

/**
 * Capture-first homepage. Travel boards are an optional share outcome — not discovery.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import SiteFooter from '@/components/SiteFooter'
import GuideCardLink from '@/components/guides/GuideCardLink'
import type { GuideCard } from '@/lib/travel-guides-shared'

const DEMO_PLACES = [
  { name: 'Time Out Market', city: 'Lisbon', category: 'Food' },
  { name: 'LX Factory', city: 'Lisbon', category: 'City' },
  { name: 'Praia da Adraga', city: 'Sintra', category: 'Beach' },
  { name: 'Café da Garagem', city: 'Lisbon', category: 'Food' },
  { name: 'Palácio da Pena', city: 'Sintra', category: 'Stay' },
  { name: 'Miradouro da Senhora do Monte', city: 'Lisbon', category: 'Nature' },
]

const FLOATING_CARDS = [
  {
    label: 'Barcelona',
    sub: 'City walk',
    img: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&q=80',
    className: 'top-[6%] left-[2%] w-[42%] rotate-[-6deg] hidden sm:block',
    delay: '0s',
  },
  {
    label: 'Santorini',
    sub: 'Stay',
    img: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&q=80',
    className: 'top-[4%] right-[0%] w-[38%] rotate-[5deg]',
    delay: '0.4s',
  },
  {
    label: 'Dolomites',
    sub: 'Nature',
    img: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&q=80',
    className: 'bottom-[8%] left-[0%] w-[40%] rotate-[4deg] hidden sm:block',
    delay: '0.8s',
  },
  {
    label: 'Hidden beach, Mallorca',
    sub: 'Beach',
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
    className: 'bottom-[4%] right-[2%] w-[44%] rotate-[-3deg]',
    delay: '1.2s',
  },
]

const DEMO_STEPS = [
  { id: 'reel', label: 'Reel' },
  { id: 'share', label: 'Share' },
  { id: 'fibi', label: 'FIBI' },
  { id: 'saved', label: 'Saved' },
  { id: 'map', label: 'Map' },
] as const

function DestinationCard({
  label,
  sub,
  img,
  className,
  delay,
}: {
  label: string
  sub: string
  img: string
  className: string
  delay: string
}) {
  return (
    <div className={`absolute z-0 ${className}`}>
      <div
        className="rounded-xl overflow-hidden shadow-soft-md border border-white/70 bg-white landing-float"
        style={{ animationDelay: delay }}
      >
        <div className="relative aspect-[4/5]">
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-2.5">
            <p className="text-white text-xs font-semibold leading-tight drop-shadow-sm">{label}</p>
            <p className="text-white/80 text-[10px] mt-0.5">{sub}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductDemo() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % DEMO_STEPS.length)
    }, 2200)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[4/5] sm:aspect-square lg:aspect-[4/5]">
      {FLOATING_CARDS.map((card) => (
        <DestinationCard key={card.label} {...card} />
      ))}

      <div className="absolute inset-[12%] sm:inset-[14%] z-10 flex items-center justify-center">
        <div className="relative w-[72%] max-w-[240px] aspect-[9/19] rounded-[1.75rem] bg-fibi-bg-dark shadow-soft-md border-[3px] border-gray-800 overflow-hidden landing-demo-phone">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 rounded-full bg-gray-700 z-20" />

          <div
            className={`absolute inset-0 transition-opacity duration-500 ${
              step === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src="https://images.unsplash.com/photo-1533105079780-92b9be482077?w=500&q=80"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            <div className="absolute top-8 left-3 right-3 flex items-center gap-2">
              <span className="text-white text-[10px] font-medium bg-black/40 px-2 py-0.5 rounded">
                TikTok
              </span>
            </div>
            <div className="absolute bottom-10 left-3 right-10">
              <p className="text-white text-xs font-semibold">Hidden cove in Mallorca</p>
              <p className="text-white/70 text-[10px] mt-0.5">@travelnotes</p>
            </div>
          </div>

          <div
            className={`absolute inset-0 bg-[#1a1a1a] transition-opacity duration-500 ${
              step === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src="https://images.unsplash.com/photo-1533105079780-92b9be482077?w=500&q=80"
              alt=""
              className="absolute inset-0 w-full h-1/2 object-cover opacity-40"
            />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-3 pt-4">
              <p className="text-[10px] font-medium text-fibi-muted text-center mb-3">Share to</p>
              <div className="flex justify-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-fibi-gradient-cta flex items-center justify-center shadow-sm ring-2 ring-fibi-primary ring-offset-1">
                    <img src="/FIBI Logo.png" alt="" className="h-5 w-auto" />
                  </div>
                  <span className="text-[9px] font-semibold text-fibi-text-primary">FIBI</span>
                </div>
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <div className="w-10 h-10 rounded-xl bg-gray-100" />
                  <span className="text-[9px] text-fibi-muted">Messages</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`absolute inset-0 bg-fibi-bg-light transition-opacity duration-500 ${
              step === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="pt-10 px-3 flex flex-col items-center text-center">
              <img src="/FIBI Logo.png" alt="" className="h-7 w-auto mb-3" />
              <p className="text-xs font-semibold text-fibi-text-primary">Saving place…</p>
              <p className="text-[10px] text-fibi-muted mt-1">Pulling preview from the link</p>
              <div className="mt-6 w-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-soft">
                <div className="h-24 bg-gradient-to-br from-fibi-blue-light via-fibi-sand to-fibi-coral landing-shimmer" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-2 w-3/4 rounded bg-gray-100" />
                  <div className="h-2 w-1/2 rounded bg-gray-100" />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`absolute inset-0 bg-fibi-bg-light transition-opacity duration-500 ${
              step === 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="pt-9 px-2.5">
              <div className="rounded-xl overflow-hidden border border-gray-100 bg-white shadow-soft">
                <div className="relative h-36">
                  <img
                    src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-fibi-text-primary">Cala Mesquida</p>
                  <p className="text-[10px] text-fibi-muted mt-0.5">Mallorca · Beach</p>
                  <span className="inline-block mt-2 text-[9px] font-medium text-fibi-primary bg-fibi-blue-light/50 px-2 py-0.5 rounded">
                    Saved
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`absolute inset-0 bg-fibi-bg-light transition-opacity duration-500 ${
              step === 4 ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="pt-9 px-2.5 space-y-2">
              <p className="text-[10px] font-medium text-fibi-muted uppercase tracking-wide px-0.5">
                Mallorca long weekend
              </p>
              <div
                className="relative h-28 rounded-xl overflow-hidden border border-gray-100"
                style={{
                  background:
                    'linear-gradient(145deg, #BEE9FF 0%, #E8F4F8 40%, #F2C879 100%)',
                }}
              >
                {[
                  { top: '35%', left: '48%' },
                  { top: '55%', left: '32%' },
                  { top: '42%', left: '68%' },
                ].map((pin, i) => (
                  <span
                    key={i}
                    className="absolute w-2.5 h-2.5 rounded-full bg-fibi-primary border-2 border-white shadow-sm"
                    style={{ top: pin.top, left: pin.left }}
                  />
                ))}
              </div>
              <ul className="rounded-xl bg-white border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                {['Cala Mesquida', 'Palma old town', 'Deia café'].map((name) => (
                  <li key={name} className="px-2.5 py-1.5 text-[10px] font-medium text-fibi-text-primary">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-1 left-0 right-0 z-20 flex justify-center gap-1.5 sm:gap-2 px-2">
        {DEMO_STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(i)}
            className={`text-[10px] sm:text-xs px-2 py-1 rounded-md transition-colors ${
              step === i
                ? 'bg-fibi-text-primary text-white'
                : 'bg-white/80 text-fibi-muted border border-gray-200'
            }`}
            aria-current={step === i ? 'step' : undefined}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function TravelBoardMock() {
  return (
    <div className="rounded-2xl bg-white shadow-soft-md border border-gray-100 overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <p className="text-xs font-medium text-fibi-muted uppercase tracking-wide">Travel board</p>
        <h3 className="text-xl font-semibold text-fibi-text-primary mt-1 font-heading">
          Lisbon long weekend
        </h3>
        <p className="text-sm text-fibi-muted mt-0.5">6 places · Ready to send to friends</p>
      </div>
      <div
        className="h-36 sm:h-44 relative"
        style={{
          background: 'linear-gradient(145deg, #BEE9FF 0%, #E8F4F8 40%, #F2C879 100%)',
        }}
      >
        {[
          { top: '28%', left: '42%' },
          { top: '45%', left: '55%' },
          { top: '38%', left: '30%' },
          { top: '58%', left: '48%' },
        ].map((pin, i) => (
          <span
            key={i}
            className="absolute w-3 h-3 rounded-full bg-fibi-primary border-2 border-white shadow-sm"
            style={{ top: pin.top, left: pin.left }}
          />
        ))}
      </div>
      <ul className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
        {DEMO_PLACES.map((place) => (
          <li key={place.name} className="px-5 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-fibi-text-primary">{place.name}</p>
              <p className="text-xs text-fibi-muted">{place.city}</p>
            </div>
            <span className="text-xs text-fibi-muted shrink-0">{place.category}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HeroPasteSave() {
  const [url, setUrl] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) {
      router.push('/add')
      return
    }
    router.push(`/add?url=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto lg:mx-0 space-y-3">
      <label htmlFor="hero-url" className="sr-only">
        Paste a travel link
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="hero-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a TikTok, Instagram or web link"
          className="flex-1 px-4 py-3.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-fibi-primary/30 focus:border-fibi-primary"
        />
        <button
          type="submit"
          className="bg-fibi-gradient-cta text-white px-6 py-3.5 rounded-lg font-medium hover:opacity-95 transition-all shadow-md whitespace-nowrap"
        >
          Save
        </button>
      </div>
      <p className="text-xs text-fibi-muted text-center lg:text-left">
        No account needed to start.
      </p>
    </form>
  )
}

export default function LandingPage({
  teaserGuides = [],
}: {
  teaserGuides?: GuideCard[]
}) {
  const { isInstallable, promptInstall } = usePWAInstall()
  const [showShareTip, setShowShareTip] = useState(false)

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isInstallable) {
      await promptInstall()
    } else {
      window.location.href = '/how-to'
    }
  }

  return (
    <div className="min-h-screen bg-fibi-bg-light text-fibi-text-primary">
      <header className="border-b border-gray-200/60 sticky top-0 z-30 bg-fibi-bg-light/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/FIBI Logo.png" alt="FIBI" className="h-8 w-auto" />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-fibi-muted hover:text-fibi-text-primary transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 90% 70% at 75% 15%, rgba(46,155,214,0.18), transparent 55%), radial-gradient(ellipse 60% 50% at 10% 85%, rgba(242,199,121,0.16), transparent 50%)',
            }}
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-20 lg:pt-20 lg:pb-28">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <div className="space-y-6 text-center lg:text-left order-2 lg:order-1">
                <div className="flex items-center justify-center lg:justify-start gap-3">
                  <img src="/FIBI Logo.png" alt="" className="h-10 w-auto sm:h-12" />
                  <span className="text-3xl sm:text-4xl font-semibold font-heading tracking-tight text-fibi-text-primary">
                    FIBI
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-fibi-text-primary leading-[1.15] text-balance">
                  See it. Save it. Go there.
                </h1>
                <p className="text-base sm:text-lg text-fibi-muted leading-relaxed max-w-md mx-auto lg:mx-0">
                  Your private travel memory, built from everywhere you browse — TikTok,
                  Instagram and the web.
                </p>
                <HeroPasteSave />
                <p className="text-sm text-fibi-muted">
                  Or{' '}
                  <a href="#how" className="text-fibi-primary hover:underline">
                    see how FIBI works
                  </a>
                  .
                </p>
              </div>

              <div className="order-1 lg:order-2 pb-8 sm:pb-10">
                <ProductDemo />
              </div>
            </div>
          </div>
        </section>

        <section className="relative border-t border-gray-100/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
            <div className="max-w-xl mb-10 text-center mx-auto space-y-3">
              <h2 className="text-2xl lg:text-3xl text-fibi-text-primary">
                Places you already found, kept properly.
              </h2>
              <p className="text-fibi-muted leading-relaxed">
                That café you saved. The beach you meant to visit. All in one calm library — with a map when you need it.
              </p>
            </div>
          </div>
          <div className="relative w-full overflow-hidden bg-[#d4cfc8]">
            <img
              src="/hero-image.png"
              alt="Saved travel places organised in FIBI"
              className="w-full h-auto max-h-[70vh] object-cover object-center"
            />
          </div>
        </section>

        <section className="border-t border-gray-100 py-16 lg:py-20 bg-white/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1 max-w-md mx-auto w-full">
                <TravelBoardMock />
              </div>
              <div className="order-1 lg:order-2 space-y-4 text-center lg:text-left">
                <h2 className="text-2xl lg:text-3xl text-fibi-text-primary">
                  Send a board to friends when you&apos;re ready.
                </h2>
                <p className="text-fibi-muted leading-relaxed max-w-md mx-auto lg:mx-0">
                  Travel boards stay private by default. When a collection is useful, share it by
                  link — for companions, not for scrolling strangers.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 py-16 lg:py-20 bg-white/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-xl mx-auto text-center space-y-3 mb-10">
              <h2 className="text-2xl lg:text-3xl text-fibi-text-primary">
                Looking for inspiration?
              </h2>
              <p className="text-fibi-muted leading-relaxed">
                Explore travel guides created by FIBI, then save the places you love straight into
                your own Travel Boards.
              </p>
            </div>

            {teaserGuides.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                {teaserGuides.slice(0, 4).map((g) => (
                  <GuideCardLink key={g.id} guide={g} />
                ))}
              </div>
            ) : null}

            <div className="text-center">
              <Link
                href="/travel-guides"
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-fibi-text-primary text-white hover:opacity-90"
              >
                Explore Travel Guides
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-xl mx-auto text-center space-y-3 mb-10">
              <h2 className="text-2xl lg:text-3xl text-fibi-text-primary">
                See everything you&apos;ve saved on a map.
              </h2>
              <p className="text-fibi-muted leading-relaxed">
                Pins for places with a location. A list when you want the detail.
              </p>
            </div>
            <div
              className="relative h-56 sm:h-72 rounded-2xl overflow-hidden border border-gray-100 shadow-soft"
              style={{
                background:
                  'linear-gradient(160deg, #BEE9FF 0%, #E8F4F8 35%, #F7F8FA 70%, #F2C879 100%)',
              }}
            >
              {[
                { top: '28%', left: '18%', label: 'Lisbon' },
                { top: '42%', left: '48%', label: 'Rome' },
                { top: '35%', left: '72%', label: 'Tokyo' },
                { top: '58%', left: '32%', label: 'Marrakech' },
              ].map((pin) => (
                <div
                  key={pin.label}
                  className="absolute flex flex-col items-center"
                  style={{ top: pin.top, left: pin.left }}
                >
                  <span className="block w-3 h-3 rounded-full bg-fibi-primary border-2 border-white shadow-sm" />
                  <span className="mt-1 block text-[10px] font-medium text-fibi-text-primary bg-white/90 px-1.5 py-0.5 rounded shadow-soft">
                    {pin.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-24 border-t border-gray-100 py-16 lg:py-20 bg-white/60">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-10">
            <div className="space-y-3">
              <h2 className="text-2xl lg:text-3xl text-fibi-text-primary">
                See it → Save it → Go there.
              </h2>
              <p className="text-fibi-muted">
                TikTok or Instagram to FIBI to an organised place — then a trip or map when you need it.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-2">
              {[
                { n: '01', t: 'See it', d: 'Somewhere you love' },
                { n: '02', t: 'Save it', d: 'Paste or share to FIBI' },
                { n: '03', t: 'Go there', d: 'Map, trip, board' },
              ].map((step, i) => (
                <div key={step.n} className="flex items-center gap-2 sm:gap-3">
                  <div
                    className="w-44 sm:w-40 rounded-xl bg-white border border-gray-100 shadow-soft px-4 py-5 text-center landing-float"
                    style={{ animationDelay: `${i * 0.25}s` }}
                  >
                    <p className="text-xs font-medium text-fibi-primary mb-1">{step.n}</p>
                    <p className="text-base font-semibold text-fibi-text-primary">{step.t}</p>
                    <p className="text-xs text-fibi-muted mt-1">{step.d}</p>
                  </div>
                  {i < 2 && (
                    <span className="hidden sm:inline text-fibi-muted text-lg" aria-hidden>
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowShareTip((v) => !v)}
                className="text-sm font-medium text-fibi-primary hover:underline"
                aria-expanded={showShareTip}
              >
                How to save from Instagram &amp; TikTok
              </button>
              {showShareTip && (
                <div className="max-w-md mx-auto text-left text-sm text-fibi-muted leading-relaxed bg-white border border-gray-100 rounded-xl p-4 shadow-soft space-y-2">
                  <p>
                    Install FIBI to your home screen. Next time you find a place, tap Share and
                    choose FIBI.
                  </p>
                  <p>Or paste a URL above. Same result, either way.</p>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="text-fibi-primary font-medium hover:underline"
                  >
                    How to install
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 py-16 lg:py-24">
          <div className="max-w-xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <h2 className="text-2xl lg:text-3xl text-fibi-text-primary text-balance">
              Start with one place.
            </h2>
            <p className="text-fibi-muted">
              Create an account when you want your places kept for good.
            </p>
            <Link
              href="/add"
              className="inline-block bg-fibi-gradient-cta text-white px-8 py-3.5 rounded-lg font-medium hover:opacity-95 transition-all shadow-md"
            >
              Save a place
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter showSignIn />
    </div>
  )
}
