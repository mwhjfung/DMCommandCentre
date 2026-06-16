import { useState } from 'react'
import { Plus, Copy, X, Check } from 'lucide-react'
import { useNotesStore } from '@/lib/store/notesStore'

const fmt = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

/**
 * Notes for the active session. A note box adds to a running list; expanded,
 * the list becomes a table. "Copy all" puts the lot on the clipboard.
 */
export function NotesPanel({ expanded }: { expanded: boolean }): JSX.Element {
  const notes = useNotesStore((s) => s.notes)
  const add = useNotesStore((s) => s.add)
  const remove = useNotesStore((s) => s.remove)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)

  const submit = (): void => {
    add(draft)
    setDraft('')
  }

  const copyAll = (): void => {
    const text = notes.map((n) => `[${fmt(n.createdAt)}] ${n.text}`).join('\n')
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // Newest first in the compact list; chronological in the table.
  const newestFirst = [...notes].reverse()

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <textarea
          className="input min-h-[58px] resize-none"
          placeholder="Jot a note…  (Ctrl/⌘+Enter to add)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <div className="flex items-center justify-between">
          <button type="button" className="btn-accent" disabled={!draft.trim()} onClick={submit}>
            <Plus size={15} />
            Add note
          </button>
          {notes.length > 0 && (
            <button type="button" className="btn-ghost" onClick={copyAll}>
              {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy all notes'}
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {notes.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">No notes yet.</p>
        ) : expanded ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
                <th className="w-36 border-b border-border px-2 py-1.5 font-semibold">When</th>
                <th className="border-b border-border px-2 py-1.5 font-semibold">Note</th>
                <th className="w-8 border-b border-border" />
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.id} className="align-top">
                  <td className="border-b border-border px-2 py-1.5 text-ink-muted">{fmt(n.createdAt)}</td>
                  <td className="whitespace-pre-wrap border-b border-border px-2 py-1.5 text-ink">{n.text}</td>
                  <td className="border-b border-border px-1 py-1.5">
                    <button
                      type="button"
                      className="icon-btn h-6 w-6 hover:text-danger"
                      title="Delete"
                      onClick={() => remove(n.id)}
                    >
                      <X size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="space-y-2">
            {newestFirst.map((n) => (
              <div key={n.id} className="group rounded-md border border-border bg-surface-2 p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap text-sm text-ink">{n.text}</p>
                  <button
                    type="button"
                    className="icon-btn h-6 w-6 shrink-0 opacity-0 hover:text-danger group-hover:opacity-100 focus:opacity-100"
                    title="Delete"
                    onClick={() => remove(n.id)}
                  >
                    <X size={13} />
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-ink-muted">{fmt(n.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
