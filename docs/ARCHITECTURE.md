# Architecture & Hard Decisions

This document records *why* the monorepo is shaped the way it is. It is deliberately opinionated and honest
about trade-offs and prior art — the point of these projects is to demonstrate engineering judgment, not to
pretend a problem is unsolved when it isn't.

## Why a monorepo (Turborepo)

Two products (a scheduling web app and a mobile field app) share meaningful cross-cutting layers — design
system, typed API contracts, offline-sync primitives, auth, tooling config — but little domain logic. A
single Turborepo lets those layers be shared without publishing/versioning a standalone package (overhead for
a solo dev), while each app stays independently deployable and demonstrable. Choosing React Native (Expo) for
the mobile app is what makes TypeScript reuse across web and mobile possible at all; a Kotlin/Flutter app
would share nothing with the TS packages.

## `apps/escalajusta` — explainable shift scheduling

- **The solver is not the hard part.** OR-Tools CP-SAT and Timefold (ex-OptaPlanner, Apache 2.0) already
  solve employee/nurse rostering with mature metaheuristics. Writing a solver from scratch would be a red
  flag. CP-SAT is a dependency, not the contribution.
- **The contribution is explainability.** Given an infeasible instance, extract the minimal unsatisfiable
  subset (MUS/IIS) of constraints and translate it into actionable language, with counterfactual relaxations.
  This exists as research (CPMpy/XCP-explain) but is not productized by any competitor found — commercial
  tools warn-and-override (7shifts) or flag without decomposing the cause (Deputy).
- **CLT rules as tested code.** Brazilian labor rules (DSR Art. 67, 11h inter-shift Art. 66, weekly caps,
  12x36 Art. 59-A) modeled as a versioned, unit-tested constraint library. Flagship vertical: **small
  commerce / bakery** (stable, citable rules, low risk). Medical shift scheduling is **out** — the BR market
  is saturated (≥9 active apps) and the regulatory mosaic (CFM + state CRMs) is unstable. Truck-driver
  rotation is a *secondary plugin at most* — legally unstable (STF struck down 11 points of Lei 13.103 in
  2023; US HOS requires FMCSA-certified ELD).
- **Why not WASM/edge for the solver:** no `ortools` wheel for Pyodide/Cloudflare Python, and CP-SAT needs
  multithreading — single-thread in the browser kills performance. The solver runs as a **Python microservice
  (FastAPI) on Render** (always-on, avoids cold start).
- **Real-time re-solve:** drag a shift → optimistic UI → a **Cloudflare Durable Object** (one per schedule in
  edit) debounces and serializes concurrent re-solve requests → CP-SAT re-solves only the affected
  neighborhood (`AddHint` + `fix_variables_to_their_hinted_value`) → result broadcast via WebSocket. Infeasible
  path uses `AddAssumptions` + `SufficientAssumptionsForInfeasibility` (single-thread, 2-phase).
- **Honest positioning:** *"I used CP-SAT as the search engine; the engineering I did was modeling CLT as
  tested code and building the minimal-conflict explanation/relaxation layer on top."*
- **Risk:** Timefold Platform ships the whole product (CSP + pinning + live replan + explainability)
  commercially — the narrative must be crisp about which specific hard piece is mine.

## `apps/trilha` — offline-first field GPS logger

- **GPS works without cellular signal.** GNSS is a separate radio; losing data only costs A-GPS (slower cold
  fix), online map tiles, and real-time upload. Mitigations: offline maps (**MapLibre + PMTiles**), local
  logging, and store-and-forward sync.
- **A PWA is not sufficient.** The web Geolocation API has no reliable background execution on Android; a
  native app with a **foreground service** + `ACCESS_BACKGROUND_LOCATION` + battery-optimization exemption
  (Doze) is required for continuous logging with the screen off. **Android-first.**
- **Stack: React Native (Expo).** Chosen to reuse `schemas`/`sync`/`ui` with the rest of the monorepo and for
  single-dev velocity, while remaining a genuinely native app. Background geolocation via a mature library
  (transistorsoft, paid) or an OSS alternative (Tracelet/Anchor); can drop to a native module in the private
  connector if deep-field reliability demands it.
- **Sync:** outbox pattern over SQLite/Room; idempotency keys; GeoJSON/GPX export; sync when connectivity
  returns. Lives in `packages/sync` as a reusable engine.
- **Prior art / not a clone:** QField/Mergin (heavy GIS), Fulcrum (expensive, 5-user min), Kobo/ODK
  (form-first). Gap: a lean offline-first logger that plugs into an owned API.

## Private connector (separate repo)

`trilha-biotabular` (private) consumes the Trilha API contract to feed a proprietary platform. Kept out of
this public monorepo so the public artifacts expose no proprietary logic.
