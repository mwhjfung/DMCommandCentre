# DM Command — Design & Roadmap

_Last updated: 2026-06-14_

A local-first desktop toolkit for running D&D 5e sessions. The heart of it: a
microphone that listens while you run a game and surfaces the right reference
card the moment you say a spell, monster, item or condition name.

This document is the source of truth for what we're building and in what order.
It deliberately narrows the original build brief to a focused, single-user v1.

---

## Who it's for

One person — the DM — running sessions on a single machine. **Not** a
multi-user product, **not** a multi-device sync tool. Every scope decision below
follows from that.

---

## v1 scope

**In:**

- **Content Library** — browse/search Open5e SRD content (spells, monsters,
  magic items, equipment, classes, conditions) plus your own custom entries.
  Custom entries use structured templates and live in a local database.
- **Dashboard / Board** — a grid of content cards. Pin cards to keep them up
  top, drag to reorder pinned cards, click to open a detail drawer on the right.
- **Voice Keyword Feed** — the core. Mic listens, transcript scrolls, and any
  library term spoken aloud is pushed as a card to a most-recent-first feed.
  Smart filters: suppress repeats, ignore list, content-type filters.
- **Session Combat Tools** — initiative tracker (with HP, condition badges,
  round counter, Space = next turn) and a spell-slot tracker.
- **Summary Generator** — turn a session transcript into a player-facing recap
  and a DM-facing working-notes recap, side by side, via the Anthropic API.
- **Settings** — voice device + mode, keyword filters, LLM key + model, and
  data export/import.

**Out (deferred):**

- Player inventory manager + currency tracking → Phase 2+.
- Supabase auth and any cloud sync → optional Phase 4 (plain cloud backup only).
- Multi-device, multi-user, speaker diarisation, mobile, VTT integration.

The v1 backup story is **JSON export/import**, not the cloud. For one machine
that's just as safe and a fraction of the work.

---

## Tech stack

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Desktop shell  | Electron                                 |
| UI             | React                                    |
| Bundler        | Vite (via electron-vite)                 |
| Styling        | Tailwind CSS                             |
| State          | Zustand                                  |
| Local data     | Dexie.js (IndexedDB)                     |
| SRD content    | Open5e API (`https://api.open5e.com`)    |
| Transcription  | In-app Whisper (Transformers.js, WebGPU/WASM) |
| LLM            | Anthropic API (`claude-sonnet-4-6` default) |
| Secrets        | electron-store (encrypted)               |
| Packaging      | electron-builder (`.dmg` / `.exe`)       |

**Deviations from the original brief:**

- **Supabase dropped from v1.** Local-first only; cloud is an optional later
  phase.
- **Transcription is in-app Whisper, provider-abstracted.** Web Speech was
  proven dead in Electron (see voice section); the engine is now Whisper running
  locally via `@huggingface/transformers`. The provider interface stays so a
  local Whisper HTTP endpoint or cloud STT could be swapped in later.

---

## Architecture

Layered so later phases slot in without rework. Absolute imports (`@/...`).

```
src/
  main/                  Electron main process (window, tray, IPC, secrets)
  preload/               Context-bridge: safe API surface for the renderer
  renderer/
    app/                 Routing, layout shell, sidebar nav
    components/          Reusable UI (cards, drawer, badges, inputs)
    features/
      library/           Content Library (SRD + custom)
      board/             Dashboard / pinnable card grid
      voice/             Transcription + keyword feed
      session/           Combat tools (initiative, spell slots)
      summary/           Session summary generator
      settings/          Settings panels
    lib/
      api/               Open5e client, Anthropic client — the ONLY fetch layer
      db/                Dexie schema + typed data access
      voice/             Transcription provider interface + implementations
      keywords/          Keyword index + matching + smart filters
      store/             Zustand stores (content, voice, session, settings)
    types/               Shared TypeScript types
```

**Rules:**

- No raw `fetch` in components. Everything external goes through `lib/api/`.
- Dexie is the single source of truth. Stores read/write through `lib/db/`.
- Transcription providers implement one small interface; nothing else in the
  app knows which provider is live.

---

## Data model

All entities share: `id` (uuid), `createdAt`, `updatedAt`, `source`
(`srd` | `custom`).

Dexie tables:

- **content** — every content entry with a `type` discriminator (spell,
  monster, item, weapon, condition, class, subclass, worldEntry). SRD entries
  are cached here after first fetch; custom entries are authored here.
