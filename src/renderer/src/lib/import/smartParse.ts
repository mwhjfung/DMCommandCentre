import { callClaude } from '@/lib/api/anthropic'
import { TEMPLATES, CREATABLE_TYPES, makeNewEntry, recomputeSummary } from '@/lib/templates/schemas'
import type { ContentEntry, ContentType } from '@/types/content'

/** A compact description of each type's data fields, kept in sync with TEMPLATES. */
function schemaGuide(): string {
  return CREATABLE_TYPES.map((t) => `- ${t}: ${TEMPLATES[t].fields.map((f) => f.key).join(', ')}`).join(
    '\n'
  )
}

const SYSTEM = `You are a precise data extractor for a Dungeons & Dragons 5e toolkit. You are given the text of a document the user owns. Extract every distinct game element from it — spells, monsters/NPCs, items, weapons, conditions, classes, subclasses, or world entries.

Output ONLY a JSON array (no prose, no markdown code fences). Each element:
{ "type": <one of: ${CREATABLE_TYPES.join(', ')}>, "name": string, "summary": one short line, "tags": string[], "data": { type-specific fields } }

Type-specific "data" fields:
${schemaGuide()}

Rules:
- "abilities" is an object {str,dex,con,int,wis,cha} of numbers.
- "traits", "actions", "reactions", "legendaryActions" are arrays of {name, desc}.
- "properties", "classes", "connections", "subclasses" are string arrays.
- "level" is a number (0 = cantrip); "concentration", "ritual", "attunement" are booleans.
- Put descriptive prose in the type's description (or "lore" for monsters) field.
- Omit any field you are unsure about. Do not invent content that is not in the document.`

function extractJsonArray(raw: string): unknown[] {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw
  const parsed = JSON.parse(slice)
  if (!Array.isArray(parsed)) throw new Error('Claude did not return a list of entries.')
  return parsed
}

function toEntry(obj: unknown): ContentEntry | null {
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const type = o.type as ContentType
  if (!CREATABLE_TYPES.includes(type) || !o.name) return null

  const entry = makeNewEntry(type)
  entry.name = String(o.name)
  if (Array.isArray(o.tags)) entry.tags = o.tags.map(String)
  if (o.world) entry.world = String(o.world)
  if (o.notes) entry.notes = String(o.notes)
  if (o.data && typeof o.data === 'object') {
    Object.assign(entry.data as unknown as Record<string, unknown>, o.data)
  }
  if (entry.type === 'spell') {
    entry.data.levelText = entry.data.level === 0 ? 'Cantrip' : `Level ${entry.data.level}`
  }
  entry.summary = o.summary ? String(o.summary) : recomputeSummary(entry)
  return entry
}

/** Ask Claude to read a document and return structured content entries. */
export async function smartParse(docText: string): Promise<ContentEntry[]> {
  const raw = await callClaude({
    system: SYSTEM,
    prompt: `Document:\n\n${docText.slice(0, 60000)}`,
    maxTokens: 16000
  })
  return extractJsonArray(raw)
    .map(toEntry)
    .filter((e): e is ContentEntry => e !== null)
}
