import { usePcStore, coercePc, type PcUnit } from '@/lib/store/pcStore'

/** Download all characters in the active campaign as a JSON file. */
export function exportCharacters(): number {
  const pcs = usePcStore.getState().pcs
  const blob = new Blob([JSON.stringify({ characters: pcs }, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dm-command-characters-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  return pcs.length
}

/** Read characters from a JSON file (our export shape, leniently) and add them. */
export async function importCharactersFromFile(file: File): Promise<number> {
  const data: unknown = JSON.parse(await file.text())
  const list: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { characters?: unknown }).characters)
      ? (data as { characters: unknown[] }).characters
      : [data]

  const addPc = usePcStore.getState().addPc
  let n = 0
  for (const raw of list) {
    if (raw && typeof raw === 'object') {
      addPc(coercePc(raw as Partial<PcUnit>))
      n += 1
    }
  }
  return n
}
