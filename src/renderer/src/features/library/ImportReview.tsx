import { useState } from 'react'
import { EntryForm } from './EntryForm'
import type { ContentEntry } from '@/types/content'

/** Steps through imported drafts, reusing EntryForm to accept/edit/skip each. */
export function ImportReview({
  drafts,
  onClose
}: {
  drafts: ContentEntry[]
  onClose: () => void
}): JSX.Element | null {
  const [index, setIndex] = useState(0)
  const current = drafts[index]

  const advance = (): void => {
    if (index + 1 >= drafts.length) onClose()
    else setIndex((i) => i + 1)
  }

  if (!current) return null

  return (
    <EntryForm
      key={current.id}
      type={current.type}
      entry={current}
      review={{ index: index + 1, total: drafts.length, onSkip: advance }}
      onSaved={advance}
      onClose={onClose}
    />
  )
}
