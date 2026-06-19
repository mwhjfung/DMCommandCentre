import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SplitButtonProps {
  label: string
  icon?: ReactNode
  onMain: () => void
  disabled?: boolean
  /** When provided a chevron is added and clicking it opens a dropdown panel. */
  dropdownContent?: ReactNode
}

export function SplitButton({
  label,
  icon,
  onMain,
  disabled,
  dropdownContent
}: SplitButtonProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <div
        className={cn(
          'flex h-[26px] items-stretch overflow-hidden rounded-md border border-border bg-surface-2',
          disabled && 'pointer-events-none opacity-40'
        )}
      >
        <button
          type="button"
          onClick={onMain}
          className="flex items-center gap-1 px-2 text-xs font-medium text-ink-muted hover:bg-surface-3 hover:text-ink"
        >
          {icon}
          {label}
        </button>
        {dropdownContent !== undefined && (
          <>
            <div className="w-px self-stretch bg-border" />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center px-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink"
            >
              <ChevronDown size={12} />
            </button>
          </>
        )}
      </div>
      {open && dropdownContent && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-surface py-2 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {dropdownContent}
        </div>
      )}
    </div>
  )
}
