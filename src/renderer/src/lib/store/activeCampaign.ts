/**
 * Tiny holder for the active campaign id, read by the per-campaign stores
 * (combat, party, pins) without importing campaignStore — avoids an import cycle.
 */
let activeId = ''

export const getActiveCampaignId = (): string => activeId
export const setActiveCampaignId = (id: string): void => {
  activeId = id
}
