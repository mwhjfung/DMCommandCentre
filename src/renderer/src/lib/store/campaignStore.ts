import { create } from 'zustand'
import { db } from '@/lib/db/db'
import { getSetting, setSetting } from '@/lib/db/content'
import { useSessionStore } from './sessionStore'
import { reloadCampaignScoped } from './scopedReload'
import { setActiveCampaignId } from './activeCampaign'

export interface Campaign {
  id: string
  name: string
  icon?: string
  createdAt: number
}

const CAMPAIGNS_KEY = 'campaigns'
const ACTIVE_KEY = 'activeCampaignId'

const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Per-campaign settings keys (combat/party/board), scoped by id. */
export const scopedKey = (base: string, id: string): string => `${base}:${id}`

/** Move pre-campaign global data into the first campaign so nothing is lost. */
async function migrateGlobal(id: string): Promise<void> {
  for (const base of ['combatState', 'pcs', 'pinnedIds']) {
    const oldVal = await getSetting<unknown>(base)
    const newVal = await getSetting<unknown>(scopedKey(base, id))
    if (oldVal != null && newVal == null) await setSetting(scopedKey(base, id), oldVal)
  }
}

interface CampaignState {
  campaigns: Campaign[]
  activeId: string
  loaded: boolean
  load: () => Promise<void>
  create: (name: string, icon?: string) => Promise<void>
  update: (id: string, patch: Partial<Pick<Campaign, 'name' | 'icon'>>) => void
  remove: (id: string) => Promise<void>
  setActive: (id: string) => void
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: [],
  activeId: '',
  loaded: false,

  load: async () => {
    let campaigns = await getSetting<Campaign[]>(CAMPAIGNS_KEY)
    let activeId = await getSetting<string>(ACTIVE_KEY)

    if (!campaigns || campaigns.length === 0) {
      const def: Campaign = { id: uuid(), name: 'Main', icon: '🎲', createdAt: Date.now() }
      campaigns = [def]
      activeId = def.id
      await setSetting(CAMPAIGNS_KEY, campaigns)
      await setSetting(ACTIVE_KEY, activeId)
      await migrateGlobal(def.id)
    }
    if (!activeId || !campaigns.some((c) => c.id === activeId)) {
      activeId = campaigns[0].id
      await setSetting(ACTIVE_KEY, activeId)
    }
    setActiveCampaignId(activeId)
    set({ campaigns, activeId, loaded: true })
  },

  create: async (name, icon) => {
    const campaign: Campaign = {
      id: uuid(),
      name: name.trim() || 'Untitled',
      icon,
      createdAt: Date.now()
    }
    const campaigns = [...get().campaigns, campaign]
    set({ campaigns })
    await setSetting(CAMPAIGNS_KEY, campaigns)
    get().setActive(campaign.id)
  },

  update: (id, patch) => {
    const campaigns = get().campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c))
    set({ campaigns })
    void setSetting(CAMPAIGNS_KEY, campaigns)
  },

  remove: async (id) => {
    const remaining = get().campaigns.filter((c) => c.id !== id)
    // Always keep at least one campaign.
    const campaigns = remaining.length
      ? remaining
      : [{ id: uuid(), name: 'Main', icon: '🎲', createdAt: Date.now() }]
    await setSetting(CAMPAIGNS_KEY, campaigns)
    for (const base of ['combatState', 'pcs', 'pinnedIds']) {
      await db.settings.delete(scopedKey(base, id))
    }
    set({ campaigns })
    if (get().activeId === id) get().setActive(campaigns[0].id)
  },

  setActive: (id) => {
    setActiveCampaignId(id)
    set({ activeId: id })
    void setSetting(ACTIVE_KEY, id)
    // Load the new campaign's sessions (sets the session holder) before the
    // per-session stores reload off the new scope.
    void (async () => {
      await useSessionStore.getState().load()
      reloadCampaignScoped()
    })()
  }
}))
