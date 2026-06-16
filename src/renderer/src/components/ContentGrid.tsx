import type { ContentEntry } from '@/types/content'
import { ContentCard } from './ContentCard'

interface ContentGridProps {
  items: ContentEntry[]
  /** When provided, custom cards show a selection checkbox. */
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

export function ContentGrid({ items, selectedIds, onToggleSelect }: ContentGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(244px,1fr))] gap-3">
      {items.map((entry) => (
        <ContentCard
          key={entry.id}
          entry={entry}
          selected={selectedIds?.has(entry.id)}
          onToggleSelect={onToggleSelect ? () => onToggleSelect(entry.id) : undefined}
        />
      ))}
    </div>
  )
}
