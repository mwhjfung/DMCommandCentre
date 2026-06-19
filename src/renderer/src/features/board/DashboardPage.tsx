import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutGrid, Maximize2, Minimize2, Plus, Library,
  Archive, Pencil, X, Check, Trash2, RotateCcw, Users
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Page } from '@/components/Page'
import { EmptyState } from '@/components/EmptyState'
import { ContentCard } from '@/components/ContentCard'
import { useContentStore } from '@/lib/store/contentStore'
import { useSessionStore, type DashSession } from '@/lib/store/sessionStore'
import { useCombatStore } from '@/lib/store/combatStore'
import { usePcStore, type PcUnit } from '@/lib/store/pcStore'
import { InitiativeTracker } from '@/features/session/InitiativeTracker'
import { SplitButton } from '@/components/SplitButton'
import { NotesPanel } from './NotesPanel'
import { SessionDialog } from './SessionDialog'
import { getSetting, setSetting } from '@/lib/db/content'
import { getActiveCampaignId } from '@/lib/store/activeCampaign'
import type { ContentEntry } from '@/types/content'
import type { Note } from '@/lib/store/notesStore'
import type { CombatUnit } from '@/lib/store/combatStore'
import { cn } from '@/lib/cn'

type SectionId = 'pins' | 'initiative' | 'notes'
type MainTab = 'latest' | 'archive'

const SECTION_TITLE: Record<SectionId, string> = {
  pins: 'Pinned cards',
  initiative: 'Initiative',
  notes: 'Notes'
}

const fmtDate = (ts: number): string =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

// ---- dashboard page --------------------------------------------------------

