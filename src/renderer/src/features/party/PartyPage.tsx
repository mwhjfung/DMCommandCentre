import { useEffect, useState } from 'react'
import { Plus, Moon, Coffee, Users, Upload, Download } from 'lucide-react'
import { Page } from '@/components/Page'
import { EmptyState } from '@/components/EmptyState'
import { usePcStore, type PcUnit } from '@/lib/store/pcStore'
import { exportCharacters } from '@/lib/data/partyData'
import { CharacterSheet } from './CharacterSheet'
import { CharacterDialog } from './CharacterDialog'
import { ImportCharactersDialog } from './ImportCharactersDialog'
import { cn } from '@/lib/cn'

type DialogState = { mode: 'add' } | { mode: 'edit'; pc: PcUnit } | null

export function PartyPage(): JSX.Element {
  const pcs = usePcStore((s) => s.pcs)
  const longRest = usePcStore((s) => s.longRest)
  const shortRest = usePcStore((s) => s.shortRest)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [status, setStatus] = useState('')

  const selected = pcs.find((p) => p.id === selectedId) ?? pcs[0] ?? null

  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(''), 5000)
    return () => clearTimeout(t)
  }, [status])

  return (
    <Page
      title="Party"
      flush
      actions={
        <>
          {pcs.length > 0 && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                exportCharacters()
                setStatus('Exported characters.')
              }}
            >
              <Download size={15} />
              Export
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={() => setImportOpen(true)}>
            <Upload size={15} />
            Import
          </button>
          {pcs.length > 0 && (
            <>
              <button type="button" className="btn-ghost" onClick={shortRest}>
                <Coffee size={15} />
                Short rest
              </button>
              <button type="button" className="btn-ghost" onClick={longRest}>
                <Moon size={15} />
                Long rest
              </button>
            </>
          )}
          <button type="button" className="btn-accent" onClick={() => setDialog({ mode: 'add' })}>
            <Plus size={15} />
            Add character
          </button>
        </>
      }
    >
      <div className="flex h-full flex-col">
        {status && (
          <div className="shrink-0 border-b border-border bg-surface-2 px-6 py-1.5 text-xs text-ink-muted">
            {status}
          </div>
        )}

        {pcs.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No characters yet"
            description="Add your players' characters to keep their full sheets at hand — or import a JSON export."
          >
            <div className="flex items-center gap-2">
              <button type="button" className="btn-outline" onClick={() => setImportOpen(true)}>
                <Upload size={16} />
                Import
              </button>
              <button type="button" className="btn-accent" onClick={() => setDialog({ mode: 'add' })}>
                <Plus size={16} />
                Add character
              </button>
            </div>
          </EmptyState>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Horizontal PC name tabs */}
            <div className="flex shrink-0 overflow-x-auto border-b border-border">
              {pcs.map((pc) => (
                <button
                  key={pc.id}
                  type="button"
                  onClick={() => setSelectedId(pc.id)}
                  className={cn(
                    'shrink-0 whitespace-nowrap border-b-2 px-5 py-2.5 text-sm font-medium transition-colors',
                    selected?.id === pc.id
                      ? 'border-accent text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  )}
                >
                  {pc.name || 'Unnamed'}
                </button>
              ))}
            </div>

            {/* Character sheet */}
            <div className="min-h-0 flex-1">
              {selected && (
                <CharacterSheet
                  key={selected.id}
                  pc={selected}
                  onEdit={() => setDialog({ mode: 'edit', pc: selected })}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {dialog && (
        <CharacterDialog
          mode={dialog.mode}
          pc={dialog.mode === 'edit' ? dialog.pc : undefined}
          onClose={() => setDialog(null)}
        />
      )}
      {importOpen && (
        <ImportCharactersDialog onClose={() => setImportOpen(false)} onDone={(m) => setStatus(m)} />
      )}
    </Page>
  )
}
