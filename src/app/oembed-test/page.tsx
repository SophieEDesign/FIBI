'use client'

import { useState } from 'react'
import LinkPreview from '@/components/LinkPreview'

/**
 * Test page for Meta oEmbed verification
 * This page demonstrates how FiBi uses Instagram oEmbed to display rich previews
 */
export default function OEmbedTestPage() {
  const [testUrl, setTestUrl] = useState('')
  const [oembedResult, setOembedResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Example Instagram URLs for testing
  const exampleUrls = [
    'https://www.instagram.com/p/Cx123456789/', // Replace with actual public Instagram post
    'https://www.instagram.com/reel/Cx123456789/', // Replace with actual public Instagram reel
  ]

  const testOEmbed = async (url: string) => {
    setLoading(true)
    setError(null)
    setOembedResult(null)

    try {
      // Test GET endpoint (standard oEmbed format)
      const response = await fetch(
        `/api/oembed?url=${encodeURIComponent(url)}&format=json`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setOembedResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch oEmbed data')
      console.error('oEmbed test error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            FiBi oEmbed Test Page
          </h1>
          <p className="text-gray-600 mb-4">
            This page demonstrates how FiBi uses Instagram oEmbed API to display
            rich previews of Instagram content. This is for Meta App Review verification.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 mb-2">oEmbed Endpoint</h2>
            <code className="text-sm text-blue-800 break-all">
              GET /api/oembed?url={'{instagram_url}'}&format=json
            </code>
          </div>
        </div>

        {/* Test Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Test oEmbed Endpoint
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <button
                  onClick={() => testOEmbed(testUrl)}
                  disabled={!testUrl || loading}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Example URLs (click to test)
              </label>
              <div className="space-y-2">
                {exampleUrls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTestUrl(url)
                      testOEmbed(url)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                  >
                    {url}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {oembedResult && (
          <div className="space-y-6">
            {/* oEmbed Response */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                oEmbed Response
              </h2>
              <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-sm">
                {JSON.stringify(oembedResult, null, 2)}
              </pre>
            </div>

            {/* Preview Display */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Preview Display (How it appears in FiBi)
              </h2>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <LinkPreview
                  url={testUrl}
                  ogImage={oembedResult.thumbnail_url}
                  description={oembedResult.title || oembedResult.caption_text}
                />
              </div>
            </div>

            {/* oEmbed HTML Embed (if available) */}
            {oembedResult.html && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Embedded Content (oEmbed HTML)
                </h2>
                <div
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  dangerouslySetInnerHTML={{ __html: oembedResult.html }}
                />
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            How It Works
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>
              When a user adds an Instagram URL to FiBi, the app calls the oEmbed
              endpoint
            </li>
            <li>
              The endpoint fetches rich metadata from Instagram via Facebook Graph API
            </li>
            <li>
              The response includes thumbnail, title, author, and embeddable HTML
            </li>
            <li>
              FiBi displays this rich preview to help users identify saved places
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}

