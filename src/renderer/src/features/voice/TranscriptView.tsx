import { useMemo, useRef, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { useUiStore } from '@/lib/store/uiStore'
import { normalize } from '@/lib/keywords'
import type { TranscriptLine, TranscriptHit } from '@/lib/store/voiceStore'
import { LookupPopover } from './LookupPopover'

export interface HitSwapTarget {
  hit: TranscriptHit
  lineId: string
}

interface Segment {
  text: string
  space: boolean
  hit?: TranscriptHit
}

/** Split a line into word/space segments, marking which words matched a hit.
 *  Longer (more-specific) matches are assigned first so multi-word entries
 *  can't be overwritten by a shorter sub-word fuzzy hit. */
function segmentLine(text: string, hits: TranscriptHit[]): Segment[] {
  const parts = text.split(/(\s+)/)
  const wordPartIndex: number[] = []
  const normWords: string[] = []
  parts.forEach((p, i) => {
    if (p.trim()) {
      wordPartIndex.push(i)
      normWords.push(normalize(p))
    }
  })

  const sorted = [...hits].sort(
    (a, b) => b.matched.split(' ').length - a.matched.split(' ').length
  )

  const hitByPart = new Map<number, TranscriptHit>()
  for (const hit of sorted) {
    const target = hit.matched.split(' ').filter(Boolean)
    if (!target.length) continue
    for (let w = 0; w + target.length <= normWords.length; w += 1) {
      let ok = true
      for (let k = 0; k < target.length; k += 1) {
        if (normWords[w + k] !== target[k]) { ok = false; break }
      }
      if (ok) {
        for (let k = 0; k < target.length; k += 1) {
          if (!hitByPart.has(wordPartIndex[w + k])) {
            hitByPart.set(wordPartIndex[w + k], hit)
          }
        }
        break
      }
    }
  }

  return parts.map((p, i) => ({ text: p, space: !p.trim(), hit: hitByPart.get(i) }))
}

function LineRow({
  line,
  onSwapClick
}: {
  line: TranscriptLine
  onSwapClick: (target: HitSwapTarget) => void
}): JSX.Element {
  const openDrawer = useUiStore((s) => s.openDrawer)
  const segments = useMemo(() => segmentLine(line.text, line.hits), [line.text, line.hits])

  return (
    <p className="leading-relaxed" data-line-id={line.id}>
      {segments.map((seg, i) => {
        if (seg.space) return <span key={i}>{seg.text}</span>
        if (seg.hit) {
          const hit = seg.hit
          return (
            <span key={i} className="group/hit relative inline-flex items-center">
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  const sel = window.getSelection()
                  if (sel && !sel.isCollapsed) return
                  openDrawer(hit.contentId)
                }}
                title={hit.term}
                className="cursor-pointer rounded-sm bg-accent/15 font-medium text-accent hover:bg-accent/30"
              >
                {seg.text}
              </span>
              <button
                type="button"
                title="Change linked entry"
                onClick={(e) => {
                  e.stopPropagation()
                  onSwapClick({ hit, lineId: line.id })
                }}
                className="ml-0.5 hidden h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-ink-muted hover:text-accent group-hover/hit:inline-flex"
              >
                <ArrowLeftRight size={9} />
              </button>
            </span>
          )
        }
        return <span key={i}>{seg.text}</span>
      })}
    </p>
  )
}

function lineIdOf(node: Node): string | null {
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)
  return el?.closest('[data-line-id]')?.getAttribute('data-line-id') ?? null
}

export function TranscriptView({
  lines,
  onSwapClick
}: {
  lines: TranscriptLine[]
  onSwapClick: (target: HitSwapTarget) => void
}): JSX.Element {
  const [lookup, setLookup] = useState<{
    text: string
    rect: DOMRect
    lineId: string | null
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const onMouseUp = (): void => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const text = sel.toString().trim()
    if (!text || text.length > 80) return
    const range = sel.getRangeAt(0)
    if (!containerRef.current?.contains(range.commonAncestorContainer)) return
    const startLine = lineIdOf(range.startContainer)
    const endLine = lineIdOf(range.endContainer)
    const lineId = startLine && startLine === endLine ? startLine : null
    setLookup({ text, rect: range.getBoundingClientRect(), lineId })
  }

  return (
    <>
      <div ref={containerRef} onMouseUp={onMouseUp} className="space-y-1 text-[13px] text-ink-muted">
        {lines.map((line) => (
          <LineRow key={line.id} line={line} onSwapClick={onSwapClick} />
        ))}
      </div>
      {lookup && (
        <LookupPopover
          word={lookup.text}
          anchor={lookup.rect}
          lineId={lookup.lineId}
          onClose={() => setLookup(null)}
        />
      )}
    </>
  )
}