- **sessions** — metadata + full transcript + generated summaries.
- **pcs** — player characters (name, class, level, spell slots).
- **combatants** — per-session initiative state.
- **settings** — key/value (non-secret). Secrets (API keys) live in
  electron-store, encrypted, in the main process — never in IndexedDB.

---

## The voice pipeline (the risky core)

This is the one part that can genuinely fail, so it's built and proven first.

**Provider interface.** A `TranscriptionProvider` exposes `start()`, `stop()`,
and emits `partial`/`final`/`status`/`error` events. The rest of the app talks
only to this interface.

**Resolved (2026-06-14):** Web Speech (`webkitSpeechRecognition`) was tested in
dev Electron on day one and **failed with `network` (fatal)** — Electron's
bundled Chromium has no Google speech backend. Dead end, exactly as feared.

**The engine is in-app Whisper** via `@huggingface/transformers` (model
`Xenova/whisper-base.en`), running in the renderer on **WebGPU** with a WASM
fallback. No server, no native build, fully local and offline after the one-time
~100 MB model download. Proven in Electron: **18.3s of audio transcribed in
2.1s on WebGPU (8.6× faster than real-time)**, SRD names clean, rare/unknown
proper nouns lightly fuzzed.

- `WhisperLocalProvider` — captures mic audio (AudioWorklet), chunks it on
  silence/short windows, transcribes each chunk via the engine, runs inference
  in a Web Worker so the UI never blocks.
- The provider interface is kept so a remote Whisper HTTP endpoint or cloud STT
  could be added later without touching the feed.

**Implication for matching:** because Whisper lightly fuzzes rare names,
keyword matching must be fuzzy (token + edit-distance), not exact-only. The
"sensitivity" setting controls the threshold. This is load-bearing.

**Keyword matching.** On library load, build an in-memory index: every content
name (and useful aliases), normalised (lowercased, punctuation stripped). Each
final transcript chunk is scanned against the index. A match becomes a feed
card unless a smart filter suppresses it:

- **Suppress repeats** — same term within the last N minutes (1/5/10, config).
- **Ignore list** — user-defined terms that never trigger (e.g. PC names).
- **Content-type filters** — toggle which types can surface.
- **Sensitivity** — exact-only vs. simple token/fuzzy match.

**Transcript log.** Full transcript saved to the `sessions` table when the mic
stops or the session ends. This is what the summary generator consumes.

---

## UI / UX

- **Dark only.** Near-black background (`#0e0e10` range), deep amber/red accent.
- **Dense but readable.** Base 15–16px. Scannable cards. Used at a table in low
  light.
- **Keyboard-first where it counts.** Space = next turn, `/` = search,
  Esc = close drawer.
- **Minimal motion.** Transitions ≤150ms. Not a showcase app.
- **Tray.** Minimise to system tray, keep listening.
- **Responsive down to 1280px.** No fixed widths that break below 1440px.

---

## Phase plan

**Phase 1 — the vertical slice (this is v1's foundation):**

1. Scaffold: electron-vite + React + Tailwind + Zustand + Dexie, app shell,
   sidebar nav, dark theme, absolute imports, packaging config.
2. **Prove Web Speech transcription in dev Electron.** Do this early — it
   de-risks everything downstream.
3. Content layer: Open5e client + caching, Dexie schema, custom-entry templates.
4. Library + Board + detail drawer.
5. Voice keyword feed wired to the library, with smart filters.
6. Settings needed for the above (voice, keyword filters, data export/import).

**Phase 1b — pulled into v1 per scope decision:**

7. Session combat tools (initiative tracker, spell-slot tracker).
8. Summary generator (Anthropic client, side-by-side recaps, LLM settings).

**Phase 2 —** player inventory + currency tracking.

**Phase 3 —** polish, packaging hardening, installer testing on both platforms.

**Phase 4 (optional) —** Supabase as plain cloud backup (export/restore), not
live sync.

---

## Known technical risks

1. **Web Speech API in Electron** — RESOLVED: confirmed dead (`network` fatal).
   Replaced by in-app Whisper. Remaining check: confirm WebGPU still accelerates
   in the *packaged* `.dmg` (dev is proven); WASM fallback covers it regardless.
2. **Open5e availability/shape** — cache aggressively; the app must work offline
   once content is fetched.
3. **electron-store encryption is obfuscation, not real security** — fine for a
   personal machine; the API key is recoverable by anyone with file access. Not
   a v1 concern, but stated honestly.
