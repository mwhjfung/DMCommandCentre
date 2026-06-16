import { create } from 'zustand'
import { getSetting, setSetting } from '@/lib/db/content'
import { getActiveCampaignId } from './activeCampaign'
import { getActiveSessionId } from './activeSession'

export interface Note {
  id: string
  text: string
  createdAt: number
}

// Notes are scoped per campaign + session.
const key = (): string => `notes:${getActiveCampaignId()}:${getActiveSessionId()}`

const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

interface NotesState {
  notes: Note[]
  load: () => Promise<void>
  add: (text: string) => void
  remove: (id: string) => void
  clear: () => void
}

export const useNotesStore = create<NotesState>((set, get) => {
  const persist = (notes: Note[]): void => void setSetting(key(), notes)
  return {
    notes: [],
    load: async () => set({ notes: (await getSetting<Note[]>(key())) ?? [] }),
    add: (text) => {
      const t = text.trim()
      if (!t) return
      const notes = [...get().notes, { id: uuid(), text: t, createdAt: Date.now() }]
      set({ notes })
      persist(notes)
    },
    remove: (id) => {
      const notes = get().notes.filter((n) => n.id !== id)
      set({ notes })
      persist(notes)
    },
    clear: () => {
      set({ notes: [] })
      persist([])
    }
  }
})
