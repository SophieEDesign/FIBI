'use client'

interface CreateItineraryModalProps {
  isOpen: boolean
  name: string
  onNameChange: (name: string) => void
  creating: boolean
  onCreate: () => void
  onClose: () => void
}

export default function CreateItineraryModal({
  isOpen,
  name,
  onNameChange,
  creating,
  onCreate,
  onClose,
}: CreateItineraryModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Start a new trip</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="trip-name" className="block text-sm font-medium text-gray-700 mb-2">
              Trip name
            </label>
            <input
              id="trip-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  onCreate()
                }
              }}
              placeholder="e.g., Weekend Trip, Italy Ideas"
              className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCreate}
              disabled={!name.trim() || creating}
              className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating…' : 'Start trip'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
