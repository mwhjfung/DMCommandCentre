import { Page } from '@/components/Page'
import { InitiativeTracker } from './InitiativeTracker'

export function SessionPage(): JSX.Element {
  return (
    <Page title="Session" subtitle="Initiative tracker" flush>
      <InitiativeTracker />
    </Page>
  )
}
