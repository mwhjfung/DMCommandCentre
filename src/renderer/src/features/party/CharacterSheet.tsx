import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { type PcUnit } from '@/lib/store/pcStore'
import { SheetView } from './SheetView'
import { InventoryTab } from './InventoryTab'
import { SpellsTab } from './SpellsTab'
import { FeaturesTab } from './FeaturesTab'
import { BackgroundTab } from './BackgroundTab'
import { NotesTab } from './NotesTab'
import { cn } from '@/lib/cn'

type TabKey = 'sheet' | 'inventory' | 'spells' | 'features' | 'background' | 'notes'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'sheet', label: 'Character sheet' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'spells', label: 'Spells' },
  { key: 'features', label: 'Features & traits' },
  { key: 'background', label: 'Background' },
  { key: 'notes', label: 'Notes' }
]

export function CharacterSheet({ pc, onEdit }: { pc: PcUnit; onEdit: () => void }): JSX.Element {
  const [active, setActive] = useState<TabKey>('sheet')

  const subtitleLine = [
    pc.race,
    pc.charClass,
    pc.level ? `Level ${pc.level}` : '',
    pc.playerName ? `Player: ${pc.playerName}` : '',
    pc.background?.alignment ?? ''
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex h-full flex-col">
      {/* Character identity header — always visible, doesn't scroll */}
      <div className="shrink-0 border-b border-border px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-sm font-semibold text-ink">{pc.name || 'Unnamed'}</span>
              {pc.alias && (
                <span className="shrink-0 text-xs italic text-ink-muted">"{pc.alias}"</span>
              )}
            </div>
            {subtitleLine && (
              <p className="mt-0.5 truncate text-[11px] text-ink-muted">{subtitleLine}</p>
            )}
          </div>
          <button type="button" className="btn-ghost shrink-0 text-xs" onClick={onEdit}>
            <Pencil size={13} />
            Edit sheet
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex shrink-0 overflow-x-auto border-b border-border px-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active === t.key
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {active === 'sheet' && <SheetView pc={pc} />}
        {active === 'inventory' && <InventoryTab pc={pc} />}
        {active === 'spells' && <SpellsTab pc={pc} />}
        {active === 'features' && <FeaturesTab pc={pc} />}
        {active === 'background' && <BackgroundTab pc={pc} />}
        {active === 'notes' && <NotesTab pc={pc} />}
      </div>
    </div>
  )
}
