import { useEffect, useRef, useState } from 'react'
import { ChevronsUpDown, Check, Plus, Pencil, Trash2 } from 'lucide-react'
import { useCampaignStore } from '@/lib/store/campaignStore'
import { useUiStore } from '@/lib/store/uiStore'
import { cn } from '@/lib/cn'

const PRESET_EMOJI = [
  '🎲',
  '⚔️',
  '🐉',
  '🏰',
  '🗡️',
  '🛡️',
  '🔥',
  '❄️',
  '💀',
  '👑',
  '🌲',
  '🌊',
  '⭐',
  '📜',
  '🧙',
  '👹',
  '🏔️',
  '🌌'
]

function EmojiRow({
  value,
  onChange
}: {
  value: string | undefined
  onChange: (v: string | undefined) => void
}): JSX.Element {
  return (
    <div className="flex flex-wrap gap-0.5">
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded text-[11px] text-ink-muted hover:bg-surface-3',
          !value && 'ring-1 ring-accent'
        )}
        title="No emoji"
      >
        —
      </button>
      {PRESET_EMOJI.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded text-sm hover:bg-surface-3',
            value === e && 'ring-1 ring-accent'
          )}
        >
          {e}
        </button>
      ))}
    </div>
  )
}

export function CampaignSwitcher(): JSX.Element {
  const campaigns = useCampaignStore((s) => s.campaigns)
  const activeId = useCampaignStore((s) => s.activeId)
  const setActive = useCampaignStore((s) => s.setActive)
  const create = useCampaignStore((s) => s.create)
  const update = useCampaignStore((s) => s.update)
  const remove = useCampaignStore((s) => s.remove)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed)

  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState<string | undefined>('🎲')
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const [renameIcon, setRenameIcon] = useState<string | undefined>(undefined)
  const ref = useRef<HTMLDivElement>(null)

  const active = campaigns.find((c) => c.id === activeId)

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setRenaming(false)
      }
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [])

  if (collapsed) {
    return (
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          title={`Campaign: ${active?.name ?? ''}`}
          className="flex h-9 w-full items-center justify-center rounded-md text-lg leading-none hover:bg-surface-3"
        >
          {active?.icon ?? '🎲'}
        </button>
      </div>
    )
  }

  const doCreate = (): void => {
    if (!newName.trim()) return
    void create(newName.trim(), newIcon)
    setNewName('')
    setNewIcon('🎲')
    setCreating(false)
    setOpen(false)
  }

  const saveRename = (): void => {
    if (!active) return
    update(active.id, { name: renameText.trim() || active.name, icon: renameIcon })
    setRenaming(false)
  }

  return (
    <div ref={ref} className="relative border-t border-border p-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-3"
      >
        <span className="shrink-0 text-sm leading-none">{active?.icon ?? '🎲'}</span>
        <span className="flex-1 truncate text-left text-[13px] font-medium text-ink">
          {active?.name ?? '—'}
        </span>
        <ChevronsUpDown size={13} className="shrink-0 text-ink-muted" />
      </button>

      {open && (
        <div className="absolute bottom-2 left-full z-50 ml-2 w-64 rounded-md border border-border bg-surface p-1 text-[13px] shadow-2xl">
          <div className="max-h-48 overflow-y-auto">
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActive(c.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                  c.id === activeId ? 'text-accent' : 'text-ink hover:bg-surface-3'
                )}
              >
                <span className="w-5 shrink-0 text-center text-sm leading-none">{c.icon ?? '🎲'}</span>
                <span className="flex-1 truncate">{c.name}</span>
                {c.id === activeId && <Check size={13} className="shrink-0" />}
              </button>
            ))}
          </div>

          <div className="my-1 border-t border-border" />

          {creating ? (
            <div className="space-y-1 p-1">
              <div className="flex gap-1">
                <input
                  autoFocus
                  className="input h-7 text-sm"
                  placeholder="Campaign name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doCreate()}
                />
                <button type="button" className="btn-accent shrink-0" onClick={doCreate}>
                  Add
                </button>
              </div>
              <EmojiRow value={newIcon} onChange={setNewIcon} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-ink-muted hover:bg-surface-3"
            >
              <Plus size={13} />
              New campaign
            </button>
          )}

          {active &&
            (renaming ? (
              <div className="space-y-1 p-1">
                <div className="flex gap-1">
                  <input
                    autoFocus
                    className="input h-7 text-sm"
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                  />
                  <button type="button" className="btn-outline shrink-0" onClick={saveRename}>
                    Save
                  </button>
                </div>
                <EmojiRow value={renameIcon} onChange={setRenameIcon} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRenameText(active.name)
                  setRenameIcon(active.icon)
                  setRenaming(true)
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-ink-muted hover:bg-surface-3"
              >
                <Pencil size={13} />
                Rename / emoji
              </button>
            ))}

          {active && campaigns.length > 1 && (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete campaign “${active.name}” and its party, board and combat? Your content library is untouched.`
                  )
                ) {
                  void remove(active.id)
                }
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-danger hover:bg-danger/10"
            >
              <Trash2 size={13} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
