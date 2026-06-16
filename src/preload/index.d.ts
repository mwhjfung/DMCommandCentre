export interface DmcApi {
  secrets: {
    get: (key: string) => Promise<string | undefined>
    set: (key: string, value: string) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  ddb: {
    character: (id: string) => Promise<unknown>
  }
  platform: string
}

declare global {
  interface Window {
    dmc: DmcApi
  }
}
