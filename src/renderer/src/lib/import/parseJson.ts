import type { ContentEntry } from '@/types/content'

// ---- string helpers ---------------------------------------------------------

function stripTags(text: unknown): string {
  if (!text) return ''
  return String(text)
    .replace(/\{@\w[\w-]* ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@h\}/g, '')
    .replace(/\{@recharge (\d+)\}/g, '(Recharge $1–6)')
    .replace(/\{@recharge\}/g, '(Recharge 6)')
    .replace(/\{@atk [^}]+\}/g, '')
    .replace(/\{@[^}]+\}/g, '')
    .replace(/  +/g, ' ')
    .trim()
}

type FiveEntry =
  | string
  | {
      type?: string
      name?: string
      entries?: FiveEntry[]
      entry?: string
      items?: FiveEntry[]
      rows?: unknown[]
      colLabels?: unknown[]
      caption?: string
      attributes?: string[]
      roll?: { exact?: number; min?: number; max?: number }
    }

function renderEntry(e: FiveEntry): string {
  if (!e) return ''
  if (typeof e === 'string') return stripTags(e)
  switch (e.type) {
    case 'entries':
    case 'section': {
      const header = e.name ? `**${stripTags(e.name)}**` : ''
      const body = renderEntries(e.entries)
      return [header, body].filter(Boolean).join('\n')
    }
    case 'list': {
      if (!e.items) return ''
      return e.items
        .map((item) => {
          if (typeof item === 'string') return `- ${stripTags(item)}`
          const i = item as { type?: string; name?: string; entries?: FiveEntry[]; entry?: string }
          if (i.type === 'item') {
            const n = i.name ? `**${stripTags(i.name)}** ` : ''
            return `- ${n}${renderEntries(i.entries ? [i.entry ?? '', ...i.entries] : [i.entry ?? ''])}`
          }
          return `- ${renderEntry(item as FiveEntry)}`
        })
        .join('\n')
    }
    case 'table': {
      const caption = e.caption ? `**${stripTags(e.caption)}**\n` : ''
      if (!e.rows?.length) return caption.trim()
      const cols = (e.colLabels ?? []) as unknown[]
      const header = cols.length
        ? `| ${cols.map((c) => stripTags(typeof c === 'string' ? c : (c as { label?: string }).label ?? '')).join(' | ')} |\n|${cols.map(() => '---|').join('')}`
        : ''
      const rows = e.rows
        .map(
          (row) =>
            '| ' +
            (row as unknown[])
              .map((cell) => {
                if (typeof cell === 'string') return stripTags(cell)
                const c = cell as { type?: string; roll?: { exact?: number; min?: number; max?: number } }
                if (c?.type === 'cell' && c.roll) {
                  return c.roll.exact != null ? String(c.roll.exact) : `${c.roll.min}–${c.roll.max}`
                }
                return renderEntry(cell as FiveEntry)
              })
              .join(' | ') +
            ' |'
        )
        .join('\n')
      return [caption.trim(), header, rows].filter(Boolean).join('\n')
    }
    case 'inset':
    case 'insetReadaloud': {
      const name = e.name ? `> **${stripTags(e.name)}**\n` : ''
      return name + renderEntries(e.entries)
    }
    case 'quote':
      return `*${renderEntries(e.entries)}*`
    case 'abilityDc':
      return `Spell save DC = 8 + proficiency bonus + ${(e.attributes ?? []).join('/')} modifier`
    case 'abilityAttackMod':
      return `Spell attack = proficiency bonus + ${(e.attributes ?? []).join('/')} modifier`
    case 'item': {
      const n = e.name ? `**${stripTags(e.name)}** ` : ''
      const body = e.entries ? renderEntries(e.entries) : stripTags(e.entry ?? '')
      return `- ${n}${body}`
    }
    default:
      return renderEntries(e.entries)
  }
}

function renderEntries(entries: FiveEntry[] | undefined): string {
  if (!entries) return ''
  return entries.map(renderEntry).filter(Boolean).join('\n\n')
}

// ---- lookup tables ----------------------------------------------------------

