/* eslint-disable @typescript-eslint/no-explicit-any */
import { coercePc, type PcUnit, type FeatureCategory, type PcSpell } from '@/lib/store/pcStore'
import { abilityMod, SKILLS, type AbilityKey } from '@/lib/dnd/character'

const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_NAMES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']

const kebabToCamel = (s: string): string => s.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())

/** Pull a numeric character id out of a D&D Beyond URL or a bare id. */
export function parseDdbId(input: string): string | null {
  const s = input.trim()
  const m = s.match(/characters\/(\d+)/)
  if (m) return m[1]
  if (/^\d+$/.test(s)) return s
  return null
}

function findById(arr: any, id: number): any {
  return Array.isArray(arr) ? arr.find((x) => x?.id === id) : undefined
}

function mapDdb(data: any): Partial<PcUnit> {
  const mods: any[] = []
  if (data?.modifiers && typeof data.modifiers === 'object') {
    for (const v of Object.values(data.modifiers)) if (Array.isArray(v)) mods.push(...v)
  }
  const hasProf = (subType: string): boolean =>
    mods.some((x) => x?.type === 'proficiency' && x?.subType === subType)

  // Ability scores: base + manual/racial bonus + modifier bonuses, or an override.
  const abilities = {} as Record<AbilityKey, number>
  ABILITY_KEYS.forEach((key, idx) => {
    const id = idx + 1
    const base = num(findById(data?.stats, id)?.value, 10)
    const bonus = num(findById(data?.bonusStats, id)?.value, 0)
    const override = findById(data?.overrideStats, id)?.value
    const modBonus = mods
      .filter((x) => x?.type === 'bonus' && x?.subType === `${ABILITY_NAMES[idx]}-score`)
      .reduce((a, x) => a + num(x?.value, 0), 0)
    abilities[key] = override != null ? num(override, 10) : base + bonus + modBonus
  })

  const saveProf = ABILITY_KEYS.filter((_k, idx) => hasProf(`${ABILITY_NAMES[idx]}-saving-throws`))
  const skillKeys = new Set(SKILLS.map((s) => s.key))
  const skillProf = [
    ...new Set(
      mods
        .filter((x) => x?.type === 'proficiency' && typeof x?.subType === 'string')
        .map((x) => kebabToCamel(x.subType))
        .filter((k) => skillKeys.has(k))
    )
  ]

  // Classes / level.
  const classes: any[] = Array.isArray(data?.classes) ? data.classes : []
  const level = classes.reduce((a, c) => a + num(c?.level, 0), 0) || 1
  const charClass = classes
    .map((c) => {
      const name = c?.definition?.name ?? ''
      const sub = c?.subclassDefinition?.name
      return sub ? `${name} (${sub})` : name
    })
    .filter(Boolean)
    .join(' / ')

  const race = data?.race?.fullName ?? data?.race?.baseRaceName ?? data?.race?.baseName ?? ''

  // HP (re-derived: hit-dice total + CON per level + bonuses, less damage taken).
  const conMod = abilityMod(abilities.con)
  const overrideHp = data?.overrideHitPoints
  const maxHp =
    overrideHp != null
      ? num(overrideHp)
      : num(data?.baseHitPoints) + conMod * level + num(data?.bonusHitPoints)
  const currentHp = Math.max(0, maxHp - num(data?.removedHitPoints))

  // AC (best-effort from equipped armour + DEX + shield + AC bonuses).
  const inv: any[] = Array.isArray(data?.inventory) ? data.inventory : []
  const dexMod = abilityMod(abilities.dex)
  let ac = 10 + dexMod
  const armor = inv.find(
    (i) => i?.equipped && num(i?.definition?.armorClass) > 0 && [1, 2, 3].includes(i?.definition?.armorTypeId)
  )
  if (armor) {
    const baseAc = num(armor.definition.armorClass, 10)
    const type = armor.definition.armorTypeId
    ac = baseAc + (type === 1 ? dexMod : type === 2 ? Math.min(dexMod, 2) : 0)
  }
  const shield = inv.find((i) => i?.equipped && i?.definition?.armorTypeId === 4)
  if (shield) ac += num(shield.definition?.armorClass, 2)
  ac += mods
    .filter((x) => x?.type === 'bonus' && x?.subType === 'armor-class')
    .reduce((a, x) => a + num(x?.value, 0), 0)

  // Speed (walking) + senses (darkvision).
  const speed = num(data?.race?.weightSpeeds?.normal?.walk, num(data?.weightSpeeds?.normal?.walk, 30))

  // Background characteristics + personality.
  const traits = data?.traits ?? {}
  const str = (v: unknown): string => (typeof v === 'string' ? v : v != null ? String(v) : '')
  const background = {
    name: str(data?.background?.definition?.name),
    alignment: '',
    appearance: '',
    gender: str(data?.gender),
    eyes: str(data?.eyes),
    size: str(data?.race?.size),
    height: str(data?.height),
    faith: str(data?.faith),
    hair: str(data?.hair),
    skin: str(data?.skin),
    age: str(data?.age),
    weight: str(data?.weight),
    personality: str(traits.personalityTraits),
    ideals: str(traits.ideals),
    bonds: str(traits.bonds),
    flaws: str(traits.flaws)
  }

  // Inventory items.
  const inventory = inv.map((i) => ({
    id: uuid(),
    name: i?.definition?.name ?? 'Item',
    quantity: num(i?.quantity, 1),
    equipped: Boolean(i?.equipped),
    requiresAttunement: Boolean(i?.definition?.canAttune),
    attuned: Boolean(i?.isAttuned),
    notes: ''
  }))

  // Backstory → a note.
  const noteSections: Array<{ id: string; title: string; text: string }> = []
  const backstory = data?.notes?.backstory
  if (typeof backstory === 'string' && backstory.trim()) {
    noteSections.push({ id: uuid(), title: 'Backstory', text: backstory })
  }

  // Features & traits: racial traits, class features, feats (HTML stripped).
  const strip = (html: unknown): string =>
    typeof html === 'string'
      ? html
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&rsquo;/g, '’')
          .replace(/\s+/g, ' ')
          .trim()
      : ''
  const features: Array<{ id: string; name: string; category: FeatureCategory; description: string }> = []
  const seen = new Set<string>()
  const pushFeat = (name: unknown, desc: unknown, category: FeatureCategory): void => {
    const n = typeof name === 'string' ? name.trim() : ''
    if (!n || seen.has(`${category}:${n}`)) return
    seen.add(`${category}:${n}`)
    features.push({ id: uuid(), name: n, category, description: strip(desc) })
  }
  for (const t of data?.race?.racialTraits ?? [])
    pushFeat(t?.definition?.name, t?.definition?.description ?? t?.definition?.snippet, 'species')
  for (const c of classes)
    for (const f of c?.classFeatures ?? [])
      pushFeat(f?.definition?.name, f?.definition?.description ?? f?.definition?.snippet, 'class')
  for (const f of data?.feats ?? [])
    pushFeat(f?.definition?.name, f?.definition?.description ?? f?.definition?.snippet, 'feat')

  // Spells — from classSpells (primary) + per-category spells object.
  const spellSeen = new Set<string>()
  const spells: PcSpell[] = []
  const addSpell = (name: string, level: number, prepared: boolean): void => {
    const key = (name ?? '').toLowerCase().trim()
    if (!key || spellSeen.has(key)) return
    spellSeen.add(key)
    spells.push({ id: uuid(), name: name.trim(), level, prepared })
  }
  for (const cs of data?.classSpells ?? []) {
    for (const sp of cs?.spells ?? []) {
      const def = sp?.definition
      if (!def?.name) continue
      addSpell(def.name, num(def.level, 0), Boolean(sp.prepared || sp.alwaysPrepared || sp.countsAsKnownSpell))
    }
  }
  for (const cat of ['race', 'class', 'feat', 'background', 'item', 'known']) {
    const list = (data?.spells as any)?.[cat]
    if (!Array.isArray(list)) continue
    for (const sp of list) {
      const def = sp?.definition
      if (!def?.name) continue
      addSpell(def.name, num(def.level, 0), Boolean(sp.prepared || sp.alwaysPrepared))
    }
  }

  return {
    name: data?.name ?? '',
    race,
    charClass,
    level,
    maxHp,
    currentHp,
    ac,
    speed,
    abilities,
    saveProf,
    skillProf,
    spells,
    languages: [
      ...new Set(
        mods
          .filter((x) => x?.type === 'language' && typeof x?.friendlySubtypeName === 'string')
          .map((x) => x.friendlySubtypeName as string)
      )
    ],
    background,
    inventory,
    features,
    noteSections
  }
}

/** Fetch a public D&D Beyond character and map it into our shape. */
export async function importFromDndBeyond(input: string): Promise<Omit<PcUnit, 'id'>> {
  const id = parseDdbId(input)
  if (!id) throw new Error('Could not find a character id in that — paste a dndbeyond.com/characters/… link or the id.')

  if (!window.dmc?.ddb?.character) {
    throw new Error('The D&D Beyond fetch isn’t loaded yet — fully restart the app (stop and re-run the dev server), then try again.')
  }

  const res = (await window.dmc.ddb.character(id)) as any
  const data = res?.data ?? (res?.id ? res : null)
  if (!data || !data.name) {
    throw new Error(
      "Couldn't read that character. Make sure its D&D Beyond sharing is set to Public, then try again."
    )
  }
  return coercePc(mapDdb(data))
}
