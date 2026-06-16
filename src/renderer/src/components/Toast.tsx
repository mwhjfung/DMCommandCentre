import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useUiStore } from '@/lib/store/uiStore'

export function Toast(): JSX.Element | null {
  const drawerMsg = useUiStore((s) => s.drawerToast)
  const dismissDrawer = useUiStore((s) => s.dismissToast)
  const appMsg = useUiStore((s) => s.appToast)
  const hideApp = useUiStore((s) => s.hideToast)

  useEffect(() => {
    if (!drawerMsg) return
    const t = setTimeout(dismissDrawer, 5000)
    return () => clearTimeout(t)
  }, [drawerMsg, dismissDrawer])

  useEffect(() => {
    if (!appMsg) return
    const t = setTimeout(hideApp, 4000)
    return () => clearTimeout(t)
  }, [appMsg, hideApp])

  if (!drawerMsg && !appMsg) return null

  return createPortal(
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2">
      {/* accent toast — rest / action feedback */}
      {appMsg && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-2xl">
          <span>{appMsg}</span>
          <button
            type="button"
            className="ml-1 shrink-0 rounded-full p-0.5 opacity-70 hover:opacity-100"
            onClick={hideApp}
          >
            <X size={13} />
          </button>
        </div>
      )}
      {/* neutral drawer-overflow toast */}
      {drawerMsg && (
        <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink shadow-2xl">
          <span>{drawerMsg}</span>
          <button type="button" className="icon-btn -mr-1 shrink-0" onClick={dismissDrawer} title="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
    </div>,
    document.body
  )
}
