import type { ContentEntry, ItemData, FeatData, BackgroundData, SpellData, HomebrewData } from '@/types/content'
import type { PcUnit, PcItem, PcFeature, PcSpell, PcAction } from '@/lib/store/pcStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

function findInPool(
  pool: ContentEntry[],
  types: Array<ContentEntry['type']>,
  name: string
): ContentEntry | undefined {
  const needle = normalize(name)
  return pool.find((e) => (types as string[]).includes(e.type) && normalize(e.name) === needle)
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Auto-link inventory items, feats, and background of an imported PC to
 * existing library entries, creating minimal stubs for anything that isn't
 * already present.
 *
 * @param pc          - The imported PC (no id yet).
 * @param allContent  - The current library (read from IndexedDB before calling).
 * @param sourceName  - Display name used as `world` on any newly created entries
 *                      (e.g. "Astarion (imported)").
 * @returns           - The updated PC and an array of brand-new ContentEntries
 *                      that the caller must persist.
 */
export function autoLinkAndSeed(
  pc: Omit<PcUnit, 'id'>,
  allContent: ContentEntry[],
  sourceName: string
): { pc: Omit<PcUnit, 'id'>; newEntries: ContentEntry[] } {
  // Working pool — grows as we create new stubs so within-PC dedup is free.
  const pool: ContentEntry[] = [...allContent]
  const newEntries: ContentEntry[] = []

  // Secondary guard: type:normalizedName → created-entry id.
  // Prevents duplicate stubs when pool lookup races or the same name appears
  // twice in the PC's data before a push has been registered.
  const createdIds = new Map<string, string>()

  const now = Date.now()

  /** Register a newly created entry, avoiding duplicates. */
  function register(entry: ContentEntry): void {
    const key = `${entry.type}:${normalize(entry.name)}`
    if (createdIds.has(key)) return
    createdIds.set(key, entry.id)
    newEntries.push(entry)
    pool.push(entry) // make it findable for later items in this same PC
  }

  /**
   * Return the id of an existing or newly created entry for `type` + `name`.
   * `build` is called only when neither the pool nor `createdIds` has a match.
   */
  function resolveId(
    types: Array<ContentEntry['type']>,
    primaryType: ContentEntry['type'],
    name: string,
    build: (id: string) => ContentEntry
  ): string {
    // 1. Check the pool (existing library entries + stubs already made this run).
    const found = findInPool(pool, types, name)
    if (found) return found.id

    // 2. Check our created-id map (defensive belt-and-suspenders guard).
    const key = `${primaryType}:${normalize(name)}`
    const existing = createdIds.get(key)
    if (existing !== undefined) return existing

    // 3. Create a new stub.
    const id = crypto.randomUUID()
    register(build(id))
    return id
  }

  // ---------------------------------------------------------------------------
  // 1. Inventory items
  // ---------------------------------------------------------------------------

  const updatedInventory: PcItem[] = pc.inventory.map((item) => {
    const contentId = resolveId(['weapon', 'item'], 'item', item.name, (id) => {
      const data: ItemData = {
        itemType: 'Gear',
        rarity: 'Common',
        attunement: item.requiresAttunement,
        description: ''
      }
      const entry: ContentEntry = {
        id,
        type: 'item',
        source: 'custom',
        name: item.name,
        summary: item.name,
        tags: [],
        world: sourceName,
        createdAt: now,
        updatedAt: now,
        data
      }
      return entry
    })
    return { ...item, contentId }
  })

  // ---------------------------------------------------------------------------
  // 2. Feats
  // ---------------------------------------------------------------------------

  const updatedFeatures: PcFeature[] = pc.features.map((feature) => {
    if (feature.category !== 'feat') return { ...feature }

    const contentId = resolveId(['feat'], 'feat', feature.name, (id) => {
      const desc = feature.description ?? ''
      const data: FeatData = { description: desc }
      const entry: ContentEntry = {
        id,
        type: 'feat',
        source: 'custom',
        name: feature.name,
        summary: desc.slice(0, 120).trim(),
        tags: [],
        world: sourceName,
        createdAt: now,
        updatedAt: now,
        data
      }
      return entry
    })
    return { ...feature, contentId }
  })

  // ---------------------------------------------------------------------------
  // 3. Background
  // ---------------------------------------------------------------------------

  let backgroundContentId = pc.backgroundContentId
  const bgName = pc.background.name

  if (bgName && !backgroundContentId) {
    backgroundContentId = resolveId(['background'], 'background', bgName, (id) => {
      const data: BackgroundData = { description: '' }
      const entry: ContentEntry = {
        id,
        type: 'background',
        source: 'custom',
        name: bgName,
        summary: bgName,
        tags: [],
        world: sourceName,
        createdAt: now,
        updatedAt: now,
        data
      }
      return entry
    })
  }

  // ---------------------------------------------------------------------------
  // 4. Spells
  // ---------------------------------------------------------------------------

  const updatedSpells: PcSpell[] = (pc.spells ?? []).map((spell) => {
    if (!spell.name) return spell
    const contentId = resolveId(['spell'], 'spell', spell.name, (id) => {
      const levelText = spell.level === 0 ? 'Cantrip' : `${spell.level}-level`
      const data: SpellData = {
        level: spell.level,
        levelText,
        school: '',
        castingTime: '',
        range: '',
        components: '',
        duration: '',
        concentration: false,
        ritual: false,
        description: '',
        classes: []
      }
      const entry: ContentEntry = {
        id,
        type: 'spell',
        source: 'custom',
        name: spell.name,
        summary: levelText,
        tags: [],
        world: sourceName,
        createdAt: now,
        updatedAt: now,
        data
      }
      return entry
    })
    return { ...spell, contentId }
  })

  // ---------------------------------------------------------------------------
  // 5. Actions — link each to a library entry (feat / homebrew search first),
  //    creating a homebrew stub if nothing matches.
  // ---------------------------------------------------------------------------

  const updatedActions: PcAction[] = (pc.actions ?? []).map((action) => {
    if (!action.name) return action
    const typeLabel =
      action.type === 'action' ? 'Action' :
      action.type === 'bonus' ? 'Bonus Action' :
      action.type === 'reaction' ? 'Reaction' : 'Ability'
    const contentId = resolveId(['feat', 'homebrew', 'class', 'subclass'], 'homebrew', action.name, (id) => {
      const data: HomebrewData = { category: typeLabel, description: action.description }
      const entry: ContentEntry = {
        id,
        type: 'homebrew',
        source: 'custom',
        name: action.name,
        summary: action.description.slice(0, 120).trim() || action.name,
        tags: [],
        world: sourceName,
        createdAt: now,
        updatedAt: now,
        data
      }
      return entry
    })
    return { ...action, contentId }
  })

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    pc: {
      ...pc,
      backgroundContentId,
      inventory: updatedInventory,
      spells: updatedSpells,
      features: updatedFeatures,
      actions: updatedActions
    },
    newEntries
  }
}
