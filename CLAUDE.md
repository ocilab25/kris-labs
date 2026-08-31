# kris-labs — session brief

Monorepo of signature portfolio projects. **Flagship: Trilha** (offline-first field GPS logger, mobile).
EscalaJusta is **paused** (kept as placeholder). Read in this order before working:

1. `docs/ARCHITECTURE.md` — why the monorepo is shaped this way + per-app hard decisions.
2. `docs/TRILHA-BUILD-PLAN.md` — the flagship build brief (three hard parts, milestones M1–M4, first tasks).

## Language & stack (decided)

- **TypeScript everywhere** — Expo (React Native) for `apps/trilha`; all `packages/*` in TS. Strict mode.
- **Turborepo + pnpm** workspace. **Biome** for lint/format. **zod** for shared contracts (`packages/schemas`).
- **Python only** for `services/solver` (OR-Tools CP-SAT) — paused with EscalaJusta, not part of the Trilha build.
- **Trilha specifics:** MapLibre GL Native + PMTiles (offline maps), `expo-sqlite` outbox, a background-geolocation
  library (start OSS: Tracelet/Anchor; transistorsoft is the paid gold standard). **Android-first.**
- `packages/sync` = the offline-first outbox/sync engine — keep it generic (reused later by agro/last-mile paths).

## Boundaries

- **Public repo.** NEVER put proprietary BioTabular logic here — the connector is a **separate private repo**
  (`trilha-biotabular`) that consumes Trilha's API contract.
- `apps/escalajusta` and `services/solver` stay empty placeholders until explicitly revisited.

## Git

- Repo owner = **`ocilab25`**. The machine's default git credential is another account (`kralmeid`) — run
  `gh auth setup-git` once (or push via `gh` token) so pushes go as `ocilab25`.

## Skills (lean on existing globals — do NOT author bespoke ones yet)

Bitter-lesson default: add harness only on demonstrated need. What's already available and relevant:
`frontend-product-design` / `ui-ux-pro-max` (UI), `webapp-testing` / `playwright-cli` (testing),
`next-best-practices`, `durable-objects` / `workers-best-practices` / `wrangler` (edge + DO sync backend),
`neon` (Postgres). Use these; propose a new skill/agent only if a real gap shows up.

## Start

Begin at **M1** in `TRILHA-BUILD-PLAN.md` (Turborepo scaffold + `apps/trilha` Expo + foreground GPS → local
SQLite outbox → live list; demoable offline). Then M2 (offline map), M3 (sync engine), M4 (polish + EAS build).
