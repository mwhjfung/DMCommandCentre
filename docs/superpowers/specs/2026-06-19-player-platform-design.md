# Player Platform Design

**Status:** Parked — design complete, implementation deferred  
**Date:** 2026-06-19  
**Prerequisite:** Must work on tablets (iOS/Android/Windows tablets) as well as laptops

---

## Summary

Add a player-facing platform to DM Command Centre. The DM Electron app gains a sharing layer; players access a web app (PWA) that shows them what the DM has shared, their character sheet, initiative tracker, and notes — in real-time.

---

## Architecture

```
DM Electron App          Supabase                    Player Web App
(existing, extended)     (Postgres + Auth             (React PWA,
                         + Realtime + RLS)             deployed to Vercel)

Local Dexie ──push──▶   shared library    ──sync──▶  IndexedDB (Dexie)
(source of truth)        character data               + session state
                         notes                        + player notes
                         campaign roster
```

**Key principle — DM controls the gate.** Nothing reaches Supabase unless the DM explicitly pushes it. Private DM notes, hidden library entries, and spoilers never leave the DM's machine.

**Player app** is a React PWA (Progressive Web App) — installable on any device (laptop, tablet, phone) from a browser URL. No Electron needed for players; no download required.

**Supabase** holds only what the DM has shared plus player-authored content. Row Level Security (RLS) enforces that players can only read campaigns they are active members of, and only entries/notes targeted at them.

**Cost at launch:** $0. Supabase free tier and Vercel free tier cover this comfortably until commercial scale. First paid tier needed (~$25/mo Supabase Pro) when auto-pause becomes an issue at public launch.

---

## Data Model

```sql
-- Auth handled by Supabase Auth (magic link + Google OAuth)

campaigns
  id, name, owner_id → users, created_at
  subscription_tier  -- (free | pro) for future billing

campaign_members
  id, campaign_id, user_id, role (dm | player)
  pc_id              -- nullable → player_characters.id
  invited_at, joined_at, removed_at  -- null removed_at = active

shared_library_entries
  id, campaign_id, local_entry_id  -- DM's Dexie id
  name, type, summary, body
  visible_to         -- (all | specific)
  pushed_at, updated_at

entry_visibility
  entry_id, member_id  -- used when visible_to = 'specific'

-- Character data is split between DM-owned base and player-owned session state

character_base
  id, campaign_id, pc_id
  -- DM-owned: class, level, stats, proficiencies, spells_known, features, actions
  -- Visibility flags per field (DM can withhold background/lore fields)
  data jsonb
  visible_fields jsonb  -- array of field keys the DM has exposed to the player
  updated_at

character_session_state
  id, campaign_id, pc_id, player_id
  -- Player-owned: transient in-session values
  current_hp, temp_hp
  spell_slots_used jsonb
  conditions jsonb
  inspiration bool
  hit_dice_used int
  updated_at

shared_notes
  id, campaign_id, sender_id
  title, body, session_id (nullable), created_at
  target  -- (all | specific)

note_recipients
  note_id, member_id  -- used when target = 'specific'

player_notes
  id, campaign_id, author_id, pc_id (nullable)
  title, body, created_at, updated_at
```

---

## Auth & Identity

- **Magic link** (default) — passwordless, player clicks a link in their email
- **Google OAuth** (optional) — one-click sign-in
- DM signs into Supabase once in the Electron app; session stored in `electron-store`, auto-refreshes silently
- Player invite flow: DM generates invite link → player clicks → account created → auto-joined to campaign

---

## DM App Changes (Electron)

New **Campaign Hub** section added to the existing navigation:

- **Roster tab** — view all members (pending / active / removed), assign players to PCs, remove players, generate invite links
- **Share controls on library entries** — each entry gets a visibility toggle: Hidden (default) / All players / Specific players. Marking visible immediately pushes to Supabase.
- **Notes tab** — compose a note, target at all players or specific players, send. Appears in player app in real-time.
- **Sync status indicator** — shows last synced timestamp and any pending pushes

Local Dexie data is untouched. Sharing is additive — un-sharing removes from Supabase only, nothing deleted locally.

---

## Player Web App (PWA)

React app, same design language as DM app (Tailwind, same component style). Deployed to Vercel. Installable as a PWA on any device — laptop, tablet (iPad/Android), or phone.

### Navigation

**Dashboard · Library · Character · Notes**

---

### Dashboard

Single-session view — everything needed to play right now:

- **Left column** (scrollable, collapsible) — compact character sheet: stats, skills, saving throws, proficiencies, AC, initiative, speed, actions, spells. Expand button opens the full character sheet inline.
- **Initiative tracker** — names only, cycling in order. No HP visible. Read-only. Cannot add/remove characters.
- **Notes panel** — tabbed: *Player Notes* / *DM Notes*. Scoped to current session only.

---

### Library

Shared library entries the DM has made visible. Filterable by type. Same card + detail drawer pattern as DM app. Read-only. Players can add personal annotations to any entry (stored under their account).

**⌘K / Ctrl+K global search** — same fuzzy search overlay as DM app, searches across shared entries and player notes.

---

### Character

Full playable character sheet. Same data as dashboard compact view, fully expanded:

- All stats, skills, saving throws, proficiencies
- Actions (standard, bonus, reaction)
- Spells with slot tracking — player marks slots used
- Equipment, features, traits

DM-withheld fields (background, lore, secrets) simply don't appear — no indication they're hidden.

**Data ownership:**
- **Base data** (DM-owned) — class, level, stats, proficiencies, spells known, features. Set in DM Electron app, pushed to Supabase. Player sees read-only.
- **Session state** (player-owned) — current HP, temp HP, spell slots used, conditions, inspiration, hit dice used. Player edits freely; DM can view read-only.

---

### Notes

Full history (not session-scoped) of DM notes and player notes. Tabbed. Player notes are editable.

---

## Offline Mode (PWA)

Player taps "Save for offline" → app caches:
- All currently shared library entries into browser IndexedDB (Dexie)
- Player notes
- Character base data + session state
- Last-synced DM notes

**Works offline:** library browsing, player notes (edits queue for sync), character sheet viewing, session state editing (queues for sync).

**Requires connection:** receiving live DM pushes, real-time initiative tracker, new DM notes mid-session.

Base library available offline includes: everything the DM has shared + public SRD data (spells, conditions, basic rules) from the existing seed data.

---

## Real-time Behaviour

Powered by Supabase Realtime (WebSocket subscriptions):

- DM shares a library entry → player sees it appear immediately with a toast ("DM shared: *Fireball*")
- DM sends a note → appears in player Notes panel instantly
- Player updates session state (HP etc.) → DM can see it update in the Electron app
- Initiative tracker reflects DM's current combat order in real-time

---

## Commercialisation Considerations

- Multi-tenancy is baked in from day one (all data scoped to `campaign_id`)
- RLS enforces data isolation between campaigns
- `subscription_tier` field on campaigns ready for billing tiers (e.g. free = 3 players, pro = unlimited)
- Invite link system is the natural enforcement point for tier limits
- Stripe integration to be added when billing is needed — no changes to data model required

---

## Open Questions / Deferred Decisions

- Tablet layout specifics — the player web app must work well on iPad and Android tablets. Dashboard layout (left column + main area) may need to become a bottom-sheet or tab-based layout on smaller screens. To be designed before implementation.
- Whether DM can see player notes by default or it's opt-in per campaign
- Whether players can see each other's annotations on library entries
- Dice rolling — out of scope for v1 but natural addition to character sheet
- Session management — how "current session" is defined in the Notes panel (manual start/stop by DM, or time-based?)
