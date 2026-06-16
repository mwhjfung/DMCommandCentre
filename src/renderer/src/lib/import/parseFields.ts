import type { ContentType } from '@/types/content'

/**
 * Heuristic field extraction from a block of stat-block text. No AI — just
 * pattern-matching the regular shapes D&D content tends to use. Whatever it
 * can't place stays in the description for the review step to sort out.
 */

const DAMAGE_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder'
]

const WEAPON_PROPERTIES = [
  'ammunition',
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'special',
  'thrown',
  'two-handed',
  'versatile'
]

const RARITIES = ['very rare', 'uncommon', 'common', 'rare', 'legendary', 'artifact']
const SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/** Pull dice and type out of a combined damage string like "1d4 bludgeoning". */
export function splitDamage(s: string): { dice: string; type?: string } {
  const dice = s.match(/\b(\d+d\d+(?:\s*[+-]\s*\d+)?)\b/)
  const lower = s.toLowerCase()
  const type = DAMAGE_TYPES.find((t) => lower.includes(t))
  return {
    dice: dice ? dice[1].replace(/\s+/g, '') : s.trim(),
    type: type ? cap(type) : undefined
  }
}

/** Grab the text after a "Label: value" or "Label value" line. */
function after(body: string, label: string): string | undefined {
  const m = body.match(new RegExp(`${label}\\s*:?\\s*([^\\n]+)`, 'i'))
  return m ? m[1].trim().replace(/\s+/g, ' ') : undefined
}

function parseWeapon(body: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const dice = body.match(/\b(\d+d\d+(?:\s*[+-]\s*\d+)?)\b/)
  if (dice) out.damageDice = dice[1].replace(/\s+/g, '')
  const lower = body.toLowerCase()
  const dtype = DAMAGE_TYPES.find((t) => lower.includes(t))
  if (dtype) out.damageType = cap(dtype)
  const props = WEAPON_PROPERTIES.filter((p) => new RegExp(`\\b${p}\\b`, 'i').test(body)).map(cap)
  if (props.length) out.properties = props
  const weight = body.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound)/i)
  if (weight) out.weight = `${weight[1]} lb.`
  const cost = body.match(/(\d+(?:,\d+)?)\s*(gp|sp|cp|pp|ep)\b/i)
  if (cost) out.cost = `${cost[1]} ${cost[2].toLowerCase()}`
  return out
}

function parseMonster(body: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const ac = after(body, 'Armou?r Class')
  if (ac) out.ac = ac
  const hp = after(body, 'Hit Points')
  if (hp) out.hp = hp
  const speed = after(body, 'Speed')
  if (speed) out.speed = speed
  const cr = body.match(/Challenge\s*:?\s*([0-9/]+)/i)
  if (cr) out.cr = cr[1]
  const saves = after(body, 'Saving Throws')
  if (saves) out.saves = saves
  const skills = after(body, 'Skills')
  if (skills) out.skills = skills
  const senses = after(body, 'Senses')
  if (senses) out.senses = senses
  const languages = after(body, 'Languages')
  if (languages) out.languages = languages

  const size = SIZES.find((s) => new RegExp(`\\b${s}\\b`, 'i').test(body))
  if (size) {
    out.size = cap(size)
    const typeM = body.match(new RegExp(`${size}\\s+([a-z]+)`, 'i'))
    if (typeM) out.creatureType = typeM[1].toLowerCase()
  }
  const align = body.match(/\b((?:lawful|neutral|chaotic)\s+(?:good|neutral|evil)|unaligned|any alignment)\b/i)
  if (align) out.alignment = align[1].toLowerCase()

  // Ability scores: six "12 (+1)" pairs in STR DEX CON INT WIS CHA order.
  const scores = [...body.matchAll(/\b(\d{1,2})\s*\(\s*[+-]\d+\s*\)/g)].map((m) => Number(m[1]))
  if (scores.length >= 6) {
    out.abilities = {
      str: scores[0],
      dex: scores[1],
      con: scores[2],
      int: scores[3],
      wis: scores[4],
      cha: scores[5]
    }
  }
  return out
}

function parseSpell(body: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const lvl = body.match(/(\d+)(?:st|nd|rd|th)[-\s]level\s+(\w+)/i)
  if (lvl) {
    out.level = Number(lvl[1])
    out.levelText = `Level ${lvl[1]}`
    out.school = cap(lvl[2].toLowerCase())
  } else if (/\bcantrip\b/i.test(body)) {
    out.level = 0
    out.levelText = 'Cantrip'
    const school = body.match(/cantrip[^a-z]*([a-z]+)/i) || body.match(/([a-z]+)\s+cantrip/i)
    if (school) out.school = cap(school[1].toLowerCase())
  }
  const ct = after(body, 'Casting Time')
  if (ct) out.castingTime = ct
  const range = after(body, 'Range')
  if (range) out.range = range
  const comp = after(body, 'Components')
  if (comp) out.components = comp
  const dur = after(body, 'Duration')
  if (dur) out.duration = dur
  return out
}

function parseItem(body: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const lower = body.toLowerCase()
  const rarity = RARITIES.find((r) => lower.includes(r))
  if (rarity) out.rarity = rarity.replace(/\b\w/g, (c) => c.toUpperCase())
  if (/requires attunement/i.test(body)) out.attunement = true
  return out
}

export function parseFields(type: ContentType, body: string): Record<string, unknown> {
  switch (type) {
    case 'weapon':
      return parseWeapon(body)
    case 'monster':
      return parseMonster(body)
    case 'spell':
      return parseSpell(body)
    case 'item':
      return parseItem(body)
    default:
      return {}
  }
}
