/**
 * Non-content database records. Content lives in its own model (types/content).
 * Fields here are intentionally lean for now and fleshed out by their feature
 * tasks (Session = #8, Pc/Combatant = #7).
 */

export interface Session {
  id: string
  campaignId?: string
  title: string
  startedAt: number
  endedAt?: number
  /** Full rolling transcript captured while the mic was on. */
  transcript: string
  dmNotes?: string
  pcNames?: string[]
  playerSummary?: string
  dmSummary?: string
  createdAt: number
  updatedAt: number
}

export interface SpellSlotLevel {
  level: number
  max: number
  current: number
}

export interface Pc {
  id: string
  name: string
  charClass?: string
  level?: number
  spellSlots: SpellSlotLevel[]
  createdAt: number
  updatedAt: number
}

export interface Combatant {
  id: string
  sessionId: string
  name: string
  /** Optional link to a monster/NPC content entry. */
  contentId?: string
  isPC: boolean
  initiative: number
  hpCurrent: number
  hpMax: number
  conditions: string[]
  /** Sort order within the initiative list. */
  order: number
  createdAt: number
}

export interface AppSetting {
  key: string
  value: unknown
}
