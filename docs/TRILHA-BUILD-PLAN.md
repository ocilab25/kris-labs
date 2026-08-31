# Trilha — build plan (flagship)

Trilha is the flagship portfolio piece: an **offline-first field GPS logger** (mobile) that records the GPS
track + observation points with no signal, and syncs when connectivity returns. Public OSS core; a private
`trilha-biotabular` connector consumes its API later. This plan is the starting brief for a fresh build session.

> Decision context: chosen over EscalaJusta after an adversarial (Team Red) review — Trilha is the stronger
> recruiter signal (visceral "works with no internet" demo) and its offline-first engine has a revenue path
> (agro / last-mile). See the cockpit research docs for the full reasoning.

## Why this wins (the demo)
Open two screens, put the phone in airplane mode, walk around → the track keeps logging on an **offline map**;
re-enable data → points **sync automatically**. In 30s a recruiter sees background GPS, offline maps, and a
store-and-forward sync engine — the hard parts, visible.

## The three hard parts (where the engineering is)
1. **Reliable background GPS on Android** — foreground service + `ACCESS_BACKGROUND_LOCATION` + battery-opt
   exemption (Doze kills FusedLocationProvider otherwise). Log for hours, screen off, phone in a backpack.
2. **Offline maps** — MapLibre + PMTiles (single-file, HTTP range), tiles cached before going to the field.
3. **Store-and-forward sync** — local outbox (SQLite), idempotency keys, GeoJSON/GPX export, sync on reconnect,
   conflict-aware. Lives in `packages/sync` — reusable, portfolio-worthy on its own.

## Stack (decided)
Expo (React Native) · Turborepo monorepo · TypeScript · background-geolocation library (evaluate transistorsoft
paid ~US$250-400 vs OSS Tracelet/Anchor — start OSS for the public demo) · MapLibre GL Native + PMTiles ·
SQLite (expo-sqlite) outbox · sync API (Next.js route handlers / Cloudflare Worker) · Neon/Postgres server side.
Android-first (dominant in the field, esp. rural BR).

## Milestones (~2-3 weeks)
- **M1 — foreground GPS + local log.** Expo app in `apps/trilha`; foreground-service background location; write
  points to a local SQLite outbox; show a live-updating list. Demoable offline immediately.
- **M2 — offline map + track.** MapLibre + a cached PMTiles region; draw the live track + points; airplane-mode
  proof.
- **M3 — sync engine.** `packages/sync` outbox → API with idempotency; sync-status UI (pending/synced);
  GeoJSON/GPX export. Reconnect drains the queue.
- **M4 — polish + deploy.** UI pass (avoid generic template look); README with an animated offline→sync demo;
  Android build via EAS.

## Monorepo setup (first tasks)
1. `pnpm dlx create-turbo@latest` (or manual: root `package.json` + `turbo.json` + `pnpm-workspace.yaml`).
2. `apps/trilha` = Expo app; `packages/{sync,schemas,ui,config}` stubs.
3. Wire `packages/schemas` (zod) as the shared contract between the sync engine and the API.
4. Keep `apps/escalajusta` and `services/solver` as empty placeholders for now (EscalaJusta paused).

## Prior art (don't clone — the gap we fill)
QField/Mergin (heavy GIS), Fulcrum (expensive, 5-user min), Kobo/ODK (form-first), BasicAirData GPS Logger
(export-only, no sync). Gap: a **lean, offline-first logger that plugs into your own API**. See ARCHITECTURE.md.

## Reuse / revenue note
The same Expo + offline-sync engine underpins two revenue paths (documented in cockpit money-niche research):
**agro field input tracking** and **last-mile proof-of-delivery**. Build `packages/sync` generic enough to reuse.
