#!/usr/bin/env node
/**
 * Fetches SRD content from the 5etools GitHub mirror and writes a compact
 * srd-data.json next to this script's output target. Run once:
 *   npm run build:srd
 *
 * Only entries with `"srd": true` (or all entries for files that are
 * entirely SRD — conditions, base weapons) are included.
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dir, '../src/renderer/src/lib/api/srd-data.json')

const RAW = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data'

// ---- fetch helpers ----------------------------------------------------------

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`)
  return res.json()
}

// ---- 5etools tag / entry rendering ------------------------------------------

function stripTags(text) {
  if (!text) return ''
  return String(text)
    // {@tag text|display} → display (or text if no display)
    .replace(/\{@\w[\w-]* ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    // {@h} → remove (hit marker)
    .replace(/\{@h\}/g, '')
    // {@recharge 5} → (Recharge 5–6)
    .replace(/\{@recharge (\d+)\}/g, '(Recharge $1–6)')
    .replace(/\{@recharge\}/g, '(Recharge 6)')
    // {@atk mw,rw} → remove
    .replace(/\{@atk [^}]+\}/g, '')
    // catch-all
    .replace(/\{@[^}]+\}/g, '')
    .replace(/  +/g, ' ')
    .trim()
}

function renderEntry(e) {
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
          if (item.type === 'item') {
            const n = item.name ? `**${stripTags(item.name)}** ` : ''
            return `- ${n}${renderEntries(item.entries ? [item.entry || '', ...item.entries] : [item.entry || ''])}`
          }
          return `- ${renderEntry(item)}`
        })
        .join('\n')
    }
    case 'table': {
      const caption = e.caption ? `**${stripTags(e.caption)}**\n` : ''
      if (!e.rows?.length) return caption.trim()
      const cols = e.colLabels ?? []
      const header = cols.length
        ? `| ${cols.map((c) => stripTags(typeof c === 'string' ? c : c.label ?? '')).join(' | ')} |\n|${cols.map(() => '---|').join('')}`
        : ''
      const rows = e.rows
        .map((row) => {
          const cells = row.map((cell) => {
            if (typeof cell === 'string') return stripTags(cell)
            if (cell?.type === 'cell' && cell.roll)
              return cell.roll.exact != null
                ? String(cell.roll.exact)
                : `${cell.roll.min}–${cell.roll.max}`
            return renderEntry(cell)
          })
          return `| ${cells.join(' | ')} |`
        })
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
      return renderEntries(e.entries ?? [])
  }
}

function renderEntries(entries) {
  if (!entries) return ''
  return entries.map(renderEntry).filter(Boolean).join('\n\n')
}

function firstSentence(text, max = 150) {
  if (!text) return ''
  const flat = text.replace(/\s+/g, ' ').trim()
  const dot = flat.indexOf('. ')
  const base = dot > 0 && dot < max ? flat.slice(0, dot + 1) : flat
  return base.length > max ? `${base.slice(0, max - 1).trimEnd()}…` : base
}

// ---- lookup tables ----------------------------------------------------------

const SCHOOL = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination',
  E: 'Enchantment', V: 'Evocation', I: 'Illusion',
  N: 'Necromancy', T: 'Transmutation', P: 'Conjuration'
}

const SIZE = {
  F: 'Fine', D: 'Diminutive', T: 'Tiny', S: 'Small',
  M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan', C: 'Colossal'
}

const ALIGN = {
  L: 'Lawful', N: 'Neutral', C: 'Chaotic',
  G: 'Good', E: 'Evil', U: 'Unaligned', A: 'Any'
}

const DMG_TYPE = {
  A: 'acid', B: 'bludgeoning', C: 'cold', F: 'fire', O: 'force',
  L: 'lightning', N: 'necrotic', P: 'piercing', I: 'poison',
  Y: 'psychic', R: 'radiant', S: 'slashing', T: 'thunder'
}

const PROP = {
  '2H': 'two-handed', A: 'ammunition', F: 'finesse', H: 'heavy',
  L: 'light', LD: 'loading', R: 'reach', T: 'thrown', V: 'versatile',
  S: 'special', BF: 'burst fire'
}

const ITEM_TYPE = {
  A: 'Armour', G: 'Wondrous Item', M: 'Melee Weapon', R: 'Ranged Weapon',
  S: 'Shield', P: 'Potion', RD: 'Rod', RG: 'Ring', SC: 'Scroll',
  ST: 'Staff', W: 'Wand', HA: 'Heavy Armour', LA: 'Light Armour',
  MA: 'Medium Armour', AT: "Artisan's Tools", GS: 'Gaming Set',
  MNT: 'Mount', VEH: 'Vehicle', SHP: 'Waterborne Vehicle', AIR: 'Airship',
  FD: 'Food and Drink', TG: 'Trade Goods', TAH: 'Tack and Harness',
  $: 'Treasure', GV: 'Generic Variant'
}

const ABILITY = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

const now = Date.now()

// ---- mappers ----------------------------------------------------------------

function mapSpell(r) {
  const school = SCHOOL[r.school] ?? r.school ?? ''
  const level = r.level ?? 0

  // Casting time
  const t = r.time?.[0]
  const castingTime = t ? `${t.number} ${t.unit}${t.condition ? `, ${t.condition}` : ''}` : ''

  // Range
  const rng = r.range
  let range = ''
  if (rng?.type === 'point') {
    const d = rng.distance
    range = d?.type === 'self' ? 'Self' : d?.type === 'touch' ? 'Touch' : d?.type === 'sight' ? 'Sight' : d?.type === 'unlimited' ? 'Unlimited' : d?.amount ? `${d.amount} ${d.type}` : d?.type ?? ''
  } else if (rng?.type === 'radius') {
    range = rng.distance?.amount ? `Self (${rng.distance.amount}-${rng.distance.type} radius)` : 'Self'
  } else if (rng?.type === 'cone') {
    range = rng.distance?.amount ? `Self (${rng.distance.amount}-${rng.distance.type} cone)` : 'Self'
  } else if (rng?.type === 'line') {
    range = rng.distance?.amount ? `Self (${rng.distance.amount}-${rng.distance.type} line)` : 'Self'
  } else if (rng?.type === 'cube') {
    range = rng.distance?.amount ? `Self (${rng.distance.amount}-${rng.distance.type} cube)` : 'Self'
  } else if (rng?.type === 'hemisphere') {
    range = rng.distance?.amount ? `Self (${rng.distance.amount}-${rng.distance.type} hemisphere)` : 'Self'
  } else if (rng?.type === 'sphere') {
    range = rng.distance?.amount ? `Self (${rng.distance.amount}-${rng.distance.type} sphere)` : 'Self'
  } else if (rng?.type === 'special') {
    range = 'Special'
  }

  // Components
  const comp = r.components ?? {}
  const parts = []
  if (comp.v) parts.push('V')
  if (comp.s) parts.push('S')
  if (comp.m) parts.push('M')
  const components = parts.join(', ')
  const material = typeof comp.m === 'object' ? stripTags(comp.m.text ?? '') : typeof comp.m === 'string' ? stripTags(comp.m) : undefined

  // Duration
  const dur = r.duration?.[0]
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

  // Classes
  const classLists = [
    ...(r.classes?.fromClassList ?? []),
    ...(r.classes?.fromClassListVariant ?? [])
  ]
  const classes = [...new Set(classLists.map((c) => c.name))]

  const levelText = level === 0 ? 'Cantrip' : `Level ${level}`
  const description = renderEntries(r.entries)
  const higherLevel = r.entriesHigherLevel ? renderEntries(r.entriesHigherLevel[0]?.entries ?? r.entriesHigherLevel) : undefined

  return {
    id: `srd:spell:${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'spell',
    source: 'srd',
    slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: r.name,
    summary: [levelText, school, castingTime].filter(Boolean).join(' · '),
    tags: school ? [school] : [],
    createdAt: now,
    updatedAt: now,
    data: {
      level,
      levelText,
      school,
      castingTime,
      range,
      components,
      material: material || undefined,
      duration,
      concentration,
      ritual: !!r.meta?.ritual,
      description,
      higherLevel: higherLevel || undefined,
      classes
    }
  }
}

function mapAlignment(alignment) {
  if (!alignment) return 'Unaligned'
  return alignment
    .map((a) => {
      if (a === 'U') return 'Unaligned'
      if (a === 'A') return 'Any'
      if (a === 'NX') return 'Neutral'
      if (a === 'NY') return 'Neutral'
      return ALIGN[a] ?? a
    })
    .join(' ')
}

function mapStatEntries(arr) {
  if (!arr) return []
  return arr.flatMap((e) => {
    if (!e.name && !e.entries) return []
    return [{
      name: stripTags(e.name ?? ''),
      desc: renderEntries(e.entries)
    }]
  })
}

function mapMonster(r) {
  const size = SIZE[r.size?.[0]] ?? r.size?.[0] ?? ''
  const creatureType = typeof r.type === 'string' ? r.type : (r.type?.type ?? '')
  const alignment = mapAlignment(r.alignment)

  const acEntry = r.ac?.[0]
  const acNum = typeof acEntry === 'number' ? acEntry : acEntry?.ac ?? ''
  const acFrom = typeof acEntry === 'object' && acEntry?.from?.length ? ` (${acEntry.from.join(', ')})` : ''
  const ac = `${acNum}${acFrom}`

  const hpAvg = r.hp?.average ?? ''
  const hpFormula = r.hp?.formula ? ` (${r.hp.formula})` : ''
  const hp = `${hpAvg}${hpFormula}`

  const speed = Object.entries(r.speed ?? {})
    .filter(([, v]) => v !== false && v !== 0)
    .map(([mode, val]) => {
      if (typeof val === 'boolean') return mode
      return mode === 'walk' ? `${val} ft.` : `${mode} ${val} ft.`
    })
    .join(', ')

  const saves = Object.entries(r.save ?? {})
    .map(([k, v]) => `${ABILITY[k] ?? k} ${v}`)
    .join(', ')

  const skills = Object.entries(r.skill ?? {})
    .map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)} ${v}`)
    .join(', ')

  const senses = [
    ...(r.senses ?? []),
    r.passive != null ? `passive Perception ${r.passive}` : ''
  ].filter(Boolean).join(', ')

  const languages = Array.isArray(r.languages) ? r.languages.join(', ') : (r.languages ?? '')
  const cr = String(r.cr?.cr ?? r.cr ?? '')

  const traits = mapStatEntries(r.trait)
  const actions = mapStatEntries(r.action)
  const bonusActions = mapStatEntries(r.bonus)
  const reactions = mapStatEntries(r.reaction)
  const legendaryActions = mapStatEntries(r.legendary)
  const legendaryDesc = r.legendary?.length
    ? `${r.name} can take 3 legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. ${r.name} regains spent legendary actions at the start of its turn.`
    : undefined

  return {
    id: `srd:monster:${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'monster',
    source: 'srd',
    slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: r.name,
    summary: [
      [size, creatureType].filter(Boolean).join(' '),
      cr ? `CR ${cr}` : '',
      acNum ? `AC ${acNum}` : '',
      hpAvg ? `HP ${hpAvg}` : ''
    ].filter(Boolean).join(' · '),
    tags: [creatureType, size].filter(Boolean),
    createdAt: now,
    updatedAt: now,
    data: {
      role: 'monster',
      size,
      creatureType,
      alignment,
      ac,
      hp,
      speed,
      abilities: {
        str: r.str ?? 10, dex: r.dex ?? 10, con: r.con ?? 10,
        int: r.int ?? 10, wis: r.wis ?? 10, cha: r.cha ?? 10
      },
      saves: saves || undefined,
      skills: skills || undefined,
      senses: senses || undefined,
      languages: languages || undefined,
      cr,
      traits,
      actions,
      bonusActions,
      reactions,
      legendaryActions,
      legendaryDesc,
      lore: r.fluff ? undefined : undefined
    }
  }
}

function mapItem(r) {
  const typeLabel = ITEM_TYPE[r.type] ?? r.type ?? 'Wondrous Item'
  const rarity = r.rarity === 'none' ? '' : (r.rarity ?? '')
  const attunement = !!r.reqAttune && r.reqAttune !== false
  const attunementNote = typeof r.reqAttune === 'string' && r.reqAttune !== 'true' ? ` (${r.reqAttune})` : ''

  const rawDesc = renderEntries(r.entries)
  const description = rawDesc

  return {
    id: `srd:item:${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'item',
    source: 'srd',
    slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: r.name,
    summary: [typeLabel, rarity, attunement && `attunement${attunementNote}`].filter(Boolean).join(' · '),
    tags: rarity ? [rarity] : [],
    createdAt: now,
    updatedAt: now,
    data: {
      itemType: typeLabel,
      rarity,
      attunement,
      description
    }
  }
}

function mapWeapon(r) {
  const category = r.weaponCategory ?? ''
  const dmgDice = r.dmg1 ?? ''
  const dmgType = DMG_TYPE[r.dmgType] ?? r.dmgType ?? ''
  const props = (r.property ?? []).map((p) => PROP[p] ?? p)
  const cost = r.cost ? `${r.cost.quantity} ${r.cost.denomination}` : undefined
  const weight = r.weight != null ? `${r.weight} lb.` : undefined

  return {
    id: `srd:weapon:${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'weapon',
    source: 'srd',
    slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: r.name,
    summary: [category, [dmgDice, dmgType].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
    tags: category ? [category] : [],
    createdAt: now,
    updatedAt: now,
    data: {
      damageDice: dmgDice,
      damageType: dmgType,
      properties: props,
      weight,
      cost,
      category
    }
  }
}

function mapCondition(r) {
  const description = renderEntries(r.entries)
  return {
    id: `srd:condition:${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'condition',
    source: 'srd',
    slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: r.name,
    summary: firstSentence(description),
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: { description }
  }
}

function mapClass(r) {
  const hitDie = `d${r.hd?.faces ?? 6}`
  const saves = (r.proficiency ?? []).map((a) => ABILITY[a] ?? a).join(', ')
  const startProf = r.startingProficiencies ?? {}
  const profParts = [
    startProf.armor?.join(', '),
    startProf.weapons?.join(', '),
    startProf.skills ? (Array.isArray(startProf.skills) ? startProf.skills.join(', ') : undefined) : undefined
  ].filter(Boolean)

  return {
    id: `srd:class:${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'class',
    source: 'srd',
    slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: r.name,
    summary: [`Hit die ${hitDie}`, saves ? `saves ${saves}` : ''].filter(Boolean).join(' · '),
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: {
      hitDie,
      savingThrows: saves || undefined,
      proficiencies: profParts.join('; ') || undefined,
      spellcastingAbility: r.spellcastingAbility ? ABILITY[r.spellcastingAbility] : undefined,
      description: renderEntries(r.fluff?.[0]?.entries ?? []),
      subclasses: []  // filled in per-file below
    }
  }
}

function mapSubclass(r) {
  return {
    id: `srd:subclass:${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${r.className.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'subclass',
    source: 'srd',
    slug: `${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${r.className.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: r.name,
    summary: `${r.className} subclass`,
    tags: [r.className],
    createdAt: now,
    updatedAt: now,
    data: {
      parentClass: r.className,
      description: renderEntries(r.entries ?? [])
    }
  }
}

// ---- fetchers ---------------------------------------------------------------

async function fetchSpells() {
  console.log('  Fetching spells (PHB)…')
  const { spell } = await getJson(`${RAW}/spells/spells-phb.json`)
  return spell.filter((s) => s.srd).map(mapSpell)
}

async function fetchMonsters() {
  console.log('  Fetching monsters (MM)…')
  const { monster } = await getJson(`${RAW}/bestiary/bestiary-mm.json`)
  return monster.filter((m) => m.srd).map(mapMonster)
}

async function fetchItems() {
  console.log('  Fetching magic items…')
  const { item } = await getJson(`${RAW}/items.json`)
  const srdItems = item.filter((i) => i.srd && !['M', 'R', 'LA', 'MA', 'HA', 'S', 'A'].includes(i.type))
  return srdItems.map(mapItem)
}

async function fetchWeapons() {
  console.log('  Fetching base items (weapons/armour)…')
  const { baseitem } = await getJson(`${RAW}/items-base.json`)
  // Weapons: type M or R; armour handled separately — only weapons for now
  const weapons = baseitem.filter(
    (i) => i.srd && (i.type === 'M' || i.type === 'R') && i.dmg1
  )
  return weapons.map(mapWeapon)
}

async function fetchConditions() {
  console.log('  Fetching conditions…')
  const { condition } = await getJson(`${RAW}/conditionsdiseases.json`)
  // All D&D conditions are SRD; diseases are not — filter by explicit srd flag or known condition names
  const SRD_CONDITIONS = new Set([
    'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
    'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
    'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'
  ])
  return condition
    .filter((c) => c.srd || SRD_CONDITIONS.has(c.name))
    .map(mapCondition)
}

const SRD_CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
  'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
]

async function fetchClassFile(name) {
  const slug = name.toLowerCase()
  const { class: classes = [], subclass: subclasses = [] } = await getJson(`${RAW}/class/class-${slug}.json`)
  const cls = classes.find((c) => c.srd)
  if (!cls) return { cls: null, subs: [] }
  const subs = subclasses.filter((s) => s.srd)
  return { cls, subs }
}

async function fetchClasses() {
  console.log('  Fetching classes…')
  const entries = []
  for (const name of SRD_CLASSES) {
    process.stdout.write(`    ${name}… `)
    try {
      const { cls, subs } = await fetchClassFile(name)
      if (!cls) { console.log('(no SRD flag, skipping)'); continue }
      const classEntry = mapClass(cls)
      classEntry.data.subclasses = subs.map((s) => s.name)
      entries.push(classEntry)
      for (const sub of subs) {
        entries.push(mapSubclass({ ...sub, className: name }))
      }
      console.log(`✓ (${subs.length} subclasses)`)
    } catch (e) {
      console.log(`error: ${e.message}`)
    }
  }
  return entries
}

// ---- feat mappers -----------------------------------------------------------

// Mechanical bonuses for specific SRD feats (parsed from feat text)
const FEAT_BONUSES = {
  'Alert':       { initiativeBonus: 5 },
  'Dual Wielder':{ acBonus: 1 },
  'Mobile':      { speedBonus: 10 },
  'Observant':   { passivePerceptionBonus: 5, passiveInvestigationBonus: 5 },
}

function mapPrerequisite(prereq) {
  if (!prereq?.length) return undefined
  const parts = []
  for (const p of prereq) {
    if (p.ability) {
      for (const ab of p.ability) {
        for (const [key, val] of Object.entries(ab)) {
          parts.push(`${ABILITY[key] ?? key} ${val}+`)
        }
      }
    }
    if (p.level) {
      const lvl = typeof p.level === 'number' ? `Level ${p.level}` : `Level ${p.level.level ?? ''}${p.level.class?.name ? ` ${p.level.class.name}` : ''}`
      parts.push(lvl.trim())
    }
    if (p.spellcasting || p.spellcastingFeature || p.spellcastingPrepared) parts.push('Spellcasting')
    if (p.proficiency) {
      for (const prof of p.proficiency) {
        for (const [type, val] of Object.entries(prof)) {
          if (val) parts.push(`${type} proficiency`)
        }
      }
    }
    if (p.race) {
      parts.push(p.race.map(r => r.displayEntry ? stripTags(r.displayEntry) : (r.name ?? '')).filter(Boolean).join(' or '))
    }
    if (p.other) parts.push(stripTags(p.other))
  }
  return parts.filter(Boolean).join('; ') || undefined
}

function mapFeat(r) {
  const prerequisite = mapPrerequisite(r.prerequisite)
  const description = renderEntries(r.entries)
  const bonuses = FEAT_BONUSES[r.name] ?? {}
  return {
    id: `srd:feat:${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'feat',
    source: 'srd',
    slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: r.name,
    summary: prerequisite ? `Prerequisite: ${prerequisite}` : 'Feat',
    tags: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
    data: { prerequisite: prerequisite || undefined, description, ...bonuses }
  }
}

async function fetchFeats() {
  console.log('  Fetching feats (PHB)…')
  const { feat } = await getJson(`${RAW}/feats.json`)
  // PHB feats — the classic 2014 feats players expect
  return feat.filter((f) => f.source === 'PHB').map(mapFeat)
}

// ---- background mappers -----------------------------------------------------

function renderProfList(entries) {
  if (!entries?.length) return undefined
  const parts = []
  for (const entry of entries) {
    for (const [key, val] of Object.entries(entry)) {
      if (key === 'choose') {
        const from = Array.isArray(val.from) ? val.from : []
        const count = val.count ?? 1
        if (from.length) parts.push(`Choose ${count}: ${from.map(s => s[0].toUpperCase() + s.slice(1)).join(', ')}`)
        else parts.push(`Choose ${count}`)
      } else if (key === 'anyStandard') {
        parts.push(`Any ${val} standard language${val > 1 ? 's' : ''}`)
      } else if (val === true) {
        parts.push(key[0].toUpperCase() + key.slice(1))
      } else if (typeof val === 'string' && val !== 'false') {
        parts.push(`${key[0].toUpperCase() + key.slice(1)}`)
      }
    }
  }
  return parts.filter(Boolean).join(', ') || undefined
}

function mapBackground(r) {
  // Feature block is usually an 'entries' entry whose name starts with "Feature:"
  const featureEntry = (r.entries ?? []).find(
    (e) => e && typeof e === 'object' && typeof e.name === 'string' && e.name.startsWith('Feature:')
  )
  const featureName = featureEntry ? featureEntry.name.replace(/^Feature:\s*/, '') : undefined
  const featureDescription = featureEntry ? renderEntries(featureEntry.entries) : undefined

  // Description from non-feature, non-suggested entries
  const descEntries = (r.entries ?? []).filter(
    (e) => !e?.name?.startsWith('Feature:') && !e?.name?.startsWith('Suggested')
  )
  const description = renderEntries(descEntries)

  // Starting equipment — grab first option, flatten items
  let equipment
  if (r.startingEquipment?.length) {
    const opts = r.startingEquipment[0]
    const items = (Array.isArray(opts) ? opts : []).flatMap((item) => {
      if (typeof item === 'string') return [stripTags(item)]
      if (item?.item) return [stripTags(item.item)]
      if (item?.special) return [stripTags(item.special)]
      if (item?.value) return [`${item.value} gp`]
      return []
    })
    equipment = items.slice(0, 8).join(', ') || undefined
  }

  return {
    id: `srd:background:${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'background',
    source: 'srd',
    slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: r.name,
    summary: featureName ? `Feature: ${featureName}` : 'Background',
    tags: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
    data: {
      description,
      feature: featureName,
      featureDescription,
      skillProficiencies: renderProfList(r.skillProficiencies),
      toolProficiencies: renderProfList(r.toolProficiencies),
      languages: renderProfList(r.languageProficiencies),
      equipment
    }
  }
}

async function fetchBackgrounds() {
  console.log('  Fetching backgrounds (PHB)…')
  const { background } = await getJson(`${RAW}/backgrounds.json`)
  // PHB backgrounds — exclude variants (named "Variant ...")
  return background
    .filter((b) => b.source === 'PHB' && !b.name.startsWith('Variant') && b.name !== 'Custom Background')
    .map(mapBackground)
}

// ---- main -------------------------------------------------------------------

async function main() {
  console.log('Building SRD data from 5etools…\n')

  const all = []

  const spells = await fetchSpells()
  console.log(`  → ${spells.length} spells`)
  all.push(...spells)

  const monsters = await fetchMonsters()
  console.log(`  → ${monsters.length} monsters`)
  all.push(...monsters)

  const items = await fetchItems()
  console.log(`  → ${items.length} magic items`)
  all.push(...items)

  const weapons = await fetchWeapons()
  console.log(`  → ${weapons.length} weapons`)
  all.push(...weapons)

  const conditions = await fetchConditions()
  console.log(`  → ${conditions.length} conditions`)
  all.push(...conditions)

  const classes = await fetchClasses()
  const classCount = classes.filter((e) => e.type === 'class').length
  const subCount = classes.filter((e) => e.type === 'subclass').length
  console.log(`  → ${classCount} classes, ${subCount} subclasses`)
  all.push(...classes)

  const feats = await fetchFeats()
  console.log(`  → ${feats.length} feats`)
  all.push(...feats)

  const backgrounds = await fetchBackgrounds()
  console.log(`  → ${backgrounds.length} backgrounds`)
  all.push(...backgrounds)

  // Deduplicate by id (shouldn't happen, but safety net)
  const seen = new Set()
  const deduped = all.filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  console.log(`\nTotal: ${deduped.length} entries`)
  writeFileSync(OUT, JSON.stringify(deduped, null, 0))
  console.log(`Written to ${OUT}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
