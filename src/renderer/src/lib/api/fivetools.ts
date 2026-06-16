import type { ContentEntry, ContentType } from '@/types/content'
import rawData from './srd-data.json'

const srdEntries = rawData as ContentEntry[]

export interface SrdGroup {
  label: string
  types: ContentType[]
  fetch: () => Promise<ContentEntry[]>
}

function byType(types: ContentType[]): () => Promise<ContentEntry[]> {
  return async () => srdEntries.filter((e) => types.includes(e.type))
}

export const SRD_GROUPS: SrdGroup[] = [
  { label: 'Spells',              types: ['spell'],              fetch: byType(['spell'])              },
  { label: 'Monsters',            types: ['monster'],            fetch: byType(['monster'])            },
  { label: 'Magic items',         types: ['item'],               fetch: byType(['item'])               },
  { label: 'Weapons',             types: ['weapon'],             fetch: byType(['weapon'])             },
  { label: 'Conditions',          types: ['condition'],          fetch: byType(['condition'])          },
  { label: 'Classes & subclasses',types: ['class', 'subclass'], fetch: byType(['class', 'subclass']) },
]
