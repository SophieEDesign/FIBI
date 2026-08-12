'use client'

/**
 * Capture-first homepage — calm composition around paste-to-save and public guides.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import SiteFooter from '@/components/SiteFooter'
import GuideCardLink from '@/components/guides/GuideCardLink'
import { Button } from '@/components/ui/Button'
import type { GuideCard } from '@/lib/travel-guides-shared'

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
          className="flex-1 px-4 py-3.5 rounded-full border border-[color:var(--border-subtle)] bg-white text-sm focus:outline-none focus:border-[color:var(--border-brand)] focus:shadow-[var(--focus-ring)]"
        />
        <button
          type="submit"
          className="bg-accent text-white px-6 py-3.5 rounded-full font-medium hover:bg-accent-hover transition-colors duration-fast shadow-soft whitespace-nowrap"
        >
          Save it
        </button>
      </div>
      <p className="text-xs text-fibi-muted text-center lg:text-left">
        No account for the first ten saves.
      </p>
    </form>
  )
}

function FilledPlacePayoff() {
  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-soft">
      <div className="relative aspect-[4/3]">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <p className="text-xs font-medium text-fibi-muted uppercase tracking-wide">Food hall · Lisbon</p>
        <h3 className="text-lg font-semibold text-fibi-text-primary mt-1">Time Out Market</h3>
        <p className="text-sm text-fibi-muted mt-1">Saved without leaving TikTok</p>
      </div>
    </div>
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
      <header className="border-b border-[color:var(--border-subtle)] sticky top-0 z-30 bg-[color:var(--surface-glass)] backdrop-blur-[18px] backdrop-saturate-150">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/FIBI Logo.png" alt="FIBI" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/travel-guides"
              className="text-sm font-medium text-fibi-muted hover:text-fibi-text-primary transition-colors"
            >
              Guides
            </Link>
            <Link
              href="#how"
              className="text-sm font-medium text-fibi-muted hover:text-fibi-text-primary transition-colors hidden sm:inline"
            >
              How it works
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-fibi-muted hover:text-fibi-text-primary transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-gray-100/80 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div className="space-y-6 text-center lg:text-left">
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
                  The restaurant you saw on TikTok, findable in September. Share a post to FIBI and
                  it becomes a place — named, pinned, filed under the city.
                </p>
                <HeroPasteSave />
                <p className="text-sm text-fibi-muted">
                  <Link href="/travel-guides" className="text-fibi-primary hover:underline">
                    Read a guide first
                  </Link>
                  {' · '}
                  Works on iPhone and Android
                </p>
              </div>
              <div className="flex justify-center">
                <FilledPlacePayoff />
              </div>
            </div>
          </div>
        </section>

        {/* Public guides */}
        <section className="py-16 lg:py-20 bg-fibi-bg-light">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-xl mb-10 space-y-3">
              <h2 className="text-2xl lg:text-3xl text-fibi-text-primary">
                Guides people made from their own saves
              </h2>
              <p className="text-fibi-muted leading-relaxed">
                Open any of them without an account. Keep one and it lands in your places.
              </p>
            </div>

            {teaserGuides.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                {teaserGuides.slice(0, 3).map((g) => (
                  <GuideCardLink key={g.id} guide={g} />
                ))}
              </div>
            ) : null}

            <Link
              href="/travel-guides"
              className="text-sm font-medium text-fibi-primary hover:underline"
            >
              All guides →
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 py-16 lg:py-20 border-t border-gray-100 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl lg:text-3xl text-fibi-text-primary text-center mb-10">
              Three taps, then never again
            </h2>
            <ol className="space-y-8">
              {[
                {
                  title: 'Share the post',
                  body: 'Hit share in TikTok, Instagram or anywhere else and pick FIBI. You stay where you were.',
                },
                {
                  title: 'We work out the place',
                  body: 'Name, category, city and map pin come from the post. Add a note only if you want one.',
                },
                {
                  title: 'Find it by city',
                  body: 'Your saves group themselves into cities on a map, so the Lisbon list is waiting when you land.',
                },
              ].map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fibi-blue-light text-sm font-semibold text-fibi-primary">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-fibi-text-primary">{step.title}</h3>
                    <p className="text-fibi-muted mt-1 leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setShowShareTip((v) => !v)}
                className="text-sm font-medium text-fibi-primary hover:underline"
                aria-expanded={showShareTip}
              >
                How to save from Instagram &amp; TikTok
              </button>
              {showShareTip && (
                <div className="mt-4 max-w-md mx-auto text-left text-sm text-fibi-muted leading-relaxed bg-fibi-bg-light border border-gray-100 rounded-xl p-4 space-y-2">
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

        {/* Publish tease */}
        <section className="py-16 lg:py-20 border-t border-gray-100 bg-fibi-bg-light">
          <div className="max-w-xl mx-auto px-4 sm:px-6 text-center space-y-4">
            <h2 className="text-2xl lg:text-3xl text-fibi-text-primary">
              Turn a city&apos;s worth of saves into a guide worth sending
            </h2>
            <p className="text-fibi-muted leading-relaxed">
              One switch makes a collection public: a clean page with a map, your notes and your
              name on it. Friends open it without an account.
            </p>
            <Button href="/signup" size="sm">
              Start saving
            </Button>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 lg:py-20 border-t border-gray-100 bg-white">
          <div className="max-w-xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <h2 className="text-2xl lg:text-3xl text-fibi-text-primary text-balance">
              Start with one place. Bring the other 199 later.
            </h2>
            <p className="text-fibi-muted">
              Paste a link and see it turn into a place. Add FIBI to your home screen so it shows up
              in the share sheet.
            </p>
            <Button href="/add" size="lg" variant="gradient">
              Save a place
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter showSignIn />
    </div>
  )
}
