import { create } from 'zustand'
import { getSetting, setSetting } from '@/lib/db/content'
import { getActiveCampaignId } from './activeCampaign'
import { getActiveSessionId } from './activeSession'

export interface CombatUnit {
  id: string
  name: string
  /** Linked monster/NPC content entry, if added from the library. */
  contentId?: string
  isPC: boolean
  initiative: number
  /** When locked, "Roll all" leaves this unit's initiative untouched. */
  locked: boolean
  hpCurrent: number
  hpMax: number
  hpTemp: number
  conditions: string[]
}

const stateKey = (): string => `combatState:${getActiveCampaignId()}:${getActiveSessionId()}`

const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const byInitiative = (a: CombatUnit, b: CombatUnit): number => b.initiative - a.initiative

interface CombatState {
  units: CombatUnit[]
  round: number
  turnId: string | null
  loaded: boolean
  load: () => Promise<void>
  addUnit: (u: Omit<CombatUnit, 'id'>) => void
  updateUnit: (id: string, patch: Partial<CombatUnit>) => void
  removeUnit: (id: string) => void
  rollAll: () => void
  sort: () => void
  nextTurn: () => void
  reset: () => void
}

export const useCombatStore = create<CombatState>((set, get) => {
  const persist = (): void => {
    const { units, round, turnId } = get()
    void setSetting(stateKey(), { units, round, turnId })
  }

  return {
    units: [],
    round: 0,
    turnId: null,
    loaded: false,

    load: async () => {
      const saved = await getSetting<{ units: CombatUnit[]; round: number; turnId: string | null }>(
        stateKey()
      )
      set({
        units: (saved?.units ?? []).map((u) => ({ ...u, locked: u.locked ?? false, hpTemp: u.hpTemp ?? 0 })),
        round: saved?.round ?? 0,
        turnId: saved?.turnId ?? null,
        loaded: true
      })
    },

    addUnit: (u) => {
      const unit: CombatUnit = { ...u, id: uuid() }
      set((s) => {
        const units = [...s.units, unit].sort(byInitiative)
        return { units, turnId: s.turnId ?? unit.id }
      })
      persist()
    },

    updateUnit: (id, patch) => {
      set((s) => ({ units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) }))
      persist()
    },

    removeUnit: (id) => {
      set((s) => {
        const units = s.units.filter((u) => u.id !== id)
        const turnId = s.turnId === id ? (units[0]?.id ?? null) : s.turnId
        return { units, turnId }
      })
      persist()
    },

    rollAll: () => {
      set((s) => {
        const units = s.units
          .map((u) => (u.locked ? u : { ...u, initiative: 1 + Math.floor(Math.random() * 20) }))
          .sort(byInitiative)
        return { units, turnId: units[0]?.id ?? null, round: 1 }
      })
      persist()
    },

    sort: () => {
      set((s) => ({ units: [...s.units].sort(byInitiative) }))
      persist()
    },

    nextTurn: () => {
      set((s) => {
        if (!s.units.length) return s
        const ordered = [...s.units].sort(byInitiative)
        const idx = ordered.findIndex((u) => u.id === s.turnId)
        const nextIdx = idx < 0 ? 0 : (idx + 1) % ordered.length
        const wrapped = idx >= 0 && nextIdx === 0
        return {
          units: ordered,
          turnId: ordered[nextIdx].id,
          round: wrapped ? s.round + 1 : s.round
        }
      })
      persist()
    },

    reset: () => {
      set({ units: [], round: 0, turnId: null })
      persist()
    }
  }
})
