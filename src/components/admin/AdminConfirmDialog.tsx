'use client'

interface AdminConfirmDialogProps {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function AdminConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 transition-opacity duration-[280ms]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-confirm-title"
    >
      <div className="w-full max-w-md rounded-[14px] border border-[#E5E5E5] bg-white p-6 shadow-[0_1px_2px_rgba(26,26,24,0.06),0_12px_40px_rgba(46,70,120,0.12)]">
        <h2 id="admin-confirm-title" className="text-lg font-semibold text-[#17181A]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5C574C]">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#5C574C] transition-opacity duration-[130ms] hover:bg-[#F5F2EC] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity duration-[130ms] disabled:opacity-50 ${
              danger ? 'bg-[#9C3226] hover:opacity-90' : 'bg-[#2E9EE8] hover:opacity-90'
            }`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
