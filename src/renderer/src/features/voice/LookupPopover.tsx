import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Plus, Search } from 'lucide-react'
import { useContentStore } from '@/lib/store/contentStore'
import { useUiStore } from '@/lib/store/uiStore'
import { useVoiceStore } from '@/lib/store/voiceStore'
import { fuzzyFind } from '@/lib/keywords'
import { TypeBadge } from '@/components/ContentBadge'

interface LookupPopoverProps {
  word: string
  anchor: DOMRect
  /** Set when the selection sits within a single transcript line (enables correction). */
  lineId?: string | null
  onClose: () => void
}

export function LookupPopover({ word, anchor, lineId, onClose }: LookupPopoverProps): JSX.Element {
  const items = useContentStore((s) => s.visibleItems)
  const openDrawer = useUiStore((s) => s.openDrawer)
  const surfaceContent = useVoiceStore((s) => s.surfaceContent)
  const applyCorrection = useVoiceStore((s) => s.applyCorrection)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(word)

  const candidates = useMemo(() => fuzzyFind(items, query, 8), [items, query])

  const pick = (contentId: string): void => {
    // Correction always uses the originally-selected word, not the refined query.
    if (lineId) applyCorrection(lineId, word, contentId)
    else surfaceContent(contentId)
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
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const width = 300
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8))
  const top = Math.min(anchor.bottom + 6, window.innerHeight - 320)

  return (
    <div ref={ref} style={{ position: 'fixed', left, top, width }} className="panel z-50 p-2 shadow-2xl">
      <div className="flex items-center gap-1 pb-1.5">
        <div className="relative flex-1">
          <Search
            size={13}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && candidates[0]) pick(candidates[0].id)
            }}
            placeholder="Search the library…"
            className="input h-7 pl-7 text-sm"
          />
        </div>
        <button type="button" className="icon-btn h-7 w-7 shrink-0" onClick={onClose}>
          <X size={13} />
        </button>
      </div>

      {candidates.length === 0 ? (
        <p className="px-1 py-2 text-xs leading-relaxed text-ink-muted">
          {query.trim()
            ? "Nothing close in your library. Iconic monsters like beholders aren't in the SRD — you'll be able to add it as a custom entry shortly."
            : 'Type to search your library.'}
        </p>
      ) : (
        <>
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c.id)}
                title={lineId ? 'Correct transcript, learn it, add to feed' : 'Add to feed and open'}
                className="group flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-surface-3"
              >
                <TypeBadge type={c.type} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.name}</span>
                <Plus
                  size={14}
                  className="shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100"
                />
              </button>
            ))}
          </div>
          <p className="px-1 pt-1.5 text-[10px] text-ink-muted">
            {lineId
              ? 'Corrects the transcript, learns it for next time, and adds to the feed'
              : 'Adds to the Keywords feed'}
          </p>
        </>
      )}
    </div>
  )
}
