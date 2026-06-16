import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useUiStore } from '@/lib/store/uiStore'

/** A single transient message (currently the "too many panels" nudge). */
export function Toast(): JSX.Element | null {
  const msg = useUiStore((s) => s.drawerToast)
  const dismiss = useUiStore((s) => s.dismissToast)

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(dismiss, 5000)
    return () => clearTimeout(t)
  }, [msg, dismiss])

  if (!msg) return null
  return createPortal(
    <div className="fixed bottom-6 left-1/2 z-[80] flex max-w-md -translate-x-1/2 items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink shadow-2xl">
      <span>{msg}</span>
      <button type="button" className="icon-btn -mr-1 shrink-0" onClick={dismiss} title="Dismiss">
        <X size={14} />
      </button>
    </div>,
    document.body
  )
}
