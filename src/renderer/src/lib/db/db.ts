import Dexie, { type Table } from 'dexie'
import type { ContentEntry } from '@/types/content'
import type { Session, Pc, Combatant, AppSetting } from '@/types/db'

/**
 * The single local source of truth. Everything persists here (IndexedDB via
 * Dexie); Zustand stores read and write through this layer.
 */
export class DmcDatabase extends Dexie {
  content!: Table<ContentEntry, string>
  sessions!: Table<Session, string>
  pcs!: Table<Pc, string>
  combatants!: Table<Combatant, string>
  settings!: Table<AppSetting, string>

  constructor() {
    super('dm-command')
    this.version(1).stores({
      content: 'id, type, source, name, slug, updatedAt, *tags',
      sessions: 'id, startedAt, updatedAt',
      pcs: 'id, name, updatedAt',
      combatants: 'id, sessionId, order',
      settings: 'key'
    })
  }
}

export const db = new DmcDatabase()
