import { useMemo, useRef, useState, useEffect } from 'react'
import {
  Search,
  Download,
  RefreshCw,
  Loader2,
  PencilLine,
  Plus,
  Upload,
  FolderPlus,
  Pencil
} from 'lucide-react'
import { Page } from '@/components/Page'
import { EmptyState } from '@/components/EmptyState'
import { ContentGrid } from '@/components/ContentGrid'
import { useContentStore, sourceInCampaign, SRD_SOURCE_ID, type Source } from '@/lib/store/contentStore'
import { useCampaignStore } from '@/lib/store/campaignStore'
import { useUiStore } from '@/lib/store/uiStore'
import { filterContent } from '@/lib/db/content'
import { CONTENT_TYPE_LABELS, type ContentType } from '@/types/content'
import { cn } from '@/lib/cn'
import { SourceDialog } from './SourceDialog'
import { BulkActionBar } from './BulkActionBar'

const ALL_TAB = 'all'
type DialogState = { mode: 'add' } | { mode: 'edit'; source: Source } | null

export function LibraryPage(): JSX.Element {
  const visibleItems = useContentStore((s) => s.visibleItems)
  const sources = useContentStore((s) => s.sources)
  const sync = useContentStore((s) => s.sync)
  const syncing = useContentStore((s) => s.syncing)
  const syncProgress = useContentStore((s) => s.syncProgress)
  const activeId = useCampaignStore((s) => s.activeId)
  const openTemplateSelect = useUiStore((s) => s.openTemplateSelect)
  const openImport = useUiStore((s) => s.openImport)

  const [tab, setTab] = useState<string>(ALL_TAB)
  const [query, setQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<ContentType>>(new Set())
  const [dialog, setDialog] = useState<DialogState>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  // Sources in the active campaign become Library tabs (All and SRD bookend them).
  const campaignSources = useMemo(
    () =>
      sources
        .filter((s) => sourceInCampaign(s, activeId))
        .sort((a, b) => a.createdAt - b.createdAt),
    [sources, activeId]
  )
  const tabs = useMemo(
    () => [
      { id: ALL_TAB, label: 'All' },
      { id: SRD_SOURCE_ID, label: 'SRD' },
      ...campaignSources.map((s) => ({ id: s.id, label: s.name }))
    ],
    [campaignSources]
  )

  // If the active tab disappears (campaign switch, source deleted), fall back to All.
  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) setTab(ALL_TAB)
  }, [tabs, tab])

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isAll = tab === ALL_TAB
  const isSrd = tab === SRD_SOURCE_ID
  const activeSource = campaignSources.find((s) => s.id === tab)

  const tabItems = useMemo(() => {
    if (isAll) return visibleItems
    if (isSrd) return visibleItems.filter((i) => i.source === 'srd')
    return visibleItems.filter((i) => i.sourceId === tab)
  }, [visibleItems, tab, isAll, isSrd])

  const typesPresent = useMemo(() => {
    const set = new Set<ContentType>()
    tabItems.forEach((i) => set.add(i.type))
    return (Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).filter((t) => set.has(t))
  }, [tabItems])

  const filtered = useMemo(
    () => filterContent(tabItems, { query, types: activeTypes.size ? [...activeTypes] : undefined }),
    [tabItems, query, activeTypes]
  )
  const customShown = useMemo(() => filtered.filter((e) => e.source === 'custom'), [filtered])

  const toggleType = (t: ContentType): void => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  const clearSelection = (): void => setSelectedIds(new Set())
  const toggleSelect = (id: string): void =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const selectAll = (): void => setSelectedIds(new Set(customShown.map((e) => e.id)))

  const resetTabView = (id: string): void => {
    setTab(id)
    setActiveTypes(new Set())
    setQuery('')
    clearSelection()
  }

  const srdCount = useMemo(() => visibleItems.filter((i) => i.source === 'srd').length, [visibleItems])
  const countFor = (id: string): number =>
    id === ALL_TAB
      ? visibleItems.length
      : id === SRD_SOURCE_ID
        ? srdCount
        : visibleItems.filter((i) => i.sourceId === id).length

  const actions = isSrd ? (
    srdCount > 0 ? (
      <button type="button" className="btn-ghost" disabled={syncing} onClick={() => void sync()}>
        {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        Re-sync
      </button>
    ) : undefined
  ) : isAll ? (
    <>
      <button type="button" className="btn-ghost" onClick={() => openImport()}>
        <Upload size={15} />
        Import
      </button>
      <button type="button" className="btn-accent" onClick={() => openTemplateSelect()}>
        <Plus size={15} />
        New entry
      </button>
    </>
  ) : (
    <>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => activeSource && setDialog({ mode: 'edit', source: activeSource })}
      >
        <Pencil size={15} />
        Edit source
      </button>
      <button type="button" className="btn-ghost" onClick={() => openImport(activeSource?.name)}>
        <Upload size={15} />
        Import
      </button>
      <button type="button" className="btn-accent" onClick={() => openTemplateSelect(activeSource?.name)}>
        <Plus size={15} />
        New entry
      </button>
    </>
  )

  return (
    <Page title="Library" actions={actions}>
      <div className="flex h-full flex-col">
        {/* tabs (= sources) */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-6 pt-3">
          <div className="flex flex-1 items-center gap-1 overflow-x-auto">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => resetTabView(id)}
                className={cn(
                  'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  tab === id
                    ? 'border-accent text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink'
                )}
              >
                {label}
                <span className="ml-1.5 text-ink-muted">({countFor(id)})</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDialog({ mode: 'add' })}
            className="mb-1 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface-3 hover:text-ink"
          >
            <FolderPlus size={14} />
            Add source
          </button>
        </div>

        {selectedIds.size > 0 && (
          <BulkActionBar
            ids={[...selectedIds]}
            onClear={clearSelection}
            onSelectAll={selectAll}
            totalShown={customShown.length}
          />
        )}

        {isSrd && srdCount === 0 ? (
          <SrdEmpty syncing={syncing} progress={syncProgress} onSync={() => void sync()} />
        ) : tabItems.length === 0 ? (
          <EmptyState
            icon={isAll ? Download : PencilLine}
            title={isAll ? 'Your library is empty' : `Nothing in ${activeSource?.name ?? 'this source'} yet`}
            description="Create your own spells, monsters, NPCs, items and world entries — your beholder included."
          >
            <div className="flex items-center gap-2">
              {isAll && srdCount === 0 && (
                <button type="button" className="btn-outline" onClick={() => void sync()}>
                  <Download size={16} />
                  Download SRD
                </button>
              )}
              <button
                type="button"
                className="btn-outline"
                onClick={() => openImport(activeSource?.name)}
              >
                <Upload size={16} />
                Import a document
              </button>
              <button
                type="button"
                className="btn-accent"
                onClick={() => openTemplateSelect(activeSource?.name)}
              >
                <Plus size={16} />
                New entry
              </button>
            </div>
          </EmptyState>
        ) : (
          <>
            {/* toolbar */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 px-6 py-3">
              <div className="relative w-64">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…  ( / )"
                  className="input pl-8"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {typesPresent.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      activeTypes.has(t)
                        ? 'border-accent/60 bg-accent/15 text-accent'
                        : 'border-border text-ink-muted hover:border-border-strong hover:text-ink'
                    )}
                  >
                    {CONTENT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-xs text-ink-muted">{filtered.length} shown</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
              {filtered.length === 0 ? (
                <EmptyState icon={Search} title="No matches" description="Try a different search or filter." />
              ) : (
                <ContentGrid items={filtered} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
              )}
            </div>
          </>
        )}
      </div>

      {dialog && (
        <SourceDialog
          mode={dialog.mode}
          source={dialog.mode === 'edit' ? dialog.source : undefined}
          onClose={() => setDialog(null)}
          onSaved={(id) => resetTabView(id)}
          onDeleted={() => resetTabView(ALL_TAB)}
        />
      )}
    </Page>
  )
}

function SrdEmpty({
  syncing,
  progress,
  onSync
}: {
  syncing: boolean
  progress: { label: string; done: number; total: number } | null
  onSync: () => void
}): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
      <Download size={32} strokeWidth={1.5} className="text-ink-muted" />
      <div>
        <p className="text-sm font-medium text-ink">No SRD content yet</p>
        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          Download the official 5e SRD from Open5e — spells, monsters, magic items, weapons,
          conditions and classes. Stored locally so it works offline.
        </p>
      </div>
      {syncing ? (
        <div className="flex w-64 flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 size={15} className="animate-spin" />
            {progress ? `Fetching ${progress.label}…` : 'Starting…'}
          </div>
          {progress && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <button type="button" className="btn-accent" onClick={onSync}>
          <Download size={16} />
          Download SRD content
        </button>
      )}
    </div>
  )
}