const SCHOOL: Record<string, string> = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination',
  E: 'Enchantment', V: 'Evocation', I: 'Illusion',
  N: 'Necromancy', T: 'Transmutation', P: 'Conjuration'
}
const SIZE: Record<string, string> = {
  T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan'
}
const ALIGN: Record<string, string> = {
  L: 'Lawful', N: 'Neutral', C: 'Chaotic', G: 'Good', E: 'Evil', U: 'Unaligned', A: 'Any'
}
const DMG_TYPE: Record<string, string> = {
  A: 'acid', B: 'bludgeoning', C: 'cold', F: 'fire', O: 'force',
  L: 'lightning', N: 'necrotic', P: 'piercing', I: 'poison',
  Y: 'psychic', R: 'radiant', S: 'slashing', T: 'thunder'
}
const PROP: Record<string, string> = {
  '2H': 'two-handed', A: 'ammunition', F: 'finesse', H: 'heavy',
  L: 'light', LD: 'loading', R: 'reach', T: 'thrown', V: 'versatile', S: 'special'
}
const ITEM_TYPE: Record<string, string> = {
  A: 'Armour', G: 'Wondrous Item', M: 'Melee Weapon', R: 'Ranged Weapon',
  S: 'Shield', P: 'Potion', RD: 'Rod', RG: 'Ring', SC: 'Scroll',
  ST: 'Staff', W: 'Wand', HA: 'Heavy Armour', LA: 'Light Armour', MA: 'Medium Armour',
  AT: "Artisan's Tools", GS: 'Gaming Set', GV: 'Generic Variant'
}
const ABILITY: Record<string, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA'
}
const NON_WEAPON_ITEM_TYPES = new Set<string | undefined>([
  'G', 'P', 'RD', 'RG', 'SC', 'ST', 'W', 'WD', 'A', 'GV', undefined
])

const toSlug = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

// ---- per-type mappers -------------------------------------------------------

function mapSpell(r: unknown, source: string, now: number): ContentEntry {
  const s = r as Record<string, unknown>
  const school = SCHOOL[s.school as string] ?? (s.school as string) ?? ''
  const level = (s.level as number) ?? 0
  const t = (s.time as Array<{ number: number; unit: string; condition?: string }>)?.[0]
  const castingTime = t ? `${t.number} ${t.unit}${t.condition ? `, ${t.condition}` : ''}` : ''
  const rng = s.range as { type?: string; distance?: { type?: string; amount?: number } } | undefined
  let range = ''
  if (rng?.type === 'point') {
    const d = rng.distance
    if (d?.type === 'self') range = 'Self'
    else if (d?.type === 'touch') range = 'Touch'
    else if (d?.type === 'sight') range = 'Sight'
    else if (d?.type === 'unlimited') range = 'Unlimited'
    else if (d?.amount) range = `${d.amount} ${d.type}`
    else range = d?.type ?? ''
  } else if (['radius', 'cone', 'line', 'cube', 'hemisphere', 'sphere'].includes(rng?.type ?? '')) {
    const d = rng?.distance
    range = d?.amount ? `Self (${d.amount}-${d.type} ${rng?.type})` : 'Self'
  } else if (rng?.type === 'special') {
    range = 'Special'
  }
  const comp = (s.components ?? {}) as Record<string, unknown>
  const parts: string[] = []
  if (comp.v) parts.push('V')
  if (comp.s) parts.push('S')
  if (comp.m) parts.push('M')
  const material =
    typeof comp.m === 'object' && comp.m !== null
      ? stripTags((comp.m as { text?: string }).text ?? '')
      : typeof comp.m === 'string'
        ? stripTags(comp.m)
        : undefined
  const dur = (
    s.duration as Array<{
      type?: string
      concentration?: boolean
      duration?: { amount?: number; type?: string }
    }>
  )?.[0]
  let duration = ''
  let concentration = false
  if (dur) {
    if (dur.type === 'instant') duration = 'Instantaneous'
    else if (dur.type === 'permanent') duration = 'Until dispelled'
    else if (dur.type === 'special') duration = 'Special'
    else if (dur.concentration) {
      concentration = true
      const a = dur.duration
      duration = `Concentration, up to ${a?.amount ?? ''} ${a?.type ?? ''}`.trim()
    } else if (dur.duration) {
      const a = dur.duration
      duration = `${a.amount ?? ''} ${a.type ?? ''}`.trim()
    }
  }
  const classes = s.classes as
    | { fromClassList?: Array<{ name: string }>; fromClassListVariant?: Array<{ name: string }> }
    | undefined
  const classLists = [...(classes?.fromClassList ?? []), ...(classes?.fromClassListVariant ?? [])]
  const classNames = [...new Set(classLists.map((c) => c.name))]
  const levelText = level === 0 ? 'Cantrip' : `Level ${level}`
  const name = s.name as string
  return {
    id: `ext:spell:${toSlug(name)}-${toSlug(source)}`,
    type: 'spell',
    source: 'custom',
    slug: toSlug(name),
    name,
    world: source,
    tags: school ? [school] : [],
    summary: [levelText, school, castingTime].filter(Boolean).join(' · '),
    createdAt: now,
    updatedAt: now,
    data: {
      level,
      levelText,
      school,
      castingTime,
      range,
      components: parts.join(', '),
      material: material || undefined,
      duration,
      concentration,
      ritual: !!(s.meta as { ritual?: boolean } | undefined)?.ritual,
      description: renderEntries(s.entries as FiveEntry[]),
      higherLevel: s.entriesHigherLevel
        ? renderEntries(
            (s.entriesHigherLevel as Array<{ entries?: FiveEntry[] }>)[0]?.entries ??
              (s.entriesHigherLevel as FiveEntry[])
          )
        : undefined,
      classes: classNames
    }
  }
}

