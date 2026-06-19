import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Check } from 'lucide-react'
import { useContentStore } from '@/lib/store/contentStore'
import { useUiStore } from '@/lib/store/uiStore'
import { useVoiceStore } from '@/lib/store/voiceStore'
import { fuzzyFind } from '@/lib/keywords'
import { TypeBadge } from '@/components/ContentBadge'
import type { HitSwapTarget } from './TranscriptView'

interface HitPopoverProps {
  target: HitSwapTarget
  onClose: () => void
}

/** Inline popover (absolute, inside VoiceDock) for re-linking a highlighted transcript word. */
export function HitPopover({ target, onClose }: HitPopoverProps): JSX.Element {
  const { hit, lineId } = target
  const items = useContentStore((s) => s.visibleItems)
  const openDrawer = useUiStore((s) => s.openDrawer)
  const reassignHit = useVoiceStore((s) => s.reassignHit)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(hit.matched)

  const candidates = useMemo(() => fuzzyFind(items, query, 6), [items, query])

  const pick = (contentId: string): void => {
    reassignHit(lineId, hit.matched, contentId)
    openDrawer(contentId)
    onClose()
  }

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div ref={ref} className="panel absolute inset-x-2 top-14 z-20 p-2 shadow-2xl">
      <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        Change link — "{hit.matched}"
      </p>
      <div className="flex items-center gap-1 pb-1.5">
        <div className="relative flex-1">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && candidates[0]) pick(candidates[0].id) }}
            placeholder="Search library…"
            className="input h-7 pl-7 text-sm"
          />
        </div>
        <button type="button" className="icon-btn h-7 w-7 shrink-0" onClick={onClose}>
          <X size={13} />
        </button>
      </div>
      <div className="max-h-52 space-y-0.5 overflow-y-auto">
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => pick(c.id)}
            className="group flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-surface-3"
          >
            <TypeBadge type={c.type} />
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.name}</span>
            {c.id === hit.contentId && <Check size={13} className="shrink-0 text-accent" />}
          </button>
        ))}
        {candidates.length === 0 && (
          <p className="px-1 py-2 text-xs text-ink-muted">Nothing found.</p>
        )}
      </div>
    </div>
  )
}
