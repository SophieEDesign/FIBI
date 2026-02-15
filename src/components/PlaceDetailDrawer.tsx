'use client'

import { useEffect, useState, useRef } from 'react'
import { SavedItem } from '@/types/database'
import { getHostname } from '@/lib/utils'
import Link from 'next/link'
import LinkPreview from '@/components/LinkPreview'
import { createClient } from '@/lib/supabase/client'

interface PlaceDetailDrawerProps {
  item: SavedItem
  onClose: () => void
  onItemUpdate?: (item: SavedItem) => void
  isMobile: boolean
  readOnly?: boolean
}

export default function PlaceDetailDrawer({
  item,
  onClose,
  onItemUpdate,
  isMobile,
  readOnly = false,
}: PlaceDetailDrawerProps) {
  const [notesValue, setNotesValue] = useState(item.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()
  const displayTitle = item.title || item.place_name || getHostname(item.url)
  const locationStr =
    item.place_name ||
    item.formatted_address ||
    (item.location_city && item.location_country
      ? `${item.location_city}, ${item.location_country}`
      : item.location_city || item.location_country) ||
    null
  const canEdit = !readOnly && !!onItemUpdate

  useEffect(() => {
    setNotesValue(item.notes ?? '')
  }, [item.id, item.notes])

  const saveNotes = async (value: string) => {
    if (!canEdit) return
    setSavingNotes(true)
    try {
      const { error } = await supabase
        .from('saved_items')
        .update({ notes: value || null })
        .eq('id', item.id)
      if (error) throw error
      onItemUpdate?.({ ...item, notes: value || null })
    } catch (err) {
      console.error('Error saving notes:', err)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleNotesChange = (value: string) => {
    setNotesValue(value)
    if (!canEdit) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveNotes(value), 500)
  }

  const handleNotesBlur = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    if (canEdit) saveNotes(notesValue)
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`fixed z-50 bg-white shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          isMobile
            ? 'inset-x-0 bottom-0 top-[40%] rounded-t-2xl'
            : 'top-0 right-0 bottom-0 w-full max-w-md'
        }`}
      >
        <div className="flex-1 overflow-y-auto relative">
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-semibold text-gray-900 pr-10">{displayTitle}</h2>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {item.screenshot_url || item.thumbnail_url ? (
              <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 -mx-1">
                <img
                  src={item.screenshot_url || item.thumbnail_url || ''}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 -mx-1">
                <LinkPreview
                  url={item.url}
                  ogImage={item.thumbnail_url}
                  screenshotUrl={item.screenshot_url}
                  description={item.description}
                  platform={item.platform}
                  hideLabel
                />
              </div>
            )}
            {locationStr && (
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-gray-700">{locationStr}</p>
              </div>
            )}
            <div>
              <label htmlFor="place-notes" className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes
              </label>
              <textarea
                id="place-notes"
                value={notesValue}
                onChange={(e) => handleNotesChange(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder={canEdit ? 'Add personal notes...' : undefined}
                readOnly={!canEdit}
                rows={4}
                className={`w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none ${
                  !canEdit ? 'bg-gray-50 text-gray-700 cursor-default' : ''
                }`}
              />
              {canEdit && savingNotes && <p className="text-xs text-gray-500 mt-1">Saving…</p>}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 p-5 bg-gray-50 flex gap-3">
          <Link
            href={`/item/${item.id}`}
            className="flex-1 bg-gray-900 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-800 transition-colors text-center"
            onClick={onClose}
          >
            View Full Details
          </Link>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-white transition-colors whitespace-nowrap"
            >
              Open Link
            </a>
          )}
        </div>
      </div>
    </>
  )
}
