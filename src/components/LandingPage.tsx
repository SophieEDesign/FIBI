'use client'

import Link from 'next/link'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export default function LandingPage() {
  const { isInstallable, promptInstall } = usePWAInstall()

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isInstallable) {
      await promptInstall()
    } else {
      // Fallback: redirect to login if install not available
      window.location.href = '/login'
    }
  }
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">FiBi</h1>
            <Link
              href="/login"
              className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Content */}
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                Save places before you lose them
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                From TikTok, Instagram, and the web — without the chaos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/login"
                  className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors text-center"
                >
                  Get started
                </Link>
              </div>
              <p className="text-sm text-gray-500 pt-2">
                Install Fibi to share in one tap
              </p>
            </div>

            {/* Graphic Placeholder */}
            <div className="relative">
              <div className="aspect-[4/3] bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400 font-medium">
                    Hero illustration placeholder
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Replace with custom graphic
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section className="bg-gray-50 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-12 lg:mb-16">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">
                      Icon placeholder
                    </p>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Save it
                </h3>
                <p className="text-gray-600">
                  Share a link to Fibi from anywhere.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">
                      Icon placeholder
                    </p>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Make it yours
                </h3>
                <p className="text-gray-600">
                  Add a screenshot, name it, choose a location.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">
                      Icon placeholder
                    </p>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Find it later
                </h3>
                <p className="text-gray-600">
                  Everything organised in one calm place.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Purpose Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Graphic Placeholder */}
              <div className="order-2 lg:order-1">
                <div className="aspect-[4/3] bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-400 font-medium">
                      Purpose illustration placeholder
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Replace with custom graphic
                    </p>
                  </div>
                </div>
              </div>

              {/* Text Content */}
              <div className="order-1 lg:order-2 space-y-8">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                  Why Fibi?
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No more lost links
                    </h3>
                    <p className="text-gray-600">
                      That restaurant you saw on Instagram? That beach from TikTok? Save it before it disappears from your feed.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Your context, your way
                    </h3>
                    <p className="text-gray-600">
                      Add screenshots, notes, and locations so you remember why you saved it and where it is.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Calm and organised
                    </h3>
                    <p className="text-gray-600">
                      No algorithms, no noise. Just your saved places, organised how you want them.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reassurance Line */}
        <section className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-600 max-w-2xl mx-auto">
              Some apps don&apos;t share previews. Fibi helps you save the context instead.
            </p>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Ready to start saving?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link
                  href="/login"
                  className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Sign in to start saving
                </Link>
                <button
                  onClick={handleInstallClick}
                  className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Install the app
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

