import { contextBridge, ipcRenderer } from 'electron'
import type { UpdaterStatus } from '../main/updater'

const dmc = {
  secrets: {
    get: (key: string): Promise<string | undefined> => ipcRenderer.invoke('secrets:get', key),
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('secrets:set', key, value),
    delete: (key: string): Promise<void> => ipcRenderer.invoke('secrets:delete', key)
  },
  ddb: {
    character: (id: string): Promise<unknown> => ipcRenderer.invoke('ddb:character', id)
  },
  updater: {
    check: (): Promise<void> => ipcRenderer.invoke('updater:check'),
    download: (): Promise<void> => ipcRenderer.invoke('updater:download'),
    install: (releaseUrl?: string): Promise<void> =>
      ipcRenderer.invoke('updater:install', releaseUrl),
    onStatus: (cb: (s: UpdaterStatus) => void): (() => void) => {
      const fn = (_e: Electron.IpcRendererEvent, s: UpdaterStatus): void => cb(s)
      ipcRenderer.on('updater:status', fn)
      return () => ipcRenderer.removeListener('updater:status', fn)
    }
  },
  platform: process.platform
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('dmc', dmc)
  } catch (error) {
    console.error('Failed to expose dmc API via contextBridge', error)
  }
} else {
  // Fallback when context isolation is disabled (should not happen in this app).
  // @ts-ignore - window is typed via src/preload/index.d.ts
  window.dmc = dmc
}
