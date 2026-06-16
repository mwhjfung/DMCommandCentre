# DM Command

A local-first desktop toolkit for running Dungeons & Dragons 5e sessions, built around a **live voice keyword feed** — it listens to your table and surfaces the relevant spell, monster, item and rule cards as you play.

Everything runs and stays on your machine. There's no account, no server, and no audio ever leaves the computer.

---

## Features

- **Library** — the official 5e SRD (pulled once from [Open5e](https://open5e.com) and cached offline) alongside your own homebrew, organised into **Sources** shown as tabs. Content is scoped per campaign, with optional sharing of a Source across campaigns. Schema-driven authoring for spells, monsters/NPCs, items, weapons, conditions, classes, subclasses, proficiencies and world entries, with bulk edit (retag / move / delete).
- **Voice keyword feed** — in-app speech-to-text (Whisper, running on WebGPU with a WASM fallback) transcribes the session live and fuzzy-matches what's said against your library, popping cards into a feed. Select text to look it up, teach it corrections, and pin things to the board.
- **Dashboard** — per-session workspaces (tabs): a pinnable reference board, an initiative tracker, and notes. Creating a session lets you choose what to carry over from the last one.
- **Initiative tracker** — roll, advance with Space, track HP / temp HP / conditions, lockable initiatives, batch-add monsters, and pull in the party.
- **Party** — full character sheets: stats, saves, skills, senses, training, defences, spell slots and an Actions panel, plus Inventory (add from the library or new), Features & Traits, Background and Notes. Import characters from JSON or directly from a public **D&D Beyond** link.
- **Campaigns** — keep separate worlds, each with its own content, board, combat, party and sessions.
- **Document import** — bring in Word, PDF, text or Markdown as draft entries; an optional "smart parse with Claude" mode (your own API key) handles messy files.

See [`docs/DESIGN.md`](docs/DESIGN.md) for the design notes and roadmap.

---

## Privacy

- All data lives locally in the browser engine's IndexedDB (via Dexie) plus a small encrypted settings store (electron-store).
- Transcription happens **in-app** — no audio is sent anywhere.
- An Anthropic API key is optional and only used for the "smart parse" import; it's stored encrypted in the main process, never in the renderer.

---

## Tech stack

Electron 33 · electron-vite · React 18 · TypeScript · Tailwind CSS · Zustand · Dexie (IndexedDB) · `@huggingface/transformers` (Whisper) · electron-builder.

---

## Getting started

**Prerequisites:** Node.js 18+ (20 recommended) and npm.

```bash
npm install
npm run dev      # launches the app with hot-reload
```

> Note: changes to the renderer hot-reload instantly. Changes to the **main process or preload** (`src/main`, `src/preload`) require the dev server to restart.

**Type-check:**

```bash
npm run typecheck      # main + renderer
```

---

## Building installers

```bash
npm run build:mac      # → dist/dm-command-<version>.dmg
npm run build:win      # → dist/dm-command-<version>-setup.exe  (NSIS)
npm run build:unpack   # unpacked build for quick local testing
```

A custom app icon is optional — drop a 1024×1024 `build/icon.png` and electron-builder generates the platform icons; without it the default Electron icon is used. Targets live in [`electron-builder.yml`](electron-builder.yml). Cross-building (e.g. a Windows installer from macOS) is unreliable — build each platform on its own OS, or in CI.

Builds are **unsigned** by default, so on first launch macOS Gatekeeper warns that the developer is unidentified — right-click the app and choose **Open** to get past it. Removing that warning entirely needs an Apple Developer certificate (signing + notarisation). On Apple Silicon the build is `arm64`; add `--universal` to also run on Intel Macs.

---

## Distribution & updates

Not yet wired up. The intended path is [`electron-updater`](https://www.electron.build/auto-update) publishing to **GitHub Releases**: build with `electron-builder --publish always`, and the app checks for and installs updates on launch. Auto-update on macOS requires a signed + notarised build (an Apple Developer ID); on Windows it works unsigned, though SmartScreen warns until the installer is code-signed.

---

## Project layout

```
src/main        Electron main process (window, mic permissions, secrets, D&D Beyond fetch)
src/preload     Context-isolated bridge exposed as window.dmc
src/renderer    The React app
  app/          Layout, sidebar, router, campaign switcher
  features/     library, voice, board (dashboard), session, party, settings
  lib/          stores (Zustand), db (Dexie), api (Open5e, Anthropic), import, dnd, templates
  components/   shared UI
```

---

## Status

Single-user v1, in active development. The core (library, voice feed, dashboard, combat, campaigns, party) is built; auto-update and packaging polish are outstanding.

## Licence

MIT
