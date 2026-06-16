import { X, ChevronRight, Pin } from 'lucide-react'
import { TypeBadge } from '@/components/ContentBadge'
import { useContentStore } from '@/lib/store/contentStore'
import { useUiStore } from '@/lib/store/uiStore'
import { useVoiceStore, type KeywordHit } from '@/lib/store/voiceStore'
import { normalize } from '@/lib/keywords'
import { cn } from '@/lib/cn'

function ago(at: number): string {
  const mins = Math.floor((Date.now() - at) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}

export function KeywordCard({ hit }: { hit: KeywordHit }): JSX.Element {
  const entry = useContentStore((s) => s.items.find((i) => i.id === hit.contentId))
  const pinned = useContentStore((s) => s.pinnedIds.includes(hit.contentId))
  const togglePin = useContentStore((s) => s.togglePin)
  const openDrawer = useUiStore((s) => s.openDrawer)
  const dismiss = useVoiceStore((s) => s.dismiss)

  const heardDifferent =
    hit.matched && normalize(hit.matched) !== normalize(hit.term)

  return (
    <div className="panel animate-feed-in p-2.5">
      <div className="flex items-center justify-between gap-2">
        <TypeBadge type={hit.type} />
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-ink-muted">{ago(hit.at)}</span>
          <button
            type="button"
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded hover:bg-surface-3',
              pinned ? 'text-accent' : 'text-ink-muted hover:text-ink'
            )}
            title={pinned ? 'Unpin from board' : 'Pin to board'}
            onClick={() => togglePin(hit.contentId)}
          >
            <Pin size={13} className={pinned ? 'fill-accent' : ''} />
          </button>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-surface-3 hover:text-ink"
            title="Dismiss"
            onClick={() => dismiss(hit.hitId)}
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => openDrawer(hit.contentId)}
        className="group mt-1.5 block w-full text-left"
      >
        <div className="flex items-center gap-1">
          <h4 className="truncate font-medium text-ink">{entry?.name ?? hit.term}</h4>
          <ChevronRight
            size={14}
            className="shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
        {entry?.summary && <p className="line-clamp-2 text-sm text-ink-muted">{entry.summary}</p>}
        {heardDifferent && (
          <p className="mt-0.5 text-[11px] italic text-ink-muted">heard “{hit.matched}”</p>
        )}
      </button>
    </div>
  )
}
