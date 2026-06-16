import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export const CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
  'Exhaustion'
]

export function ConditionsCell({
  conditions,
  onChange
}: {
  conditions: string[]
  onChange: (next: string[]) => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [])

  const add = (c: string): void => {
    const v = c.trim()
    if (v && !conditions.includes(v)) onChange([...conditions, v])
  }
  const remove = (c: string): void => onChange(conditions.filter((x) => x !== c))

  return (
    <div ref={ref} className="relative flex flex-wrap items-center gap-1">
      {conditions.map((c) => (
        <span
          key={c}
          className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/15 py-0.5 pl-2 pr-1 text-[11px] text-violet-300"
        >
          {c}
          <button
            type="button"
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-violet-500/30 hover:text-white"
            onClick={() => remove(c)}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-ink-muted hover:border-border-strong hover:text-ink"
        onClick={() => setOpen((o) => !o)}
        title="Add condition"
      >
        <Plus size={12} />
      </button>

      {open && (
        <div className="absolute left-0 top-6 z-30 w-44 rounded-md border border-border bg-surface p-1 shadow-2xl">
          <div className="max-h-48 overflow-y-auto">
            {CONDITIONS.filter((c) => !conditions.includes(c)).map((c) => (
              <button
                key={c}
                type="button"
                className="block w-full rounded px-2 py-1 text-left text-xs text-ink hover:bg-surface-3"
                onClick={() => {
                  add(c)
                  setOpen(false)
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            className={cn('input mt-1 h-7 text-xs')}
            placeholder="Custom…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                add(custom)
                setCustom('')
                setOpen(false)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
