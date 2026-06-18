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

function parseRawList(data: unknown): Array<Omit<PcUnit, 'id'>> {
  const list: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { characters?: unknown }).characters)
      ? (data as { characters: unknown[] }).characters
      : [data]
  return list
    .filter((raw): raw is Record<string, unknown> => raw != null && typeof raw === 'object')
    .map((raw) => coercePc(raw as Partial<PcUnit>))
}

/** Parse a JSON file into PC objects without adding them to the store. */
export async function parseCharactersFromFile(file: File): Promise<Array<Omit<PcUnit, 'id'>>> {
  return parseRawList(JSON.parse(await file.text()))
}

/** Read characters from a JSON file (our export shape, leniently) and add them. */
export async function importCharactersFromFile(file: File): Promise<number> {
  const pcs = await parseCharactersFromFile(file)
  const addPc = usePcStore.getState().addPc
  for (const pc of pcs) addPc(pc)
  return pcs.length
}
