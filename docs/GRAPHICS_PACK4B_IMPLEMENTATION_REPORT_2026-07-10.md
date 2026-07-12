# GOSPLAN Graphics Pack 4B Implementation Report

Date: 2026-07-10

Status: Implemented, visually verified, adversarially reviewed, and backed up as a bounded worker-housing courtyard slice

Repository baseline: `fafaedb59a51fa8432065b41166ff4ca9989cbcc`

Branch: `main`

## Outcome

Pack 4B replaces isolated, tile-by-tile environment scatter around worker housing with deterministic courtyard compositions. The slice contains:

- `courtyard.play_square`: a compact playground and sandbox court
- `courtyard.laundry_green`: shared laundry and worn-footpath green
- `courtyard.service_edge`: signless service shelter and kiosk, authored for north-east and north-west road-facing variants

Each family has base and winter frames at far, mid, and near LOD. The runtime keeps physical terrain, elevation, building footprints, zones, roads, saves, and simulation balance authoritative. Environment art is cosmetic and derived again after load from map seed plus immutable building identity.

## Implemented systems

- optional backward-compatible `environment` collection in manifest schema v1
- 66-frame original code-native SVG atlas with 11 tile-local part types
- transparent ground decals and upright props with shared world-depth phases
- five-eighths upright artwork scale around fixed `[32,72]` contacts
- worn gray-brown paths, winter breaks and footprints, and explicit dark refuse bins
- deterministic `EnvironmentCompositionPlanner` with manifest-order and building-order independence
- empty, buildable, same-elevation, unzoned footprint claims only
- protected direct `+gy` residential entrance approaches
- minimum anchor spacing of four cells generally and eight cells within one family
- exact north-east and north-west road-edge checks with full edge coverage and elevation equality
- procedural per-part fallback when the environment atlas or selected frame is unavailable
- low, medium, and high composition caps of 0, 12, and 24
- zoom LOD hysteresis and season propagation from `Game`
- optional powered emissive support and bounded benchmark snapshot readback
- owner-aware inspect and demolish messaging for cosmetic courtyard hits without adding save entities
- weather-particle disable control for deterministic visual evidence

## Primary paths

### Runtime and schema

- `src/graphics/ArtManifest.ts`
- `src/graphics/ArtRegistry.ts`
- `src/graphics/TextureFactory.ts`
- `src/rendering/EnvironmentCompositionPlanner.ts`
- `src/rendering/EnvironmentPropRenderer.ts`
- `src/rendering/WindowLightRenderer.ts`
- `src/input/ToolController.ts`
- `src/core/Game.ts`

### Art and manifest

- `public/assets/art/atlases/environment-worker-housing-1x.svg`
- `public/assets/art/atlases/environment-worker-housing-1x.json`
- `public/assets/art/manifest.v1.json`
- `docs/graphics-review/pack4b-courtyard-concept.png`

The concept board was used only as a mood and composition reference. No generated pixel was traced, sampled, embedded, or transformed into the runtime atlas. The atlas uses original integer SVG geometry, no text, logos, terrain mattes, gradients, filters, raster images, or proprietary SimCity 2000 assets.

### Benchmark and gates

- `tests/fixtures/visual/pack4-worker-housing-courtyards-v2.json`
- `scripts/check-courtyard-atlas.cjs`
- `scripts/check-environment-composition-planner.cjs`
- `scripts/check-pack4b-courtyard-benchmark.cjs`
- `scripts/check-art-manifest.cjs`
- `scripts/check-art-manifest.test.cjs`
- `docs/PACK4_WORKER_HOUSING_BENCHMARK.md`

The Pack 4B validators are wired into `package.json` and `.github/workflows/deploy-pages.yml`. Production bundle exclusion runs after `npm run build` through `check:benchmark:pack4b:production`.

## Visual evidence

The release-candidate closure expands the original 13-case matrix to 17 cases under `docs/graphics-implementation-evidence/`:

