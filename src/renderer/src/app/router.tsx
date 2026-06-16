import { createHashRouter } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { DashboardPage } from '@/features/board/DashboardPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { SessionPage } from '@/features/session/SessionPage'
import { PartyPage } from '@/features/party/PartyPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'session', element: <SessionPage /> },
      { path: 'party', element: <PartyPage /> },
      { path: 'settings', element: <SettingsPage /> }
    ]
  }
])
