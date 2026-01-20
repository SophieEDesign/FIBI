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
            <Link href="/" className="flex items-center">
              <img
                src="/FIBI Logo.png"
                alt="FiBi"
                className="h-8 w-auto"
              />
            </Link>
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Text Content */}
              <div className="text-center lg:text-left space-y-6 z-10">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent leading-tight">
                  Save places before you lose them
                </h1>
                <p className="text-xl lg:text-2xl text-gray-700 leading-relaxed">
                  Share from TikTok, Instagram, or any app. Visual previews pull through automatically — or add your own.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                  <Link
                    href="/signup"
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl text-center text-lg"
                  >
                    Get started
                  </Link>
                </div>
                <p className="text-sm text-gray-600 pt-2">
                  Install Fibi to share in one tap
                </p>
              </div>

              {/* Hero Image */}
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 via-cyan-400 to-blue-600 shadow-2xl">
                  <img
                    src="/hero-image.png"
                    alt="FiBi - Save Your Travel Places"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Video Section - Moved Down */}
        <section className="bg-gradient-to-b from-white to-blue-50/30 py-16 lg:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent mb-4">
                See how it works
              </h2>
              <p className="text-lg text-gray-700">
                Watch how easy it is to save your favorite places
              </p>
            </div>
            <div className="relative">
              <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 via-cyan-400 to-purple-500 shadow-2xl">
                <video
                  src="/FiBi__Save_Places copy.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="w-full h-full object-cover"
                  aria-label="FiBi - Save Places video"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section className="bg-gradient-to-b from-blue-50/30 to-white py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent text-center mb-12 lg:mb-16">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center overflow-hidden shadow-lg">
                  <img
                    src="/1.png"
                    alt="Save it"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Save it
                </h3>
                <p className="text-gray-700">
                  Share a link to FiBi directly from any app or website.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-400 via-amber-400 to-purple-500 rounded-xl flex items-center justify-center overflow-hidden shadow-lg">
                  <img
                    src="/2.png"
                    alt="Make it yours"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Make it yours
                </h3>
                <p className="text-gray-700">
                  Add a screenshot, name, and location to remember why you saved it.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center overflow-hidden shadow-lg">
                  <img
                    src="/3.png"
                    alt="Find it later"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Find it later
                </h3>
                <p className="text-gray-700">
                  Everything is organized in one calm, algorithm-free place for easy access.
                </p>
              </div>
            </div>
            
            {/* Infographic */}
            <div className="mt-16 lg:mt-24">
              <div className="rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200">
                <img
                  src="/unnamed.png"
                  alt="FiBi: Save Your Travel Places - Complete guide"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Purpose Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Purpose Image */}
              <div className="order-2 lg:order-1">
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white">
                  <img
                    src="/Fibi.world.png"
                    alt="Journey from discovery to saved place"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Text Content */}
              <div className="order-1 lg:order-2 space-y-8">
                <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
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
                      Add screenshots and locations so you remember why you saved it and where it is.
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
        <section className="bg-gradient-to-r from-blue-50 via-cyan-50/50 to-blue-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-700 max-w-2xl mx-auto">
              Share from TikTok, Instagram, or any app. Fibi automatically pulls through a visual preview — or add your own.
            </p>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                Ready to start saving?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link
                  href="/login"
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
                >
                  Sign in to start saving
                </Link>
                <button
                  onClick={handleInstallClick}
                  className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-md hover:shadow-lg"
                >
                  Install the app
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Fibi. Save places before you lose them.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/login"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