- three family near-day cases
- three family near-night cases
- three family far-High day cases
- 1920 x 1080 overview day
- 1366 x 768 overview night
- 1366 x 768 Low-quality overview day
- real environment-atlas outage fallback overview
- north-west service-edge runtime capture
- mixed-family foundation overview
- building-atlas outage fallback
- selected environment-frame fallback

Additional evidence includes `pack4b-environment-atlas.png` and `pack4b-courtyard__interaction-demolish-hover__1366x768.png`. The interaction capture shows a courtyard amenity resolving to its owning Khrushchyovka rather than pretending to be independently demolishable.

Representative evidence hashes are recorded in the backup checksum sidecars. The release-candidate fixture SHA-256 is `cbb7a0ac59055e78ffde1714b13bb5fa10e2c6356838969efcf6a8c1fef3d476`. The final SVG atlas SHA-256 is `9fb193158dbe4498fc7f8cc2ab60894f7dc95370d970f6789bf9c7baad7a1ea8`.

## Verification

Passed with the cached local Node runtime:

- art manifest validation with environment schema validation
- 15 authored-art and fallback tests
- courtyard atlas checker
- deterministic environment planner checker
- 17-case Pack 4B benchmark checker
- original 48-case worker-housing benchmark checker
- interaction regression checker, including cosmetic courtyard ownership
- elevation foundation checker
- shared world-depth checker
- simulation determinism checker
- TypeScript `tsc --noEmit`
- Vite production build
- post-build production benchmark exclusion
- `git diff --check`

The build retains the existing main-chunk warning at approximately 601 kB after minification. No new build failure was introduced. Zone changes trigger a bounded full composition rebuild on the 32 x 32 map. Profiling and batching that rebuild under sustained drag input remain a later performance pack.

## Adversarial review trail

The team initially rejected the slice because the first props were too large, paths read as raised rails, oxide clusters repeated, service orientation accepted any nearby road, Low captures did not exercise far art, and the recovery case targeted the wrong atlas. The correction pass:

1. reduced upright art to five-eighths scale while keeping contacts fixed;
2. redrew paths as worn ground decals with snow breaks and footprints;
3. added dark refuse containers and reduced dominant oxide paint;
4. added exact edge vectors, full-edge coverage, and wrong-side tests;
5. added spacing, zone rejection, and entrance approach protection;
6. added owner-aware inspect and demolish messaging;
7. changed far cases to High quality and added a separate Low degradation case;
8. captured a real environment-atlas outage and restored the asset before final checks;
9. wired all Pack 4B gates into CI, including the post-build production check.

Final review result: creative PASS after correction, interaction PASS after evidence recapture, and technical PASS for code and CI. The v1.10.0 closure adds a dedicated north-west runtime fixture and frame-coalesced zone invalidation. The pre-existing main-bundle size warning remains.

## Save, simulation, and originality boundaries

- save version remains unchanged
- simulation RNG and mutable RNG cursor remain unchanged
- environment compositions never enter the saved building list
- zones, roads, power, elevation, and building placement remain authoritative
- no prop affects demand, happiness, service coverage, commute, power, or balance
- generated concept art is retained as mood reference only
- no SimCity 2000 sprite, layout, palette ramp, logo, or UI element was copied

## Recovery and rollback

Pack 4B retains the verified Pack 4A checkpoint as the immediate rollback target. A new Pack 4B archive, tracked review patch, checksums, off-workspace copy, and restore rehearsal are recorded in `docs/GRAPHICS_BACKUP_AND_ROLLBACK.md` and `.backups/graphics-program/2026-07-11/`.

The runtime fallback was exercised by temporarily removing `environment-worker-housing-1x.json`. The atlas was restored before the final post-restore checks. If an authored frame fails in production, `TextureFactory` returns its declared procedural `prop_*` fallback and the planner keeps the cosmetic claim identity stable.

No commit, tag, push, pull request, deployment, or live rollback was performed.
