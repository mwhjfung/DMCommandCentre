import { TYPE_META } from './typeMeta'
import type { ContentSource, ContentType } from '@/types/content'
import { cn } from '@/lib/cn'

export function TypeBadge({ type, className }: { type: ContentType; className?: string }): JSX.Element {
  const meta = TYPE_META[type]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
        meta.badge,
        className
      )}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  )
}

export function SourceTag({ source }: { source: ContentSource }): JSX.Element {
  return (
    <span
      className={cn(
        'text-[10px] font-semibold uppercase tracking-wider',
        source === 'srd' ? 'text-ink-muted' : 'text-accent'
      )}
    >
      {source === 'srd' ? 'SRD' : 'Custom'}
    </span>
  )
}
