'use client'

import { RefObject } from 'react'
import LinkPreview from '@/components/LinkPreview'

interface ScreenshotUploadSectionProps {
  url: string
  thumbnailUrl: string
  screenshotUrl: string | null
  description: string
  fileInputRef: RefObject<HTMLInputElement | null>
  onScreenshotUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploadingScreenshot: boolean
}

export default function ScreenshotUploadSection({
  url,
  thumbnailUrl,
  screenshotUrl,
  description,
  fileInputRef,
  onScreenshotUpload,
  uploadingScreenshot,
}: ScreenshotUploadSectionProps) {
  if (!url.trim() || screenshotUrl) return null

  return (
    <div className="mb-6">
      <LinkPreview
        url={url}
        ogImage={thumbnailUrl}
        screenshotUrl={screenshotUrl}
        description={description}
      />
      <div className="mt-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={onScreenshotUpload}
          className="hidden"
          id="screenshot-upload"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingScreenshot}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadingScreenshot ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add your own screenshot
            </>
          )}
        </button>
        <p className="mt-2 text-xs text-gray-600">
          Some apps don&apos;t share previews. A screenshot helps keep the context.
        </p>
      </div>
    </div>
  )
}
