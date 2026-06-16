import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus } from 'lucide-react'

interface TagSelectProps {
  value: string | string[]
  options: readonly string[]
  /** Allow multiple values (chips accumulate). Single mode keeps one. */
  multi?: boolean
  placeholder?: string
  onChange: (value: string | string[]) => void
}

/**
 * Tag/combobox input: chips live inside the field, typing filters the options,
 * and the in-field "Add" button opens the full default list. Anything typed and
 * confirmed becomes a custom value.
 */
export function TagSelect({ value, options, multi, placeholder, onChange }: TagSelectProps): JSX.Element {
  const values = multi ? (value as string[]) : value ? [value as string] : []
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && boxRef.current) setRect(boxRef.current.getBoundingClientRect())
  }, [open, query, values.length])

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      const t = e.target as Node
      if (!boxRef.current?.contains(t) && !dropRef.current?.contains(t)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [])

  const add = (raw: string): void => {
    const v = raw.trim()
    if (!v) return
    if (multi) {
      if (!(value as string[]).includes(v)) onChange([...(value as string[]), v])
    } else {
      onChange(v)
    }
    setQuery('')
    inputRef.current?.focus()
  }

  const remove = (v: string): void => {
    if (multi) onChange((value as string[]).filter((x) => x !== v))
    else onChange('')
  }

  const q = query.trim().toLowerCase()
  const available = options.filter((o) => !values.includes(o))
  const filtered = q ? available.filter((o) => o.toLowerCase().includes(q)) : available
  const exists = options.some((o) => o.toLowerCase() === q) || values.some((v) => v.toLowerCase() === q)
  const showCreate = q.length > 0 && !exists

  return (
    <div className="relative">
      <div
        ref={boxRef}
        onClick={() => {
          inputRef.current?.focus()
          setOpen(true)
        }}
        className="flex min-h-[34px] cursor-text flex-wrap items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 focus-within:border-accent"
      >
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 py-0.5 pl-2 pr-1 text-xs text-accent"
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
            <button
              type="button"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent/25 hover:text-white"
              onClick={(e) => {
                e.stopPropagation()
                remove(v)
              }}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="min-w-[60px] flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          placeholder={values.length ? '' : (placeholder ?? 'Type or pick…')}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (filtered.length) add(filtered[0])
              else if (showCreate) add(query)
            } else if (e.key === 'Backspace' && !query && values.length) {
              remove(values[values.length - 1])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-ink-muted hover:bg-surface-3 hover:text-ink"
          onClick={(e) => {
            e.stopPropagation()
            setQuery('')
            setOpen((o) => !o)
            inputRef.current?.focus()
          }}
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {open &&
        rect &&
        (filtered.length > 0 || showCreate) &&
        createPortal(
          <div
            ref={dropRef}
            style={{ position: 'fixed', left: rect.left, top: rect.bottom + 4, width: rect.width }}
            className="z-[60] max-h-52 overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-2xl"
          >
            {showCreate && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-ink hover:bg-surface-3"
                onClick={() => add(query)}
              >
                <Plus size={13} className="text-accent" />
                Add “{query.trim()}”
              </button>
            )}
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                className="block w-full px-2.5 py-1.5 text-left text-sm text-ink hover:bg-surface-3"
                onClick={() => add(o)}
              >
                {o.charAt(0).toUpperCase() + o.slice(1)}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