function mapAlignment(alignment: unknown): string {
  if (!alignment) return 'Unaligned'
  return (alignment as string[])
    .map((a) => {
      if (a === 'U') return 'Unaligned'
      if (a === 'A') return 'Any'
      if (a === 'NX' || a === 'NY') return 'Neutral'
      return ALIGN[a] ?? a
    })
    .join(' ')
}

function mapStatEntries(arr: unknown): Array<{ name: string; desc: string }> {
  if (!arr) return []
  return (arr as Array<{ name?: string; entries?: FiveEntry[] }>).flatMap((e) => {
    if (!e.name && !e.entries) return []
    return [{ name: stripTags(e.name ?? ''), desc: renderEntries(e.entries) }]
  })
}

function mapMonster(r: unknown, source: string, now: number): ContentEntry {
  const m = r as Record<string, unknown>
  const size = SIZE[(m.size as string[])?.[0]] ?? (m.size as string[])?.[0] ?? ''
  const creatureType =
    typeof m.type === 'string' ? m.type : ((m.type as { type?: string })?.type ?? '')
  const alignment = mapAlignment(m.alignment)
  const acEntry = (m.ac as unknown[])?.[0]
  const acNum = typeof acEntry === 'number' ? acEntry : (acEntry as { ac?: number })?.ac ?? ''
  const acFrom =
    typeof acEntry === 'object' &&
    acEntry !== null &&
    (acEntry as { from?: string[] }).from?.length
      ? ` (${(acEntry as { from: string[] }).from.join(', ')})`
      : ''
  const hpData = m.hp as { average?: number; formula?: string } | undefined
  const hp = `${hpData?.average ?? ''}${hpData?.formula ? ` (${hpData.formula})` : ''}`
  const speed = Object.entries((m.speed as Record<string, unknown>) ?? {})
    .filter(([, v]) => v !== false && v !== 0)
    .map(([mode, val]) =>
      typeof val === 'boolean' ? mode : mode === 'walk' ? `${val} ft.` : `${mode} ${val} ft.`
    )
    .join(', ')
  const saves = Object.entries((m.save as Record<string, string>) ?? {})
    .map(([k, v]) => `${ABILITY[k] ?? k} ${v}`)
    .join(', ')
  const skills = Object.entries((m.skill as Record<string, string>) ?? {})
    .map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)} ${v}`)
    .join(', ')
  const senses = [
    ...((m.senses as string[]) ?? []),
    m.passive != null ? `passive Perception ${m.passive}` : ''
  ]
    .filter(Boolean)
    .join(', ')
  const cr = String(
    m.cr != null
      ? typeof m.cr === 'object'
        ? (m.cr as { cr?: string }).cr ?? ''
        : m.cr
      : ''
  )
  const abil = m as Record<string, number>
  const name = m.name as string
  return {
    id: `ext:monster:${toSlug(name)}-${toSlug(source)}`,
    type: 'monster',
    source: 'custom',
    slug: toSlug(name),
    name,
    world: source,
    tags: [creatureType, size].filter(Boolean),
    summary: [
      [size, creatureType].filter(Boolean).join(' '),
      cr ? `CR ${cr}` : '',
      acNum ? `AC ${acNum}` : '',
      hpData?.average ? `HP ${hpData.average}` : ''
    ]
      .filter(Boolean)
      .join(' · '),
    createdAt: now,
    updatedAt: now,
    data: {
      role: 'monster',
      size,
      creatureType,
      alignment,
      ac: `${acNum}${acFrom}`,
      hp,
      speed,
      abilities: {
        str: abil.str ?? 10,
        dex: abil.dex ?? 10,
        con: abil.con ?? 10,
        int: abil.int ?? 10,
        wis: abil.wis ?? 10,
        cha: abil.cha ?? 10
      },
      saves: saves || undefined,
      skills: skills || undefined,
      senses: senses || undefined,
      languages: Array.isArray(m.languages)
        ? (m.languages as string[]).join(', ')
        : (m.languages as string | undefined) || undefined,
      cr,
      traits: mapStatEntries(m.trait),
      actions: mapStatEntries(m.action),
      bonusActions: mapStatEntries(m.bonus),
      reactions: mapStatEntries(m.reaction),
      legendaryActions: mapStatEntries(m.legendary),
      legendaryDesc: (m.legendary as unknown[])?.length
        ? `${name} can take 3 legendary actions, choosing from the options below.`
        : undefined
    }
  }
}

function mapItem(r: unknown, source: string, now: number): ContentEntry {
  const i = r as Record<string, unknown>
  const typeLabel = ITEM_TYPE[i.type as string] ?? (i.type as string) ?? 'Wondrous Item'
  const rarity = i.rarity === 'none' ? '' : ((i.rarity as string) ?? '')
  const attunement = !!i.reqAttune && i.reqAttune !== false
  const name = i.name as string
  return {
    id: `ext:item:${toSlug(name)}-${toSlug(source)}`,
    type: 'item',
    source: 'custom',
    slug: toSlug(name),
    name,
    world: source,
    tags: rarity ? [rarity] : [],
    summary: [typeLabel, rarity, attunement && 'attunement'].filter(Boolean).join(' · '),
    createdAt: now,
    updatedAt: now,
    data: {
      itemType: typeLabel,
      rarity,
      attunement,
      description: renderEntries(i.entries as FiveEntry[])
    }
  }
}

function mapWeapon(r: unknown, source: string, now: number): ContentEntry {
  const w = r as Record<string, unknown>
  const category = (w.weaponCategory as string) ?? ''
  const dmgDice = (w.dmg1 as string) ?? ''
  const dmgType = DMG_TYPE[w.dmgType as string] ?? (w.dmgType as string) ?? ''
  const props = ((w.property as string[]) ?? []).map((p) => PROP[p] ?? p)
  const cost = w.cost as { quantity?: number; denomination?: string } | undefined
  const name = w.name as string
  return {
    id: `ext:weapon:${toSlug(name)}-${toSlug(source)}`,
    type: 'weapon',
    source: 'custom',
    slug: toSlug(name),
    name,
    world: source,
    tags: category ? [category] : [],
    summary: [category, [dmgDice, dmgType].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
    createdAt: now,
    updatedAt: now,
    data: {
      damageDice: dmgDice,
      damageType: dmgType,
      properties: props,
      weight: w.weight != null ? `${w.weight} lb.` : undefined,
      cost: cost ? `${cost.quantity} ${cost.denomination}` : undefined,
      category
    }
  }
}

function mapClass(r: unknown, subs: unknown[], source: string, now: number): ContentEntry {
  const c = r as Record<string, unknown>
  const hitDie = `d${(c.hd as { faces?: number })?.faces ?? 6}`
  const saves = ((c.proficiency as string[]) ?? []).map((a) => ABILITY[a] ?? a).join(', ')
  const startProf = (c.startingProficiencies ?? {}) as Record<string, string[] | undefined>
  const profParts = [startProf.armor?.join(', '), startProf.weapons?.join(', ')].filter(Boolean)
  const fluff = (c.fluff as Array<{ entries?: FiveEntry[] }>)?.[0]
  const name = c.name as string
  return {
    id: `ext:class:${toSlug(name)}-${toSlug(source)}`,
    type: 'class',
    source: 'custom',
    slug: toSlug(name),
    name,
    world: source,
    tags: [],
    summary: [`Hit die ${hitDie}`, saves ? `saves ${saves}` : ''].filter(Boolean).join(' · '),
    createdAt: now,
    updatedAt: now,
    data: {
      hitDie,
      savingThrows: saves || undefined,
      proficiencies: profParts.join('; ') || undefined,
      spellcastingAbility: c.spellcastingAbility
        ? ABILITY[c.spellcastingAbility as string]
        : undefined,
      description: renderEntries(fluff?.entries ?? []),
      subclasses: (subs as Array<{ name?: string }>).map((s) => s.name ?? '')
    }
  }
}

function mapSubclass(r: unknown, source: string, now: number): ContentEntry {
  const s = r as Record<string, unknown>
  const name = s.name as string
  const className = s.className as string
  return {
    id: `ext:subclass:${toSlug(name)}-${toSlug(className)}-${toSlug(source)}`,
    type: 'subclass',
    source: 'custom',
    slug: `${toSlug(name)}-${toSlug(className)}`,
    name,
    world: source,
    tags: [className],
    summary: `${className} subclass`,
    createdAt: now,
    updatedAt: now,
    data: {
      parentClass: className,
      description: renderEntries(s.entries as FiveEntry[])
    }
  }
}

// ---- auto-detect + dispatch -------------------------------------------------

function isContentEntryArray(value: unknown): value is ContentEntry[] {
  if (!Array.isArray(value) || value.length === 0) return false
  const first = value[0] as Record<string, unknown>
  return (
    typeof first?.id === 'string' &&
    typeof first?.type === 'string' &&
    typeof first?.name === 'string'
  )
}

export async function parseJson(file: File, source: string): Promise<ContentEntry[]> {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new Error('Not a valid JSON file.')
  }

  // Pre-converted ContentEntry[] (output of download-5etools.mjs)
  if (isContentEntryArray(json)) {
    if (!source) return json
    return json.map((e) => ({ ...e, world: source }))
  }

  // Raw 5etools format — object with well-known keys
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error(
      'Unrecognised JSON format — expected a ContentEntry array or a 5etools data file.'
    )
  }

  const raw = json as Record<string, unknown>
  const src = source || 'Unknown'
  const now = Date.now()
  const results: ContentEntry[] = []

  if (Array.isArray(raw.spell)) {
    for (const s of raw.spell) results.push(mapSpell(s, src, now))
  }
  if (Array.isArray(raw.monster)) {
    for (const m of raw.monster) results.push(mapMonster(m, src, now))
  }
  if (Array.isArray(raw.item)) {
    for (const i of raw.item) {
      if (NON_WEAPON_ITEM_TYPES.has((i as { type?: string }).type)) {
        results.push(mapItem(i, src, now))
      }
    }
  }
  if (Array.isArray(raw.baseitem)) {
    for (const i of raw.baseitem) {
      const w = i as { type?: string; dmg1?: unknown }
      if ((w.type === 'M' || w.type === 'R') && w.dmg1) {
        results.push(mapWeapon(i, src, now))
      }
    }
  }

  // Classes and subclasses may coexist in the same file
  if (Array.isArray(raw.class)) {
    const allSubs = Array.isArray(raw.subclass) ? (raw.subclass as unknown[]) : []
    for (const cls of raw.class) {
      const c = cls as { name: string }
      const classSubs = allSubs.filter(
        (s) => (s as { className?: string }).className === c.name
      )
      results.push(mapClass(cls, classSubs, src, now))
      for (const sub of classSubs) {
        results.push(mapSubclass({ ...(sub as object), className: c.name }, src, now))
      }
    }
    // Subclasses whose parent class isn't in this file (e.g. SRD classes)
    for (const sub of allSubs) {
      const s = sub as { name: string; className: string }
      const expectedId = `ext:subclass:${toSlug(s.name)}-${toSlug(s.className)}-${toSlug(src)}`
      if (!results.some((r) => r.id === expectedId)) {
        results.push(mapSubclass(sub, src, now))
      }
    }
  } else if (Array.isArray(raw.subclass)) {
    for (const sub of raw.subclass) results.push(mapSubclass(sub, src, now))
  }

  if (!results.length) {
    throw new Error(
      'Unrecognised JSON format — expected a ContentEntry array or a 5etools data file.'
    )
  }

  return results
}
