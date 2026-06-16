import { useState } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { usePcStore, type PcUnit, type PcSection } from '@/lib/store/pcStore'

const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

export function NotesTab({ pc }: { pc: PcUnit }): JSX.Element {
  const updatePc = usePcStore((s) => s.updatePc)
  const [search, setSearch] = useState('')
  const sections = pc.noteSections
  const set = (next: PcSection[]): void => updatePc(pc.id, { noteSections: next })

  const query = search.trim().toLowerCase()
  const filtered = query
    ? sections.filter((s) => s.title.toLowerCase().includes(query))
    : sections

  return (
    <div className="mx-auto max-w-3xl space-y-3 px-6 pb-6">
      {/* Search + Add row */}
      <div className="flex items-center gap-2 py-3">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="input pl-8"
            placeholder="Search note titles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-accent shrink-0"
          onClick={() => set([...sections, { id: uuid(), title: '', text: '' }])}
        >
          <Plus size={14} />
          Add note
        </button>
      </div>

      {sections.length === 0 && (
        <p className="text-sm text-ink-muted">No notes yet — hit "Add note" to start.</p>
      )}
      {sections.length > 0 && filtered.length === 0 && query && (
        <p className="text-sm text-ink-muted">No notes matching "{search}".</p>
      )}

      {filtered.map((sec) => (
        <div key={sec.id} className="panel space-y-2 p-3">
          <div className="flex items-center gap-2">
            <input
              className="input font-medium"
              placeholder="Note title"
              value={sec.title}
              onChange={(e) =>
                set(sections.map((s) => (s.id === sec.id ? { ...s, title: e.target.value } : s)))
              }
            />
            <button
              type="button"
              className="icon-btn shrink-0 hover:text-danger"
              title="Remove"
              onClick={() => set(sections.filter((s) => s.id !== sec.id))}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <textarea
            className="input min-h-[110px]"
            placeholder="…"
            value={sec.text}
            onChange={(e) =>
              set(sections.map((s) => (s.id === sec.id ? { ...s, text: e.target.value } : s)))
            }
          />
        </div>
      ))}
    </div>
  )
}
