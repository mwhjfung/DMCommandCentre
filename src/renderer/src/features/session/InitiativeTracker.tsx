import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  Dices,
  SkipForward,
  RotateCcw,
  Plus,
  X,
  Swords,
  Users,
  Lock,
  LockOpen,
  MoreVertical
} from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { useCombatStore, type CombatUnit } from '@/lib/store/combatStore'
import { usePcStore } from '@/lib/store/pcStore'
import { useContentStore } from '@/lib/store/contentStore'
import { useUiStore } from '@/lib/store/uiStore'
import { ConditionsCell } from './ConditionsCell'
import { cn } from '@/lib/cn'

const parseHp = (s: string | undefined): number => (s ? parseInt(s, 10) || 0 : 0)

function hpColor(current: number, max: number): string {
  if (max <= 0) return 'bg-ink-faint'
  const pct = current / max
  if (pct > 0.5) return 'bg-success'
  if (pct > 0.25) return 'bg-amber-400'
  return 'bg-danger'
}

function AddCombatantModal({ onClose }: { onClose: () => void }): JSX.Element {
  const addUnit = useCombatStore((s) => s.addUnit)
  const monsters = useContentStore((s) => s.visibleItems.filter((i) => i.type === 'monster'))
  const [name, setName] = useState('')
  const [hp, setHp] = useState('')
  const [init, setInit] = useState('')
  const [count, setCount] = useState(1)
  const [isPC, setIsPC] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const rollInit = (): void => setInit(String(Math.floor(Math.random() * 20) + 1))

  // Add keeps the modal open and resets for the next one. Non-PCs can be added
  // in a batch (e.g. 5 goblins) — each becomes its own numbered entry.
  const submit = (): void => {
    const trimmed = name.trim()
    if (!trimmed) return
    const match = monsters.find((m) => m.name.toLowerCase() === trimmed.toLowerCase())
    const hpMax = hp ? Number(hp) : match ? parseHp((match.data as { hp?: string }).hp) : 0
    const n = isPC ? 1 : Math.max(1, Math.floor(Number(count) || 1))
    for (let i = 0; i < n; i += 1) {
      addUnit({
        name: n > 1 ? `${trimmed} ${i + 1}` : trimmed,
        contentId: match?.id,
        isPC,
        initiative: init ? Number(init) : 0,
        locked: false,
        hpCurrent: hpMax,
        hpMax,
        conditions: []
      })
    }
    setName('')
    setHp('')
    setInit('')
    setCount(1)
    nameRef.current?.focus()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 p-8" onClick={onClose}>
      <div className="panel mt-[10vh] w-[420px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Add to initiative</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <label className="label">Name</label>
            <input
              ref={nameRef}
              className="input"
              list="lib-monsters"
              autoFocus
              placeholder="PC name or library monster…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <datalist id="lib-monsters">
              {monsters.map((m) => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-20">
              <label className="label">HP</label>
              <input className="input" type="number" value={hp} onChange={(e) => setHp(e.target.value)} />
            </div>
            <div>
              <label className="label">Init</label>
              <div className="flex items-center gap-1">
                <input
                  className="input w-16"
                  type="number"
                  value={init}
                  onChange={(e) => setInit(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                />
                <button
                  type="button"
                  className="icon-btn shrink-0"
                  title="Roll d20"
                  onClick={rollInit}
                >
                  <Dices size={15} />
                </button>
              </div>
            </div>
            {!isPC && (
              <div className="w-20">
                <label className="label">Count</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                />
              </div>
            )}
            <label className="flex h-9 cursor-pointer items-center gap-1.5 text-sm text-ink-muted">
              <input type="checkbox" checked={isPC} onChange={(e) => setIsPC(e.target.checked)} />
              PC
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-accent" disabled={!name.trim()} onClick={submit}>
            <Plus size={15} />
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

function KebabMenu({
  onAdd,
  onAddParty,
  onRollAll,
  onReset,
  hasPcs
}: {
  onAdd: () => void
  onAddParty: () => void
  onRollAll: () => void
  onReset: () => void
  hasPcs: boolean
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const item = (label: string, icon: JSX.Element, action: () => void, disabled = false): JSX.Element => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => { action(); setOpen(false) }}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div ref={ref} className="relative">
      <button type="button" className="icon-btn" onClick={() => setOpen((o) => !o)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[148px] rounded-lg border border-border bg-surface py-1 shadow-lg">
          {item('Add', <Plus size={14} />, onAdd)}
          {item('Add party', <Users size={14} />, onAddParty, !hasPcs)}
          <div className="my-1 border-t border-border" />
          {item('Roll all', <Dices size={14} />, onRollAll)}
          {item('Reset', <RotateCcw size={14} />, onReset)}
        </div>
      )}
    </div>
  )
}

function CombatRow({
  unit,
  current,
  style
}: {
  unit: CombatUnit
  current: boolean
  style?: CSSProperties
}): JSX.Element {
  const update = useCombatStore((s) => s.updateUnit)
  const remove = useCombatStore((s) => s.removeUnit)
  const sort = useCombatStore((s) => s.sort)
  const openDrawer = useUiStore((s) => s.openDrawer)
  const [amt, setAmt] = useState('')

  const applyDamage = (sign: number): void => {
    const n = Number(amt)
    if (!n) return
    update(unit.id, { hpCurrent: Math.max(0, Math.min(unit.hpMax, unit.hpCurrent - sign * n)) })
    setAmt('')
  }

  return (
    <div
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-lg border p-2.5 transition-opacity',
        current ? 'border-accent bg-accent/5' : 'border-border bg-surface opacity-50 hover:opacity-100'
      )}
    >
      <div className="flex w-12 shrink-0 flex-col items-center gap-0.5">
        <input
          type="number"
          value={unit.initiative}
          onChange={(e) => update(unit.id, { initiative: Number(e.target.value) })}
          onBlur={sort}
          className="w-12 rounded bg-surface-2 py-0.5 text-center text-lg font-semibold text-ink focus:outline-none"
        />
        <div className="flex items-center gap-1">
          <span className="text-[11px] uppercase tracking-wide text-ink-muted">init</span>
          <button
            type="button"
            title={unit.locked ? 'Unlock — Roll all can change it' : 'Lock — Roll all leaves it alone'}
            onClick={() => update(unit.id, { locked: !unit.locked })}
            className={cn('hover:text-ink', unit.locked ? 'text-accent' : 'text-ink-muted')}
          >
            {unit.locked ? <Lock size={12} /> : <LockOpen size={12} />}
          </button>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {current && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
          {unit.contentId ? (
            <button
              type="button"
              className="truncate font-medium text-ink hover:text-accent"
              onClick={() => unit.contentId && openDrawer(unit.contentId)}
            >
              {unit.name}
            </button>
          ) : (
            <span className="truncate font-medium text-ink">{unit.name}</span>
          )}
          {unit.isPC && (
            <span className="rounded bg-info/15 px-1 text-[10px] font-semibold uppercase text-info">PC</span>
          )}
        </div>
        <div className="mt-1.5">
          <ConditionsCell
            conditions={unit.conditions}
            onChange={(next) => update(unit.id, { conditions: next })}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1 self-center">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn('h-full transition-all', hpColor(unit.hpCurrent, unit.hpMax))}
            style={{ width: `${unit.hpMax ? (unit.hpCurrent / unit.hpMax) * 100 : 0}%` }}
          />
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={unit.hpCurrent}
            onChange={(e) => update(unit.id, { hpCurrent: Number(e.target.value) })}
            className="w-12 rounded bg-surface-2 px-1 py-0.5 text-center text-sm text-ink focus:outline-none"
          />
          <span className="text-ink-muted">/</span>
          <input
            type="number"
            value={unit.hpMax}
            onChange={(e) => update(unit.id, { hpMax: Number(e.target.value) })}
            className="w-12 rounded bg-surface-2 px-1 py-0.5 text-center text-sm text-ink-muted focus:outline-none"
          />
          <input
            type="number"
            value={amt}
            placeholder="±"
            onChange={(e) => setAmt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyDamage(1)}
            className="ml-1 w-12 rounded border border-border bg-surface-2 px-1 py-0.5 text-center text-sm focus:outline-none"
          />
          <button
            type="button"
            className="rounded bg-danger/15 px-1.5 py-0.5 text-xs text-danger hover:bg-danger/25"
            title="Damage"
            onClick={() => applyDamage(1)}
          >
            −
          </button>
          <button
            type="button"
            className="rounded bg-success/15 px-1.5 py-0.5 text-xs text-success hover:bg-success/25"
            title="Heal"
            onClick={() => applyDamage(-1)}
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        className="icon-btn ml-3 h-7 w-7 shrink-0 self-center hover:text-danger"
        title="Remove"
        onClick={() => remove(unit.id)}
      >
        <X size={15} />
      </button>
    </div>
  )
}

export function InitiativeTracker(): JSX.Element {
  const units = useCombatStore((s) => s.units)
  const round = useCombatStore((s) => s.round)
  const turnId = useCombatStore((s) => s.turnId)
  const nextTurn = useCombatStore((s) => s.nextTurn)
  const rollAll = useCombatStore((s) => s.rollAll)
  const reset = useCombatStore((s) => s.reset)
  const addUnit = useCombatStore((s) => s.addUnit)
  const pcs = usePcStore((s) => s.pcs)
  const [addOpen, setAddOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [anim, setAnim] = useState<{ order: CombatUnit[]; ghost: CombatUnit; shift: number } | null>(
    null
  )

  const ordered = useMemo(() => [...units].sort((a, b) => b.initiative - a.initiative), [units])
  // Rotate so the current turn is always at the top; the rest wrap below it.
  const turnIdx = ordered.findIndex((u) => u.id === turnId)
  const rotated = turnIdx >= 0 ? [...ordered.slice(turnIdx), ...ordered.slice(0, turnIdx)] : ordered

  // Scroll the list back to the top whenever the turn advances.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [turnId])

  // Advance the turn with a scroll-up: the finished top card slides up and fades
  // out, the rest move up a slot, and the card wraps back in at the bottom. We
  // play the animation first, then commit the turn change once it lands.
  const advance = (): void => {
    if (anim) return
    if (rotated.length < 2) {
      nextTurn()
      return
    }
    const firstEl = listRef.current?.firstElementChild as HTMLElement | null
    const shift = -((firstEl?.offsetHeight ?? 64) + 8) // one row + the space-y gap
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setAnim({ order: rotated, ghost: rotated[0], shift: 0 })
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setAnim((a) => (a ? { ...a, shift } : a)))
    )
    window.setTimeout(() => {
      nextTurn()
      setAnim(null)
    }, 400)
  }
  const advanceRef = useRef(advance)
  advanceRef.current = advance

  const addParty = (): void => {
    const existing = new Set(units.map((u) => u.name.toLowerCase()))
    pcs.forEach((pc) => {
      if (existing.has(pc.name.toLowerCase())) return
      addUnit({
        name: pc.name,
        isPC: true,
        initiative: 0,
        locked: false,
        hpCurrent: pc.currentHp ?? pc.maxHp ?? 0,
        hpMax: pc.maxHp ?? 0,
        conditions: []
      })
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Space') return
      const el = document.activeElement
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return
      e.preventDefault()
      advanceRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isEmpty = (anim ? anim.order : rotated).length === 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-muted">
            Round <span className="text-lg font-semibold text-ink">{round}</span>
          </span>
          <button type="button" className="btn-accent" onClick={advance} disabled={!units.length}>
            <SkipForward size={15} />
            Next
            <kbd className="ml-1 rounded bg-black/20 px-1 text-[10px]">Space</kbd>
          </button>
        </div>
        {!isEmpty && (
          <KebabMenu
            onAdd={() => setAddOpen(true)}
            onAddParty={addParty}
            onRollAll={rollAll}
            onReset={reset}
            hasPcs={pcs.length > 0}
          />
        )}
      </div>

      <div
        ref={scrollRef}
        className={cn('min-h-0 flex-1 p-4', anim ? 'overflow-hidden' : 'overflow-y-auto')}
      >
        {isEmpty ? (
          <EmptyState
            icon={Swords}
            title="No combatants"
            description="Add players and monsters, roll initiative, and run the fight — Space advances the turn."
          >
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={() => setAddOpen(true)}>
                <Plus size={15} />
                Add
              </button>
              <button type="button" className="btn-ghost" onClick={addParty} disabled={!pcs.length}>
                <Users size={15} />
                Add party
              </button>
            </div>
          </EmptyState>
        ) : (
          <div
            ref={listRef}
            className="space-y-2"
            style={
              anim
                ? {
                    transform: `translateY(${anim.shift}px)`,
                    transition: anim.shift !== 0 ? 'transform 380ms cubic-bezier(0.4,0,0.2,1)' : 'none'
                  }
                : undefined
            }
          >
            {(anim ? anim.order : rotated).map((u, i) => (
              <CombatRow
                key={u.id}
                unit={u}
                current={u.id === turnId}
                style={
                  anim && i === 0
                    ? { opacity: anim.shift !== 0 ? 0 : 1, transition: 'opacity 380ms ease' }
                    : anim && i === 1
                      ? { opacity: anim.shift !== 0 ? 1 : 0.5, transition: 'opacity 380ms ease' }
                      : undefined
                }
              />
            ))}
            {anim && (
              <CombatRow
                key={`ghost-${anim.ghost.id}`}
                unit={anim.ghost}
                current={false}
                style={{ opacity: anim.shift !== 0 ? 0.5 : 0, transition: 'opacity 380ms ease' }}
              />
            )}
          </div>
        )}
      </div>

      {addOpen && <AddCombatantModal onClose={() => setAddOpen(false)} />}
    </div>
  )
}
