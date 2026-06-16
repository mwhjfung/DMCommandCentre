#!/usr/bin/env node
/**
 * Downloads all non-SRD 5etools content and converts it to the DM Command
 * Centre ContentEntry format, ready to import into the app as custom content.
 *
 * Output: ~/Desktop/5etools-content/
 *   spells.json    monsters.json    items.json
 *   weapons.json   conditions.json  classes.json
 *
 * Run:  node scripts/download-5etools.mjs
 */

import { writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { resolve } from 'path'

const RAW = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data'
const OUT_DIR = resolve(homedir(), 'Desktop', '5etools-content')

// ---- fetch ------------------------------------------------------------------

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

// ---- entry rendering (same as build-srd.mjs) --------------------------------

function stripTags(text) {
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
      return e.items.map((item) => {
        if (typeof item === 'string') return `- ${stripTags(item)}`
        if (item.type === 'item') {
          const n = item.name ? `**${stripTags(item.name)}** ` : ''
          return `- ${n}${renderEntries(item.entries ? [item.entry || '', ...item.entries] : [item.entry || ''])}`
        }
        return `- ${renderEntry(item)}`
      }).join('\n')
    }
    case 'table': {
      const caption = e.caption ? `**${stripTags(e.caption)}**\n` : ''
      if (!e.rows?.length) return caption.trim()
      const cols = e.colLabels ?? []
      const header = cols.length
        ? `| ${cols.map((c) => stripTags(typeof c === 'string' ? c : c.label ?? '')).join(' | ')} |\n|${cols.map(() => '---|').join('')}`
        : ''
      const rows = e.rows.map((row) =>
        '| ' + row.map((cell) => {
          if (typeof cell === 'string') return stripTags(cell)
          if (cell?.type === 'cell' && cell.roll)
            return cell.roll.exact != null ? String(cell.roll.exact) : `${cell.roll.min}–${cell.roll.max}`
          return renderEntry(cell)
        }).join(' | ') + ' |'
      ).join('\n')
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
const SIZE = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' }
const ALIGN = { L: 'Lawful', N: 'Neutral', C: 'Chaotic', G: 'Good', E: 'Evil', U: 'Unaligned', A: 'Any' }
const DMG_TYPE = {
  A: 'acid', B: 'bludgeoning', C: 'cold', F: 'fire', O: 'force',
  L: 'lightning', N: 'necrotic', P: 'piercing', I: 'poison',
  Y: 'psychic', R: 'radiant', S: 'slashing', T: 'thunder'
}
const PROP = {
  '2H': 'two-handed', A: 'ammunition', F: 'finesse', H: 'heavy',
  L: 'light', LD: 'loading', R: 'reach', T: 'thrown', V: 'versatile', S: 'special'
}
const ITEM_TYPE = {
  A: 'Armour', G: 'Wondrous Item', M: 'Melee Weapon', R: 'Ranged Weapon',
  S: 'Shield', P: 'Potion', RD: 'Rod', RG: 'Ring', SC: 'Scroll',
  ST: 'Staff', W: 'Wand', HA: 'Heavy Armour', LA: 'Light Armour', MA: 'Medium Armour',
  AT: "Artisan's Tools", GS: 'Gaming Set', GV: 'Generic Variant'
}
const ABILITY = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

const now = Date.now()
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

// ---- mappers ----------------------------------------------------------------

function mapSpell(r, source) {
  const school = SCHOOL[r.school] ?? r.school ?? ''
  const level = r.level ?? 0
  const t = r.time?.[0]
  const castingTime = t ? `${t.number} ${t.unit}${t.condition ? `, ${t.condition}` : ''}` : ''
  const rng = r.range
  let range = ''
  if (rng?.type === 'point') {
    const d = rng.distance
    range = d?.type === 'self' ? 'Self' : d?.type === 'touch' ? 'Touch' : d?.type === 'sight' ? 'Sight' : d?.type === 'unlimited' ? 'Unlimited' : d?.amount ? `${d.amount} ${d.type}` : d?.type ?? ''
  } else if (['radius','cone','line','cube','hemisphere','sphere'].includes(rng?.type)) {
    const d = rng.distance
    range = d?.amount ? `Self (${d.amount}-${d.type} ${rng.type})` : 'Self'
  } else if (rng?.type === 'special') range = 'Special'
  const comp = r.components ?? {}
  const parts = []
  if (comp.v) parts.push('V')
  if (comp.s) parts.push('S')
  if (comp.m) parts.push('M')
  const material = typeof comp.m === 'object' ? stripTags(comp.m.text ?? '') : typeof comp.m === 'string' ? stripTags(comp.m) : undefined
  const dur = r.duration?.[0]
  let duration = '', concentration = false
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
  const classLists = [...(r.classes?.fromClassList ?? []), ...(r.classes?.fromClassListVariant ?? [])]
  const classes = [...new Set(classLists.map((c) => c.name))]
  const levelText = level === 0 ? 'Cantrip' : `Level ${level}`
  return {
    id: `ext:spell:${slug(r.name)}-${slug(source)}`,
    type: 'spell', source: 'custom', slug: slug(r.name), name: r.name,
    world: source, tags: school ? [school] : [],
    summary: [levelText, school, castingTime].filter(Boolean).join(' · '),
    createdAt: now, updatedAt: now,
    data: {
      level, levelText, school, castingTime, range,
      components: parts.join(', '), material: material || undefined,
      duration, concentration, ritual: !!r.meta?.ritual,
      description: renderEntries(r.entries),
      higherLevel: r.entriesHigherLevel ? renderEntries(r.entriesHigherLevel[0]?.entries ?? r.entriesHigherLevel) : undefined,
      classes
    }
  }
}

function mapAlignment(alignment) {
  if (!alignment) return 'Unaligned'
  return alignment.map((a) => {
    if (a === 'U') return 'Unaligned'
    if (a === 'A') return 'Any'
    if (a === 'NX' || a === 'NY') return 'Neutral'
    return ALIGN[a] ?? a
  }).join(' ')
}

function mapStatEntries(arr) {
  if (!arr) return []
  return arr.flatMap((e) => {
    if (!e.name && !e.entries) return []
    return [{ name: stripTags(e.name ?? ''), desc: renderEntries(e.entries) }]
  })
}

function mapMonster(r, source) {
  const size = SIZE[r.size?.[0]] ?? r.size?.[0] ?? ''
  const creatureType = typeof r.type === 'string' ? r.type : (r.type?.type ?? '')
  const alignment = mapAlignment(r.alignment)
  const acEntry = r.ac?.[0]
  const acNum = typeof acEntry === 'number' ? acEntry : acEntry?.ac ?? ''
  const acFrom = typeof acEntry === 'object' && acEntry?.from?.length ? ` (${acEntry.from.join(', ')})` : ''
  const hp = `${r.hp?.average ?? ''}${r.hp?.formula ? ` (${r.hp.formula})` : ''}`
  const speed = Object.entries(r.speed ?? {}).filter(([, v]) => v !== false && v !== 0)
    .map(([mode, val]) => typeof val === 'boolean' ? mode : mode === 'walk' ? `${val} ft.` : `${mode} ${val} ft.`).join(', ')
  const saves = Object.entries(r.save ?? {}).map(([k, v]) => `${ABILITY[k] ?? k} ${v}`).join(', ')
  const skills = Object.entries(r.skill ?? {}).map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)} ${v}`).join(', ')
  const senses = [...(r.senses ?? []), r.passive != null ? `passive Perception ${r.passive}` : ''].filter(Boolean).join(', ')
  const cr = String(r.cr?.cr ?? r.cr ?? '')
  return {
    id: `ext:monster:${slug(r.name)}-${slug(source)}`,
    type: 'monster', source: 'custom', slug: slug(r.name), name: r.name,
    world: source, tags: [creatureType, size].filter(Boolean),
    summary: [[size, creatureType].filter(Boolean).join(' '), cr ? `CR ${cr}` : '', acNum ? `AC ${acNum}` : '', r.hp?.average ? `HP ${r.hp.average}` : ''].filter(Boolean).join(' · '),
    createdAt: now, updatedAt: now,
    data: {
      role: 'monster', size, creatureType, alignment, ac: `${acNum}${acFrom}`, hp, speed,
      abilities: { str: r.str ?? 10, dex: r.dex ?? 10, con: r.con ?? 10, int: r.int ?? 10, wis: r.wis ?? 10, cha: r.cha ?? 10 },
      saves: saves || undefined, skills: skills || undefined,
      senses: senses || undefined, languages: Array.isArray(r.languages) ? r.languages.join(', ') : (r.languages || undefined),
      cr, traits: mapStatEntries(r.trait), actions: mapStatEntries(r.action),
      bonusActions: mapStatEntries(r.bonus), reactions: mapStatEntries(r.reaction),
      legendaryActions: mapStatEntries(r.legendary),
      legendaryDesc: r.legendary?.length ? `${r.name} can take 3 legendary actions, choosing from the options below.` : undefined
    }
  }
}

function mapItem(r, source) {
  const typeLabel = ITEM_TYPE[r.type] ?? r.type ?? 'Wondrous Item'
  const rarity = r.rarity === 'none' ? '' : (r.rarity ?? '')
  const attunement = !!r.reqAttune && r.reqAttune !== false
  return {
    id: `ext:item:${slug(r.name)}-${slug(source)}`,
    type: 'item', source: 'custom', slug: slug(r.name), name: r.name,
    world: source, tags: rarity ? [rarity] : [],
    summary: [typeLabel, rarity, attunement && 'attunement'].filter(Boolean).join(' · '),
    createdAt: now, updatedAt: now,
    data: { itemType: typeLabel, rarity, attunement, description: renderEntries(r.entries) }
  }
}

function mapWeapon(r, source) {
  const category = r.weaponCategory ?? ''
  const dmgDice = r.dmg1 ?? ''
  const dmgType = DMG_TYPE[r.dmgType] ?? r.dmgType ?? ''
  const props = (r.property ?? []).map((p) => PROP[p] ?? p)
  return {
    id: `ext:weapon:${slug(r.name)}-${slug(source)}`,
    type: 'weapon', source: 'custom', slug: slug(r.name), name: r.name,
    world: source, tags: category ? [category] : [],
    summary: [category, [dmgDice, dmgType].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
    createdAt: now, updatedAt: now,
    data: {
      damageDice: dmgDice, damageType: dmgType, properties: props,
      weight: r.weight != null ? `${r.weight} lb.` : undefined,
      cost: r.cost ? `${r.cost.quantity} ${r.cost.denomination}` : undefined,
      category
    }
  }
}

function mapClass(r, subs, source) {
  const hitDie = `d${r.hd?.faces ?? 6}`
  const saves = (r.proficiency ?? []).map((a) => ABILITY[a] ?? a).join(', ')
  const startProf = r.startingProficiencies ?? {}
  const profParts = [startProf.armor?.join(', '), startProf.weapons?.join(', ')].filter(Boolean)
  return {
    id: `ext:class:${slug(r.name)}-${slug(source)}`,
    type: 'class', source: 'custom', slug: slug(r.name), name: r.name,
    world: source, tags: [],
    summary: [`Hit die ${hitDie}`, saves ? `saves ${saves}` : ''].filter(Boolean).join(' · '),
    createdAt: now, updatedAt: now,
    data: {
      hitDie, savingThrows: saves || undefined,
      proficiencies: profParts.join('; ') || undefined,
      spellcastingAbility: r.spellcastingAbility ? ABILITY[r.spellcastingAbility] : undefined,
      description: renderEntries(r.fluff?.[0]?.entries ?? []),
      subclasses: subs.map((s) => s.name)
    }
  }
}

function mapSubclass(r, source) {
  return {
    id: `ext:subclass:${slug(r.name)}-${slug(r.className)}-${slug(source)}`,
    type: 'subclass', source: 'custom', slug: `${slug(r.name)}-${slug(r.className)}`,
    name: r.name, world: source, tags: [r.className],
    summary: `${r.className} subclass`,
    createdAt: now, updatedAt: now,
    data: { parentClass: r.className, description: renderEntries(r.entries ?? []) }
  }
}

// ---- collect by category ----------------------------------------------------

async function collectSpells() {
  const index = await getJson(`${RAW}/spells/index.json`)
  const files = Object.entries(index)
  const results = []
  let filesDone = 0
  for (const [source, filename] of files) {
    process.stdout.write(`\r  Spells: ${++filesDone}/${files.length} files…   `)
    try {
      const { spell = [] } = await getJson(`${RAW}/spells/${filename}`)
      for (const s of spell) {
        if (!s.srd) results.push(mapSpell(s, source))
      }
    } catch { /* skip missing files */ }
  }
  console.log()
  return results
}

async function collectMonsters() {
  const index = await getJson(`${RAW}/bestiary/index.json`)
  const files = Object.entries(index)
  const results = []
  let filesDone = 0
  for (const [source, filename] of files) {
    process.stdout.write(`\r  Monsters: ${++filesDone}/${files.length} files…   `)
    try {
      const { monster = [] } = await getJson(`${RAW}/bestiary/${filename}`)
      for (const m of monster) {
        if (!m.srd) results.push(mapMonster(m, source))
      }
    } catch { /* skip */ }
  }
  console.log()
  return results
}

async function collectItems() {
  console.log('  Fetching items…')
  const { item = [] } = await getJson(`${RAW}/items.json`)
  const NON_WEAPON_TYPES = new Set(['G', 'P', 'RD', 'RG', 'SC', 'ST', 'W', 'WD', 'A', 'GV', undefined])
  return item
    .filter((i) => !i.srd && NON_WEAPON_TYPES.has(i.type))
    .map((i) => mapItem(i, i.source ?? 'Unknown'))
}

async function collectWeapons() {
  console.log('  Fetching base items (weapons)…')
  const { baseitem = [] } = await getJson(`${RAW}/items-base.json`)
  return baseitem
    .filter((i) => !i.srd && (i.type === 'M' || i.type === 'R') && i.dmg1)
    .map((i) => mapWeapon(i, i.source ?? 'Unknown'))
}

async function collectClasses() {
  const index = await getJson(`${RAW}/class/index.json`)
  const results = []
  const files = Object.entries(index)
  let filesDone = 0
  for (const [, filename] of files) {
    process.stdout.write(`\r  Classes: ${++filesDone}/${files.length} files…   `)
    try {
      const { class: classes = [], subclass: subclasses = [] } = await getJson(`${RAW}/class/${filename}`)
      for (const cls of classes) {
        if (cls.srd) continue
        const subs = subclasses.filter((s) => !s.srd && s.className === cls.name)
        results.push(mapClass(cls, subs, cls.source ?? 'Unknown'))
        for (const sub of subclasses.filter((s) => !s.srd && s.className === cls.name)) {
          results.push(mapSubclass({ ...sub, className: cls.name }, sub.source ?? 'Unknown'))
        }
      }
      // Also grab non-SRD subclasses for SRD classes
      for (const sub of subclasses.filter((s) => !s.srd)) {
        const alreadyAdded = results.some((r) => r.id === `ext:subclass:${slug(sub.name)}-${slug(sub.className)}-${slug(sub.source ?? 'Unknown')}`)
        if (!alreadyAdded) results.push(mapSubclass({ ...sub, className: sub.className }, sub.source ?? 'Unknown'))
      }
    } catch { /* skip */ }
  }
  console.log()
  return results
}

// ---- write ------------------------------------------------------------------

function write(filename, entries) {
  const path = `${OUT_DIR}/${filename}`
  writeFileSync(path, JSON.stringify(entries, null, 2))
  console.log(`  ${filename}: ${entries.length} entries`)
}

// ---- main -------------------------------------------------------------------

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  console.log(`Output: ${OUT_DIR}\n`)

  console.log('Spells…')
  const spells = await collectSpells()
  write('spells.json', spells)

  console.log('Monsters…')
  const monsters = await collectMonsters()
  write('monsters.json', monsters)

  console.log('Items…')
  const items = await collectItems()
  write('items.json', items)

  console.log('Weapons…')
  const weapons = await collectWeapons()
  write('weapons.json', weapons)

  console.log('Classes…')
  const classes = await collectClasses()
  const classEntries = classes.filter((e) => e.type === 'class')
  const subclassEntries = classes.filter((e) => e.type === 'subclass')
  write('classes.json', classEntries)
  write('subclasses.json', subclassEntries)

  const total = spells.length + monsters.length + items.length + weapons.length + classes.length
  console.log(`\nDone — ${total} total entries written to ${OUT_DIR}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
