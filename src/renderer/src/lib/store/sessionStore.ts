import { create } from 'zustand'
import { db } from '@/lib/db/db'
import { getSetting, setSetting } from '@/lib/db/content'
import { getActiveCampaignId } from './activeCampaign'
import { getActiveSessionId, setActiveSessionId } from './activeSession'
import { reloadSessionScoped } from './scopedReload'

/** A dashboard session — a game-night workspace (its own pins, combat, notes). */
export interface DashSession {
  id: string
  name: string
  /** The auto-incrementing number behind the default "Session N" name. */
  num: number
  createdAt: number
}

/** What can be carried over from the current session when creating a new one. */
export interface CarryOver {
  pins: boolean
  initiative: boolean
  notes: boolean
}

// The blob bases that are scoped per campaign + session.
const SCOPED_BASES = { pins: 'pinnedIds', initiative: 'combatState', notes: 'notes' } as const

const sessionsKey = (campaignId: string): string => `sessions:${campaignId}`
const activeKey = (campaignId: string): string => `activeSessionId:${campaignId}`
const scoped = (base: string, campaignId: string, sessionId: string): string =>
  `${base}:${campaignId}:${sessionId}`

const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Move pre-session, campaign-level pins/combat into the first session. */
async function migrateToSession(campaignId: string, sessionId: string): Promise<void> {
  for (const base of ['pinnedIds', 'combatState']) {
    const old = await getSetting<unknown>(`${base}:${campaignId}`)
    const next = await getSetting<unknown>(scoped(base, campaignId, sessionId))
    if (old != null && next == null) await setSetting(scoped(base, campaignId, sessionId), old)
  }
}

interface SessionState {
  sessions: DashSession[]
  activeId: string
  loaded: boolean
  /** Load (or create) the sessions for the active campaign and set the holder. */
  load: () => Promise<void>
  create: (name: string, carry: CarryOver) => Promise<void>
  rename: (id: string, name: string) => void
  remove: (id: string) => Promise<void>
  resetLatest: () => Promise<void>
  setActive: (id: string) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeId: '',
  loaded: false,

  load: async () => {
    const campaignId = getActiveCampaignId()
    let sessions = await getSetting<DashSession[]>(sessionsKey(campaignId))
    let activeId = await getSetting<string>(activeKey(campaignId))

    if (!sessions || sessions.length === 0) {
      const def: DashSession = { id: uuid(), name: 'Session 1', num: 1, createdAt: Date.now() }
      sessions = [def]
      activeId = def.id
      await setSetting(sessionsKey(campaignId), sessions)
      await setSetting(activeKey(campaignId), activeId)
      await migrateToSession(campaignId, def.id)
    }
    if (!activeId || !sessions.some((s) => s.id === activeId)) {
      activeId = sessions[sessions.length - 1].id
      await setSetting(activeKey(campaignId), activeId)
    }
    setActiveSessionId(activeId)
    set({ sessions, activeId, loaded: true })
  },

  create: async (name, carry) => {
    const campaignId = getActiveCampaignId()
    const from = get().activeId
    const num = Math.max(0, ...get().sessions.map((s) => s.num)) + 1
    const session: DashSession = {
      id: uuid(),
      name: name.trim() || `Session ${num}`,
      num,
      createdAt: Date.now()
    }

    // Copy across whatever the DM ticked to retain.
    for (const part of ['pins', 'initiative', 'notes'] as const) {
      if (!carry[part]) continue
      const val = await getSetting<unknown>(scoped(SCOPED_BASES[part], campaignId, from))
      if (val != null) await setSetting(scoped(SCOPED_BASES[part], campaignId, session.id), val)
    }

    const sessions = [...get().sessions, session]
    await setSetting(sessionsKey(campaignId), sessions)
    set({ sessions })
    get().setActive(session.id)
  },

  rename: (id, name) => {
    const sessions = get().sessions.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s))
    set({ sessions })
    void setSetting(sessionsKey(getActiveCampaignId()), sessions)
  },

  remove: async (id) => {
    const campaignId = getActiveCampaignId()
    for (const base of Object.values(SCOPED_BASES)) {
      await db.settings.delete(scoped(base, campaignId, id))
    }
    let sessions = get().sessions.filter((s) => s.id !== id)
    if (sessions.length === 0) {
      const def: DashSession = { id: uuid(), name: 'Session 1', num: 1, createdAt: Date.now() }
      sessions = [def]
    }
    await setSetting(sessionsKey(campaignId), sessions)
    set({ sessions })
    if (getActiveSessionId() === id) get().setActive(sessions[sessions.length - 1].id)
  },

  resetLatest: async () => {
    const campaignId = getActiveCampaignId()
    const activeId = get().activeId
    await Promise.all(
      Object.values(SCOPED_BASES).map((base) =>
        db.settings.delete(scoped(base, campaignId, activeId))
      )
    )
    reloadSessionScoped()
  },

  setActive: (id) => {
    setActiveSessionId(id)
    set({ activeId: id })
    void setSetting(activeKey(getActiveCampaignId()), id)
    reloadSessionScoped()
  }
}))