export function DashboardPage(): JSX.Element {
  const [showNewSession, setShowNewSession] = useState(false)
  const [expanded, setExpanded] = useState<SectionId | null>(null)
  const [mainTab, setMainTab] = useState<MainTab>('latest')

  const section = (id: Exclude<SectionId, 'initiative'>): ReactNode => (
    <DashSection
      title={SECTION_TITLE[id]}
      expanded={expanded === id}
      onToggle={() => setExpanded((e) => (e === id ? null : id))}
    >
      {id === 'pins' ? (
        <PinnedBoard />
      ) : (
        <NotesPanel expanded={expanded === 'notes'} />
      )}
    </DashSection>
  )

  return (
    <Page title="Dashboard" flush>
      <div className="flex h-full flex-col">
        {/* main tabs */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 pt-3">
          <div className="flex flex-1 items-center gap-1">
            {(['latest', 'archive'] as MainTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMainTab(t)}
                className={cn(
                  'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  mainTab === t
                    ? 'border-accent text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink'
                )}
              >
                {t === 'latest' ? 'Latest' : 'View archive'}
              </button>
            ))}
          </div>
          {mainTab === 'latest' && (
            <div className="mb-1 flex shrink-0 items-center gap-1">
              <button
                type="button"
                title="Reset session — clears pins, initiative and notes"
                onClick={() => {
                  if (window.confirm('Reset this session? This will clear all pins, initiative and notes. This cannot be undone.')) {
                    void useSessionStore.getState().resetLatest()
                  }
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface-3 hover:text-ink"
              >
                <RotateCcw size={13} />
                Reset
              </button>
              <button
                type="button"
                onClick={() => setShowNewSession(true)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface-3 hover:text-ink"
              >
                <Plus size={14} />
                New session
              </button>
            </div>
          )}
        </div>

        {/* content */}
        <div className="min-h-0 flex-1">
          {mainTab === 'latest' ? (
            <div className="h-full p-4">
              {expanded ? (
                <div className="h-full">
                  {expanded === 'initiative' ? (
                    <InitiativeDashSection
                      expanded={true}
                      onToggle={() => setExpanded(null)}
                    />
                  ) : (
                    section(expanded)
                  )}
                </div>
              ) : (
                <div className="flex h-full flex-col gap-4">
                  <div className="min-h-0" style={{ flexGrow: 60, flexBasis: 0 }}>
                    {section('pins')}
                  </div>
                  <div className="flex min-h-0 gap-4" style={{ flexGrow: 40, flexBasis: 0 }}>
                    <div className="min-w-0 flex-1">
                      <InitiativeDashSection
                        expanded={false}
                        onToggle={() => setExpanded('initiative')}
                      />
                    </div>
                    <div className="min-w-0 flex-1">{section('notes')}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ArchiveView />
          )}
        </div>
      </div>

      {showNewSession && (
        <SessionDialog mode="add" onClose={() => setShowNewSession(false)} />
      )}
    </Page>
  )
}

// ---- dash section wrapper --------------------------------------------------

function DashSection({
  title,
  expanded,
  onToggle,
  children
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}): JSX.Element {
  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</span>
        <button
          type="button"
          className="icon-btn h-6 w-6"
          title={expanded ? 'Contract' : 'Expand'}
          onClick={onToggle}
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

// ---- initiative dash section (custom header) --------------------------------

function InitiativeDashSection({
  expanded,
  onToggle
}: {
  expanded: boolean
  onToggle: () => void
}): JSX.Element {
  const pcs = usePcStore((s) => s.pcs)
  const units = useCombatStore((s) => s.units)
  const addUnit = useCombatStore((s) => s.addUnit)
  const [addOpen, setAddOpen] = useState(false)

  const addAllParty = (): void => {
    const existing = new Set(units.map((u) => u.name.toLowerCase()))
    pcs.forEach((pc) => {
      if (existing.has(pc.name.toLowerCase())) return
      addUnit({
        name: pc.name,
        isPC: true,
        initiative: 0,
        locked: false,
        hpCurrent: pc.currentHp,
        hpMax: pc.maxHp,
        hpTemp: pc.tempHp,
        conditions: []
      })
    })
  }

  const addOnePc = (pc: PcUnit): void => {
    const existing = new Set(units.map((u) => u.name.toLowerCase()))
    if (existing.has(pc.name.toLowerCase())) return
    addUnit({
      name: pc.name,
      isPC: true,
      initiative: 0,
      locked: false,
      hpCurrent: pc.currentHp,
      hpMax: pc.maxHp,
      hpTemp: pc.tempHp,
      conditions: []
    })
  }

  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        {/* Title + expand/collapse toggle always inline */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Initiative</span>
          <button
            type="button"
            className="icon-btn h-5 w-5"
            title={expanded ? 'Minimize' : 'Expand'}
            onClick={onToggle}
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <SplitButton
            label="Add party"
            icon={<Users size={13} />}
            onMain={addAllParty}
            disabled={pcs.length === 0}
            dropdownContent={
              <>
                <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Add individual
                </p>
                {pcs.map((pc) => {
                  const already = units.some((u) => u.name.toLowerCase() === pc.name.toLowerCase())
                  return (
                    <button
                      key={pc.id}
                      type="button"
                      disabled={already}
                      onClick={() => addOnePc(pc)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <span className="truncate">{pc.name}</span>
                      {already && <Check size={12} className="shrink-0 text-accent" />}
                    </button>
                  )
                })}
              </>
            }
          />
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-[26px] items-center gap-1 rounded-md bg-accent px-2.5 text-xs font-medium text-accent-fg hover:bg-accent-strong"
          >
            <Plus size={13} />
            Add
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <InitiativeTracker
          addOpen={addOpen}
          onCloseAdd={() => setAddOpen(false)}
          onAdd={() => setAddOpen(true)}
          onAddParty={addAllParty}
        />
      </div>
    </div>
  )
}

// ---- pinned cards board ----------------------------------------------------

function SortableCard({ entry }: { entry: ContentEntry }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'z-10 opacity-60')}
    >
      <ContentCard entry={entry} dragHandle={{ ...attributes, ...listeners }} />
    </div>
  )
}

function PinnedBoard(): JSX.Element {
  const navigate = useNavigate()
  const items = useContentStore((s) => s.items)
  const pinnedIds = useContentStore((s) => s.pinnedIds)
  const reorderPins = useContentStore((s) => s.reorderPins)

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const validPinnedIds = useMemo(() => pinnedIds.filter((id) => byId.has(id)), [pinnedIds, byId])
  const pinned = useMemo(
    () => validPinnedIds.map((id) => byId.get(id) as ContentEntry),
    [validPinnedIds, byId]
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const onDragEnd = (e: DragEndEvent): void => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const oldIndex = validPinnedIds.indexOf(active.id as string)
      const newIndex = validPinnedIds.indexOf(over.id as string)
      reorderPins(arrayMove(validPinnedIds, oldIndex, newIndex))
    }
  }

  if (pinned.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No pinned cards"
        description="Pin spells, monsters, items and more from the Library to keep them on this session's board."
      >
        <button type="button" className="btn-accent" onClick={() => navigate('/library')}>
          <Library size={16} />
          Go to Library
        </button>
      </EmptyState>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={validPinnedIds} strategy={rectSortingStrategy}>
          <div className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {pinned.map((entry) => (
              <SortableCard key={entry.id} entry={entry} />
            ))}
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="group flex h-full min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border text-ink-muted opacity-60 transition-all hover:border-accent/60 hover:text-ink hover:opacity-100"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">Add from Library</span>
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

// ---- archive view ----------------------------------------------------------

function ArchiveView(): JSX.Element {
  const sessions = useSessionStore((s) => s.sessions)
  const activeId = useSessionStore((s) => s.activeId)

  const archived = useMemo(
    () =>
      sessions
        .filter((s) => s.id !== activeId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [sessions, activeId]
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Auto-select first when list changes
  useEffect(() => {
    if (archived.length > 0 && (!selectedId || !archived.find((s) => s.id === selectedId))) {
      setSelectedId(archived[0].id)
    }
  }, [archived, selectedId])

  if (archived.length === 0) {
    return (
      <EmptyState
        icon={Archive}
        title="No archived sessions yet"
        description="When you start a new session, the previous one moves here."
      />
    )
  }

  const selected = archived.find((s) => s.id === selectedId)

  return (
    <div className="flex h-full min-h-0">
      {/* session list */}
      <div className="flex w-48 shrink-0 flex-col border-r border-border">
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {archived.map((s) => (
            <div
              key={s.id}
              className={cn(
                'group flex items-center rounded-md transition-colors',
                selectedId === s.id ? 'bg-accent/15' : 'hover:bg-surface-3'
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className="min-w-0 flex-1 px-3 py-2 text-left"
              >
                <p className={cn('truncate text-sm font-medium', selectedId === s.id ? 'text-ink' : 'text-ink-muted group-hover:text-ink')}>{s.name}</p>
                <p className="text-[11px] text-ink-muted">{fmtDate(s.createdAt)}</p>
              </button>
              <button
                type="button"
                title="Delete session"
                onClick={() => {
                  if (window.confirm(`Delete "${s.name}"? Its notes, pins and initiative will be permanently removed.`)) {
                    void useSessionStore.getState().remove(s.id)
                  }
                }}
                className="mr-1 shrink-0 rounded p-1 text-ink-muted opacity-0 hover:text-danger group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* detail */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selected ? (
          <ArchiveSessionDetail key={selected.id} session={selected} />
        ) : null}
      </div>
    </div>
  )
}

// ---- archived session detail -----------------------------------------------

function ArchiveSessionDetail({ session }: { session: DashSession }): JSX.Element {
  const campaignId = getActiveCampaignId()
  const allItems = useContentStore((s) => s.items)
  const rename = useSessionStore((s) => s.rename)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(session.name)
  const [notes, setNotes] = useState<Note[]>([])
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [combatUnits, setCombatUnits] = useState<CombatUnit[]>([])
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setLoaded(false)
    const load = async (): Promise<void> => {
      const [n, p, c] = await Promise.all([
        getSetting<Note[]>(`notes:${campaignId}:${session.id}`),
        getSetting<string[]>(`pinnedIds:${campaignId}:${session.id}`),
        getSetting<{ units: CombatUnit[] }>(`combatState:${campaignId}:${session.id}`)
      ])
      setNotes(n ?? [])
      setPinnedIds(p ?? [])
      setCombatUnits(c?.units ?? [])
      setLoaded(true)
    }
    void load()
  }, [session.id, campaignId])

  const persistNotes = async (next: Note[]): Promise<void> => {
    setNotes(next)
    await setSetting(`notes:${campaignId}:${session.id}`, next)
  }

  const addNote = (): void => {
    const t = draft.trim()
    if (!t) return
    void persistNotes([
      ...notes,
      { id: crypto.randomUUID(), text: t, createdAt: Date.now() }
    ])
    setDraft('')
  }

  const removeNote = (id: string): void => void persistNotes(notes.filter((n) => n.id !== id))

  const saveEdit = (): void => {
    if (editName.trim()) rename(session.id, editName)
    setIsEditing(false)
  }

  const cancelEdit = (): void => {
    setEditName(session.name)
    setIsEditing(false)
  }

  const pinnedEntries = useMemo(
    () => pinnedIds.map((id) => allItems.find((i) => i.id === id)).filter(Boolean) as ContentEntry[],
    [pinnedIds, allItems]
  )

  if (!loaded) {
    return <p className="p-6 text-sm text-ink-muted">Loading…</p>
  }

  return (
    <div className="space-y-6 p-6">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              className="input w-full text-base font-semibold"
              value={editName}
              autoFocus
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit()
                if (e.key === 'Escape') cancelEdit()
              }}
            />
          ) : (
            <h2 className="truncate text-lg font-semibold text-ink">{session.name}</h2>
          )}
          <p className="mt-0.5 text-xs text-ink-muted">{fmtDate(session.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isEditing ? (
            <>
              <button type="button" className="btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
              <button type="button" className="btn-accent" onClick={saveEdit}>
                <Check size={14} />
                Done
              </button>
            </>
          ) : (
            <button type="button" className="btn-outline" onClick={() => setIsEditing(true)}>
              <Pencil size={13} />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* notes */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Notes{notes.length > 0 && ` (${notes.length})`}
        </h3>

        {isEditing && (
          <div className="space-y-2">
            <textarea
              className="input min-h-[60px] w-full resize-none"
              placeholder="Add a note… (⌘+Enter to add)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  addNote()
                }
              }}
            />
            <button
              type="button"
              className="btn-outline"
              disabled={!draft.trim()}
              onClick={addNote}
            >
              <Plus size={14} />
              Add note
            </button>
          </div>
        )}

        {notes.length === 0 ? (
          <p className="text-sm text-ink-muted">No notes for this session.</p>
        ) : (
          <div className="space-y-2">
            {[...notes].reverse().map((n) => (
              <div key={n.id} className="rounded-md border border-border bg-surface-2 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap text-sm text-ink">{n.text}</p>
                  {isEditing && (
                    <button
                      type="button"
                      className="icon-btn h-6 w-6 shrink-0 hover:text-danger"
                      title="Delete note"
                      onClick={() => removeNote(n.id)}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-ink-muted">{fmtDate(n.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* pinned cards */}
      {pinnedEntries.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Pinned cards ({pinnedEntries.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {pinnedEntries.map((e) => (
              <span key={e.id} className="chip">{e.name}</span>
            ))}
          </div>
        </section>
      )}

      {/* initiative */}
      {combatUnits.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Initiative ({combatUnits.length})
          </h3>
          <div className="space-y-1">
            {[...combatUnits].sort((a, b) => b.initiative - a.initiative).map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-1.5 text-sm"
              >
                <span className="w-6 text-center text-xs font-semibold text-accent">
                  {u.initiative}
                </span>
                <span className="flex-1 text-ink">{u.name}</span>
                <span className="text-xs text-ink-muted">
                  {u.hpCurrent}/{u.hpMax} HP
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {pinnedEntries.length === 0 && combatUnits.length === 0 && notes.length === 0 && (
        <p className="text-sm text-ink-muted">Nothing recorded for this session.</p>
      )}
    </div>
  )
}
