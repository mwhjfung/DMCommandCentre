import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { DetailDrawer } from '@/components/DetailDrawer'
import { Toast } from '@/components/Toast'
import { VoiceDock } from '@/features/voice/VoiceDock'
import { EntryEditor } from '@/features/library/EntryEditor'
import { ImportDialog } from '@/features/library/ImportDialog'
import { useContentStore } from '@/lib/store/contentStore'
import { useVoiceStore } from '@/lib/store/voiceStore'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { useCombatStore } from '@/lib/store/combatStore'
import { usePcStore } from '@/lib/store/pcStore'
import { useCampaignStore } from '@/lib/store/campaignStore'
import { useSessionStore } from '@/lib/store/sessionStore'
import { useNotesStore } from '@/lib/store/notesStore'
import { useUiStore } from '@/lib/store/uiStore'
import { seedFeats } from '@/lib/feats/seedFeats'
import { seedBackgrounds } from '@/lib/feats/seedBackgrounds'

export function AppLayout(): JSX.Element {
  const loadCampaigns = useCampaignStore((s) => s.load)
  const loadSessions = useSessionStore((s) => s.load)
  const loadContent = useContentStore((s) => s.load)
  const loadVoiceSettings = useVoiceStore((s) => s.loadSettings)
  const loadAppSettings = useSettingsStore((s) => s.load)
  const loadCombat = useCombatStore((s) => s.load)
  const loadPcs = usePcStore((s) => s.load)
  const loadNotes = useNotesStore((s) => s.load)
  const loadUi = useUiStore((s) => s.loadUi)
  const importOpen = useUiStore((s) => s.importOpen)

  useEffect(() => {
    void (async () => {
      // Campaigns, then that campaign's sessions, so the per-session stores
      // (pins, combat, notes) read the right scope.
      await loadCampaigns()
      await loadSessions()
      await Promise.all([loadContent(), loadCombat(), loadPcs(), loadNotes()])
      await seedFeats()
      await seedBackgrounds()
    })()
    void loadVoiceSettings()
    void loadAppSettings()
    void loadUi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-ink">
      <Sidebar />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <Outlet />
        <DetailDrawer />
      </main>
      <VoiceDock />
      <EntryEditor />
      {importOpen && <ImportDialog />}
      <Toast />
    </div>
  )
}
