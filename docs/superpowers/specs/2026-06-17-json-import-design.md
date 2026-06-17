# JSON Import — Design Spec

**Date:** 2026-06-17  
**Status:** Approved

---

## Goal

Allow the library to import `.json` files directly — either pre-converted `ContentEntry[]` arrays (output of `download-5etools.mjs`) or raw 5etools data files from the 5etools-src repo (e.g. `spells-xge.json`, `bestiary-mm.json`). Large imports skip the one-at-a-time review and instead show a grouped checklist so the user can bulk-accept with optional deselection.

---

## Flow

```
JSON file selected
  → ImportDialog (simplified: source field only, no split-strategy, no Claude toggle)
  → "Parse & review" clicked
  → parseJson(file, sourceName)
      ├─ root is Array  → validate as ContentEntry[], apply source
      └─ root is Object → detect 5etools keys (spell / monster / item / baseitem / class / subclass)
                          run appropriate mappers, apply source
  → JsonBatchReview (grouped checklist, search, bulk select)
  → "Import N selected" → contentStore.bulkAdd(selected) → dialog closes
```

---

## New Files

### `src/renderer/src/lib/import/parseJson.ts`

Single exported function:

```ts
export async function parseJson(file: File, source: string): Promise<ContentEntry[]>
```

**Auto-detection logic:**

| Condition | Treatment |
|-----------|-----------|
| Root is `Array` | Validate items have `id`, `type`, `name`; treat as `ContentEntry[]` |
| Root is `Object` with key `spell` | Map each via `mapSpell(r, source)` |
| Root is `Object` with key `monster` | Map each via `mapMonster(r, source)` |
| Root is `Object` with key `item` | Map each via `mapItem(r, source)` |
| Root is `Object` with key `baseitem` | Map weapons via `mapWeapon(r, source)` (filter to `type === 'M' \| 'R'`) |
| Root is `Object` with key `class` | Map each via `mapClass(r, subs, source)` and `mapSubclass(r, source)` |
| Root is `Object` with key `subclass` | Map each via `mapSubclass(r, source)` |
| Multiple keys | Collect from all matched keys |
| None match | Throw a user-facing error |

**Mappers:** Ported verbatim from `scripts/download-5etools.mjs` (same `stripTags`, `renderEntry`, lookup tables, and per-type mappers). The script version is Node-only (uses `writeFileSync`); the renderer version just exposes the mapping logic.

**Source application:** For pre-converted arrays, if the caller provides a non-empty `source`, overwrite each entry's `world` field. For raw 5etools entries, `source` is always applied as `world` (the mapper already does this via its `source` argument).

**IDs:** Pre-converted entries keep their existing `id`. Raw 5etools entries get `ext:<type>:<slug>-<sourceSlug>` (same as the script).

**Error cases:**
- Not valid JSON → throw `"Not a valid JSON file."`
- Valid JSON but unrecognised shape → throw `"Unrecognised JSON format — expected a ContentEntry array or a 5etools data file."`
- Zero entries after mapping → throw `"No entries found in this file."`

---

### `src/renderer/src/features/library/JsonBatchReview.tsx`

Props:
```ts
{ drafts: ContentEntry[]; sourceName: string; onClose: () => void }
```

**Layout:**

```
┌─────────────────────────────────────────────┐
│ 542 entries · spells-xge.json    [🔍 search] │
├─────────────────────────────────────────────┤
│ ☑ Spells (312)           [select all / none] │
│   ☑ Abi-Dalzim's Horrid Wilting · Level 8…  │
│   ☑ Absorb Elements · Level 1…              │
│   …                                          │
│ ☑ Monsters (0)  (hidden if count = 0)        │
├─────────────────────────────────────────────┤
│ [Cancel]          [Import 542 selected ▶]   │
└─────────────────────────────────────────────┘
```

**Behaviour:**
- Groups by `ContentType`, ordered by: spell, monster, item, weapon, condition, class, subclass, feat, background, proficiency, worldentry, homebrew
- Groups with 0 entries after filtering are hidden
- Search filters by `entry.name` (case-insensitive substring)
- Group "select all" checkbox is indeterminate when partially checked
- "Import N selected" button disabled when N = 0
- On confirm: calls `contentStore.bulkAdd(selectedEntries)` — a new action that bulk-upserts entries — then calls `onClose()`
- Cancel calls `onClose()` with no save

---

## Changes to Existing Files

### `src/renderer/src/features/library/ImportDialog.tsx`

1. Add `.json` to `accept` on the file input: `.docx,.pdf,.txt,.md,.markdown,.json`
2. On file change, detect if `file.name.endsWith('.json')` and set a local `isJson` boolean
3. When `isJson`:
   - Hide split-strategy radio group
   - Hide Claude toggle
   - Show a short note: `"JSON files are parsed directly — no splitting needed."`
4. In `parse()`: if `isJson`, call `parseJson(file, source.trim())` and set phase to `'json-review'` on success
5. Add `phase === 'json-review'` to the render: show `<JsonBatchReview drafts={drafts} sourceName={source} onClose={closeImport} />`

### `src/renderer/src/lib/store/contentStore.ts`

Add `bulkAdd(entries: ContentEntry[]): Promise<void>` action. Upserts all entries into IndexedDB in a single transaction, then reloads the store. (If individual `addEntry` already does an upsert, `bulkAdd` is just a loop + single reload at the end.)

---

## Out of Scope

- Importing raw 5etools _index_ files (e.g. `index.json`) — these are lookup tables, not content
- Deduplication UI (duplicate `id`s are silently overwritten by the upsert)
- Progress indicator for very large files (>1 000 entries) — acceptable for now
