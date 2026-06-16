import { useCombatStore } from './combatStore'
import { usePcStore } from './pcStore'
import { useContentStore } from './contentStore'
import { useNotesStore } from './notesStore'

/** Reload the per-session stores (after switching dashboard sessions). */
export function reloadSessionScoped(): void {
  void useCombatStore.getState().load()
  void useContentStore.getState().loadPins()
  void useNotesStore.getState().load()
}

/** Reload everything scoped to a campaign (after switching campaigns). */
export function reloadCampaignScoped(): void {
  reloadSessionScoped()
  void usePcStore.getState().load()
  useContentStore.getState().refreshForCampaign()
}
