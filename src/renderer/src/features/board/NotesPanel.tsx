import { X } from 'lucide-react'
import { useNotesStore } from '@/lib/store/notesStore'

const fmt = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

interface NotesPanelProps {
  expanded: boolean
  draft: string
  setDraft: (v: string) => void
  onSubmit: () => void
}

export function NotesPanel({ expanded, draft, setDraft, onSubmit }: NotesPanelProps): JSX.Element {
  const notes = useNotesStore((s) => s.notes)
  const remove = useNotesStore((s) => s.remove)

  const newestFirst = [...notes].reverse()

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border p-3">
        <textarea
          className="input min-h-[58px] w-full resize-none"
          placeholder="Jot a note…  (Ctrl/⌘+Enter to add)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              onSubmit()
            }
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {notes.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">No notes yet.</p>
        ) : expanded ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
                <th className="w-8 border-b border-border" />
                <th className="w-36 border-b border-border px-2 py-1.5 font-semibold">When</th>
                <th className="border-b border-border px-2 py-1.5 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.id} className="align-top">
                  <td className="border-b border-border px-1 py-1.5">
                    <button
                      type="button"
                      className="icon-btn h-7 w-7 self-center hover:text-danger"
                      title="Delete"
                      onClick={() => remove(n.id)}
                    >
                      <X size={15} />
                    </button>
                  </td>
                  <td className="border-b border-border px-2 py-1.5 text-ink-muted">{fmt(n.createdAt)}</td>
                  <td className="whitespace-pre-wrap border-b border-border px-2 py-1.5 text-ink">{n.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="space-y-2">
            {newestFirst.map((n) => (
              <div key={n.id} className="rounded-md border border-border bg-surface-2 p-2">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    className="icon-btn h-7 w-7 shrink-0 self-center hover:text-danger"
                    title="Delete"
                    onClick={() => remove(n.id)}
                  >
                    <X size={15} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-ink">{n.text}</p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">{fmt(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
