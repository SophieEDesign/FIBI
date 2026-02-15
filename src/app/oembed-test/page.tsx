'use client'

import { useState } from 'react'
import LinkPreview from '@/components/LinkPreview'
import { sanitizeOembedHtml } from '@/lib/sanitize-oembed'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Test page for Meta oEmbed verification
 * This page demonstrates how FiBi uses Instagram oEmbed to display rich previews
 */
export default function OEmbedTestPage() {
  // Example URLs for testing
  const exampleUrls = [
    {
      platform: 'Instagram',
      url: 'https://www.instagram.com/p/Cx123456789/',
      label: 'Instagram Post'
    },
    {
      platform: 'Instagram',
      url: 'https://www.instagram.com/reel/Cx123456789/',
      label: 'Instagram Reel'
    },
    {
      platform: 'TikTok',
      url: 'https://www.tiktok.com/@otherworldescapes/video/7579740659783863574',
      label: 'TikTok Video'
    },
  ]
  
  const [testUrl, setTestUrl] = useState(exampleUrls[1].url) // Pre-fill with reel URL
  const [oembedResult, setOembedResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
            This page demonstrates how FiBi uses oEmbed API to display
            rich previews of Instagram and TikTok content. This is for Meta App Review verification.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 mb-2">oEmbed Endpoint</h2>
            <code className="text-sm text-blue-800 break-all">
              GET /api/oembed?url={'{url}'}&format=json
            </code>
            <p className="text-xs text-blue-700 mt-2">
              Supports Instagram and TikTok URLs
            </p>
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
                Instagram or TikTok URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/... or https://www.tiktok.com/@user/video/..."
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
                {exampleUrls.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTestUrl(example.url)
                      testOEmbed(example.url)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                  >
                    <span className="font-medium">{example.platform}:</span> {example.url}
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

        <div className="space-y-6">
          {/* oEmbed Response */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              oEmbed Response
            </h2>
            <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-sm">
              {oembedResult ? JSON.stringify(oembedResult, null, 2) : '{}'}
            </pre>
            {!oembedResult && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>Note:</strong> The endpoint currently returns an empty response because Meta App Review access has not been granted yet. Once access is approved, the endpoint will return data in the following format:
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-blue-800 hover:text-blue-900">
                    View Expected Response Format
                  </summary>
                  <div className="mt-2 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-blue-900 mb-1">Instagram Example:</p>
                      <pre className="text-xs bg-white border border-blue-200 rounded p-3 overflow-x-auto">
{`{
  "html": "<blockquote class=\\"instagram-media\\" data-instgrm-permalink=\\"...\\" ...></blockquote><script async src=\\"//www.instagram.com/embed.js\\"></script>",
  "thumbnail_url": "https://scontent.cdninstagram.com/v/...",
  "author_name": "instagram_username",
  "title": "Post caption text...",
  "provider_name": "Instagram"
}`}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-900 mb-1">TikTok Example:</p>
                      <pre className="text-xs bg-white border border-blue-200 rounded p-3 overflow-x-auto">
{`{
  "html": "<blockquote class=\\"tiktok-embed\\" data-video-id=\\"7579740659783863574\\" ...></blockquote><script async src=\\"https://www.tiktok.com/embed.js\\"></script>",
  "thumbnail_url": "https://p16-sign-va.tiktokcdn.com/...",
  "author_name": "otherworldescapes",
  "title": "Video caption text...",
  "provider_name": "TikTok",
  "caption_text": "Video caption extracted from HTML"
}`}
                      </pre>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Preview Display */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Preview Display (How it appears in FiBi)
            </h2>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {testUrl ? (
                <LinkPreview
                  url={testUrl}
                  ogImage={oembedResult?.thumbnail_url}
                  description={oembedResult?.title || oembedResult?.caption_text}
                />
              ) : (
                <div className="w-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
                    <p className="text-xs text-gray-600">Preview from Instagram</p>
                  </div>
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-500 mb-3">
                      Preview not available · Add screenshot
                    </p>
                    <a
                      href={testUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 underline"
                    >
                      View original content
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* oEmbed HTML Embed (if available) */}
          {oembedResult?.html && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Embedded Content (oEmbed HTML)
              </h2>
              <div
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                dangerouslySetInnerHTML={{ __html: sanitizeOembedHtml(oembedResult.html) }}
              />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            How It Works
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>
              When a user adds an Instagram or TikTok URL to FiBi, the app calls the oEmbed
              endpoint
            </li>
            <li>
              The endpoint fetches rich metadata from Instagram (via Facebook Graph API) or TikTok (via TikTok oEmbed API)
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

