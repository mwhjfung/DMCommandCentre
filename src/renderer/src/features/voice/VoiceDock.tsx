import { useEffect, useRef, useState } from 'react'
import { Radio, Trash2, X, Loader2, Mic, MicOff, Eraser } from 'lucide-react'
import { useUiStore } from '@/lib/store/uiStore'
import { useVoiceStore } from '@/lib/store/voiceStore'
import { useContentStore } from '@/lib/store/contentStore'
import { KeywordCard } from './KeywordCard'
import { TranscriptView, type HitSwapTarget } from './TranscriptView'
import { HitPopover } from './HitPopover'
import { cn } from '@/lib/cn'

function CorrectionsPopover({ onClose }: { onClose: () => void }): JSX.Element {
  const aliases = useVoiceStore((s) => s.aliases)
  const removeAlias = useVoiceStore((s) => s.removeAlias)
  const items = useContentStore((s) => s.items)
  const ref = useRef<HTMLDivElement>(null)

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

  const entries = Object.entries(aliases)
  const entryName = (id: string): string => items.find((i) => i.id === id)?.name ?? '(removed)'

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-surface p-2 shadow-2xl"
    >
      <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        Learned corrections
      </p>
      {entries.length === 0 ? (
        <p className="px-1 py-2 text-xs text-ink-muted">No corrections learned yet.</p>
      ) : (
        <div className="max-h-52 overflow-y-auto">
          {entries.map(([phrase, id]) => (
            <div key={phrase} className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-surface-3">
              <p className="min-w-0 truncate text-xs">
                <span className="text-ink-muted">"{phrase}"</span>
                <span className="mx-1 text-ink-muted">→</span>
                <span className="text-ink">{entryName(id)}</span>
              </p>
              <button
                type="button"
                title="Remove correction"
                onClick={() => removeAlias(phrase)}
                className="shrink-0 text-ink-muted hover:text-danger"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function VoiceDock(): JSX.Element | null {
  const feedOpen = useUiStore((s) => s.feedOpen)
  const setFeedOpen = useUiStore((s) => s.setFeedOpen)

  const status = useVoiceStore((s) => s.status)
  const error = useVoiceStore((s) => s.error)
  const modelProgress = useVoiceStore((s) => s.modelProgress)
  const transcriptLines = useVoiceStore((s) => s.transcriptLines)
  const feed = useVoiceStore((s) => s.feed)
  const clearFeed = useVoiceStore((s) => s.clearFeed)
  const start = useVoiceStore((s) => s.start)
  const stop = useVoiceStore((s) => s.stop)

  const aliases = useVoiceStore((s) => s.aliases)

  // Fraction of the split given to the transcript (top). Default 60/40.
  const [transcriptFraction, setTranscriptFraction] = useState(0.6)
  const [showCorrections, setShowCorrections] = useState(false)
  const [hitSwap, setHitSwap] = useState<HitSwapTarget | null>(null)
  const splitRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Keep the transcript pinned to the newest line as it records.
  useEffect(() => {
    const el = transcriptRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [transcriptLines])

  if (!feedOpen) return null

  const recentTranscript = transcriptLines.slice(-60)
  const listening = status === 'listening'
  const starting = status === 'starting'
  const onAir = (): void => {
    if (listening || starting) void stop()
    else void start()
  }

  const startResize = (e: React.PointerEvent): void => {
    e.preventDefault()
    const container = splitRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const onMove = (ev: PointerEvent): void => {
      const frac = (ev.clientY - rect.top) / rect.height
      setTranscriptFraction(Math.max(0.2, Math.min(frac, 0.85)))
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <aside className="relative flex h-full w-[360px] shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Radio
            size={15}
            className={cn(status === 'listening' ? 'text-accent' : 'text-ink-muted')}
          />
          <span className="text-sm font-semibold text-ink">Voice feed</span>
          {status === 'listening' && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          )}
        </div>
        <button type="button" className="icon-btn" title="Hide feed" onClick={() => setFeedOpen(false)}>
          <X size={16} />
        </button>
      </div>

      {status === 'starting' && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-ink-muted">
          <Loader2 size={13} className="animate-spin" />
          {modelProgress != null ? `Loading speech model — ${modelProgress}%` : 'Starting…'}
        </div>
      )}
      {error && (
        <div className="border-b border-border bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
      )}

      <div ref={splitRef} className="flex min-h-0 flex-1 flex-col">
        {/* transcript (top, ~60%, newest at the bottom, auto-scrolls) */}
        <div style={{ flexGrow: transcriptFraction, flexBasis: 0 }} className="flex min-h-0 flex-col">
          <div className="relative flex shrink-0 items-center justify-between px-3 pt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Transcript
              </span>
              {Object.keys(aliases).length > 0 && (
                <button
                  type="button"
                  title="Learned corrections"
                  onClick={() => setShowCorrections((v) => !v)}
                  className={cn(
                    'inline-flex h-5 w-5 items-center justify-center rounded transition-colors',
                    showCorrections
                      ? 'bg-accent/15 text-accent'
                      : 'text-ink-muted hover:bg-surface-3 hover:text-ink'
                  )}
                >
                  <Eraser size={11} />
                </button>
              )}
            </div>
            <span className="text-[11px] text-ink-muted">Select text to look it up</span>
            {showCorrections && <CorrectionsPopover onClose={() => setShowCorrections(false)} />}
          </div>
          <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-1">
            {recentTranscript.length === 0 ? (
              <p className="text-[13px] text-ink-muted">
                {listening ? 'Listening…' : 'Press the button below to go live.'}
              </p>
            ) : (
              <TranscriptView
              lines={recentTranscript}
              onSwapClick={(target) => setHitSwap(target)}
            />
            )}
          </div>
        </div>

        {/* resize handle */}
        <div
          onPointerDown={startResize}
          className="group flex h-2 shrink-0 cursor-row-resize items-center justify-center border-y border-border bg-bg hover:bg-surface-3"
          title="Drag to resize"
        >
          <span className="h-0.5 w-8 rounded-full bg-border-strong group-hover:bg-accent" />
        </div>

        {/* keywords (bottom, ~40%, newest at the top) */}
        <div style={{ flexGrow: 1 - transcriptFraction, flexBasis: 0 }} className="flex min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between px-3 pb-1 pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Keywords {feed.length > 0 && `· ${feed.length}`}
            </span>
            {feed.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink"
                onClick={clearFeed}
              >
                <Trash2 size={12} />
                Clear
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
            {feed.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-ink-muted">
                Names you say will surface here as cards.
              </p>
            ) : (
              feed.map((hit) => <KeywordCard key={hit.hitId} hit={hit} />)
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onAir}
        className={cn(
          'flex w-full shrink-0 items-center justify-center gap-2 border-t border-border px-3 py-3 text-sm font-semibold transition-colors',
          listening
            ? 'bg-danger/15 text-danger hover:bg-danger/25'
            : 'bg-surface-2 text-ink hover:bg-surface-3'
        )}
      >
        {starting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : listening ? (
          <Mic size={16} />
        ) : (
          <MicOff size={16} />
        )}
        {starting
          ? modelProgress != null
            ? `Loading ${modelProgress}%`
            : 'Starting…'
          : listening
            ? 'Recording live'
            : 'Off air'}
      </button>

      {hitSwap && (
        <HitPopover target={hitSwap} onClose={() => setHitSwap(null)} />
      )}
    </aside>
  )
}
