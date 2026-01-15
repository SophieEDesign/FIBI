'use client'

import Link from 'next/link'

export default function HowToUse() {
  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How to use FiBi
          </h1>
          <p className="text-lg text-gray-600">
            Learn how to save and organize your travel places with FiBi
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Introduction */}
          <section>
            <p className="text-gray-700 leading-relaxed mb-6">
              FiBi is a personal, algorithm-free library to organise travel inspiration found on social media and the web, providing a simple way to save links with context.
            </p>
          </section>

          {/* The Problem It Solves */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              The Problem It Solves
            </h2>
            <div className="bg-gray-50 rounded-lg p-6 md:p-8 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                No More Lost Links
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Stop losing track of restaurants and destinations from your chaotic social media feeds. That restaurant you saw on Instagram? That beach from TikTok? Save it before it disappears from your feed.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 md:p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Your Context, Your Way
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Save screenshots and locations so you always remember why a place was important. Add screenshots and locations so you remember why you saved it and where it is.
              </p>
            </div>
          </section>

          {/* How It Works - 3 Steps */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
              How It Works in 3 Simple Steps
            </h2>
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="border-l-4 border-blue-500 pl-6 md:pl-8 py-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                    <img
                      src="/1.png"
                      alt="Step 1"
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-gray-900">
                    Step 1: Save It
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed ml-16 md:ml-0">
                  Share a link directly to the FiBi app from anywhere (TikTok, Instagram, web). Just click share from the app. FiBi automatically pulls through a visual preview.
                </p>
                <div className="mt-4 ml-16 md:ml-0">
                  <Link
                    href="/app/add"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center gap-1"
                  >
                    Try adding a place →
                  </Link>
                </div>
              </div>

              {/* Step 2 */}
              <div className="border-l-4 border-yellow-500 pl-6 md:pl-8 py-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center justify-center flex-shrink-0">
                    <img
                      src="/2.png"
                      alt="Step 2"
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-gray-900">
                    Step 2: Make It Yours
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed ml-16 md:ml-0">
                  Add a screenshot, custom name, and location to your saved item. Optional: add your own screenshot. Name it and choose a location.
                </p>
              </div>

              {/* Step 3 */}
              <div className="border-l-4 border-red-500 pl-6 md:pl-8 py-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                    <img
                      src="/3.png"
                      alt="Step 3"
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-gray-900">
                    Step 3: Find It Later
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed ml-16 md:ml-0">
                  Access all your saved places, neatly organised in one calm, quiet app. Everything organised in one calm place.
                </p>
                <div className="mt-4 ml-16 md:ml-0">
                  <Link
                    href="/app"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center gap-1"
                  >
                    View your places →
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Features
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  📍 Map View
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  See all your saved places on an interactive map to visualize where everything is located.
                </p>
                <Link
                  href="/app/map"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-3 inline-block"
                >
                  Open Map →
                </Link>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  📅 Planner
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Organize your trips with the calendar view and plan your visits to saved places.
                </p>
                <Link
                  href="/app/calendar"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-3 inline-block"
                >
                  Open Planner →
                </Link>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🏷️ Categories & Status
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Organize places with custom categories and track their status (wishlist, visited, etc.).
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  📸 Screenshots
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Add your own screenshots to remember why you saved a place and what it looks like.
                </p>
              </div>
            </div>
          </section>

          {/* Infographic */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Visual Guide
            </h2>
            <div className="rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200">
              <img
                src="/unnamed.png"
                alt="FiBi: Save Your Travel Places - Complete guide"
                className="w-full h-auto object-contain"
              />
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gray-900 rounded-lg p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-gray-300 mb-6">
              Start saving your favorite places now
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/app/add"
                className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Add Your First Place
              </Link>
              <Link
                href="/app"
                className="bg-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors border border-gray-700"
              >
                View Your Places
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

