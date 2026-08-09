'use client'

import type { ConditionsForm } from '@/lib/email-conditions'

interface AudienceConditionsFormProps {
  value: ConditionsForm
  onChange: (next: ConditionsForm) => void
  disabled?: boolean
}

/**
 * Full filter set for segments / automations / one-off audience.
 * Always ANDed with marketing_opt_in on the server.
 */
export default function AudienceConditionsForm({
  value,
  onChange,
  disabled,
}: AudienceConditionsFormProps) {
  const set = (patch: Partial<ConditionsForm>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-gray-500">
        Recipients always require marketing opt-in. Leave a field blank to ignore it.
      </p>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.confirmed === true}
          disabled={disabled}
          onChange={(e) => set({ confirmed: e.target.checked ? true : null })}
        />
        <span>Email confirmed</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-gray-700">Places count &gt;</span>
          <input
            type="number"
            min={0}
            value={value.places_count_gt ?? ''}
            disabled={disabled}
            onChange={(e) =>
              set({ places_count_gt: e.target.value === '' ? null : Number(e.target.value) })
            }
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
            placeholder="e.g. 0"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Places count &lt;</span>
          <input
            type="number"
            min={0}
            value={value.places_count_lt ?? ''}
            disabled={disabled}
            onChange={(e) =>
              set({ places_count_lt: e.target.value === '' ? null : Number(e.target.value) })
            }
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Itineraries count &gt;</span>
          <input
            type="number"
            min={0}
            value={value.itineraries_count_gt ?? ''}
            disabled={disabled}
            onChange={(e) =>
              set({
                itineraries_count_gt: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
            placeholder="e.g. 0"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Inactive days &gt;</span>
          <input
            type="number"
            min={0}
            value={value.last_login_days_gt ?? ''}
            disabled={disabled}
            onChange={(e) =>
              set({
                last_login_days_gt: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
            placeholder="e.g. 7"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Account age days &gt;</span>
          <input
            type="number"
            min={0}
            value={value.created_days_gt ?? ''}
            disabled={disabled}
            onChange={(e) =>
              set({ created_days_gt: e.target.value === '' ? null : Number(e.target.value) })
            }
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Account age days &lt;</span>
          <input
            type="number"
            min={0}
            value={value.created_days_lt ?? ''}
            disabled={disabled}
            onChange={(e) =>
              set({ created_days_lt: e.target.value === '' ? null : Number(e.target.value) })
            }
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
          />
        </label>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.founding_followup_sent === true}
          disabled={disabled}
          onChange={(e) => set({ founding_followup_sent: e.target.checked ? true : null })}
        />
        <span>Founding follow-up already sent</span>
      </label>
    </div>
  )
}
