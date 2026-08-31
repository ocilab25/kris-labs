# kris-labs

Monorepo of signature engineering projects. Each app is independently deployable and demonstrable;
shared concerns (design system, typed contracts, offline-sync, auth, config) live in `packages/`.

> Status: **early / scaffolding.** This README and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) capture
> the design decisions first; the Turborepo/Expo scaffold and app code follow.

## Apps

### `apps/escalajusta` — explainable shift scheduling (web)
Generate labor-law-compliant work schedules (Brazilian CLT: DSR, 11h inter-shift rest, weekly caps, 12x36)
with a **constraint solver**, and — the actual hard part — **explain infeasibility**: when no valid schedule
exists, extract the **minimal conflicting constraint set (MUS/IIS)** and state it in plain, actionable terms
(*"can't schedule Maria on Sunday: it breaks the weekly rest rule AND there's no Saturday substitute — relax
one of the two"*), including counterfactuals.

- **Hard part:** the explainability layer, not the solver. Uses **OR-Tools CP-SAT** as the search engine
  (reimplementing a solver would be a red flag); the engineering is CLT rules as tested, versioned code +
  minimal-conflict explanation + sub-second incremental re-solve on drag-and-drop.
- **Why it's not a clone:** commercial rostering (Timefold, Deputy, 7shifts, Moavi) either hides the "why"
  behind a paywall or just warns and lets you override. No OSS models Brazilian CLT in a solver *and*
  productizes minimal-conflict explanation.

### `apps/trilha` — offline-first field GPS logger (mobile, Expo)
A lightweight field data-collection app: turn it on at the start of field work and it logs the GPS track and
observation points — **fully offline** (no signal in the field) — then syncs when connectivity returns.

- **Hard part:** reliable **background GPS logging** on Android (foreground service, background-location
  permission, Doze/battery constraints) + **offline maps** (MapLibre + PMTiles) + a **store-and-forward sync
  engine** (local outbox → API, idempotent, conflict-aware).
- **Why it's not a clone:** QField/Mergin are heavy GIS clients, Fulcrum is expensive (5-user minimum),
  Kobo/ODK are form-first. The gap: a lean, offline-first logger that plugs into your **own** API.
- A private BioTabular connector consumes this app's API contract (separate private repo).

## Shared packages

| Package | Purpose |
|---|---|
| `packages/ui` | Design system — React + Tailwind + shadcn + tokens (web surfaces) |
| `packages/schemas` | End-to-end typed contracts (zod) shared by backend and clients |
| `packages/sync` | Offline-first outbox/sync engine (used by Trilha; portfolio piece in its own right) |
| `packages/auth` | Better Auth setup |
| `packages/config` | tsconfig / biome / tailwind preset / CI |

## Stack

Turborepo · pnpm · TypeScript · Next.js 16 (EscalaJusta web) · Expo / React Native (Trilha) ·
Python + OR-Tools CP-SAT (`services/solver`) · Cloudflare Durable Objects (live re-solve coordination) ·
Postgres/Neon · Render (solver hosting).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the decisions and their rationale.
