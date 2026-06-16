/**
 * Tiny holder for the active dashboard-session id, read by the per-session
 * stores (pins, combat, notes) without importing sessionStore — avoids a cycle.
 */
let activeSessionId = ''

export const getActiveSessionId = (): string => activeSessionId
export const setActiveSessionId = (id: string): void => {
  activeSessionId = id
}
