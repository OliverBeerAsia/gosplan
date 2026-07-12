# GOSPLAN Graphics Pack 4A Implementation Report

Date: 2026-07-10

Status: Implemented, verified, and accepted as a bounded authored worker-housing vertical slice

Repository baseline: `fafaedb59a51fa8432065b41166ff4ca9989cbcc`

Branch: `main`

## Outcome

Pack 4A replaces the procedural Khrushchyovka presentation with an original manifest-driven authored family while preserving the existing 2 x 1 gameplay footprint, cost, capacity, placement rules, save version, and simulation RNG.

The delivered family contains three deterministic physical masses:

- short five-storey slab
- long five-storey slab
- shallow linked-return slab

Each mass has far, mid, and near frames in one untrimmed 1x atlas. The runtime uses stable placement identity, not mutable district metrics, so a completed building cannot morph when zoning or service coverage changes.

## Implemented systems

- multi-atlas manifest loading with full `atlasId:frameId` references
- deterministic authored mass selection independent of simulation RNG
- far, mid, and near LOD with hysteresis at the established zoom thresholds
- exact authored anchors at `[80,168]`
- variant-owned entrance, queue, and window anchors
- authored powered-window lights on real panes, capped at 8 on High and 4 on Medium
- no individual authored window lights at far LOD
- procedural fallback when the manifest, atlas, or selected frame is unavailable
- development-only, production-eliminated benchmark fixture and capture controls
- non-destructive in-memory benchmark loading with ordinary local saves untouched
- paused-save power reconciliation without advancing time, ticks, or RNG

## Art and menu integration

The production atlas is original code-native SVG geometry. The image-generation concept board informed only concrete, snow, glazing, and oxide-door relationships. Its tower, oversized slab, and U-shaped geometries were explicitly rejected and no generated pixel was traced or embedded in the atlas.

The opening dossier also received a bounded generative cleanup after creative review found malformed lettering on a paper prop. The accepted result replaces that lettering with an unlabeled planning chart. The pre-edit source, accepted source, runtime PNG, runtime WebP, tool, and hashes are recorded in `docs/GRAPHICS_ASSET_PROVENANCE_2026-07-10.md`.

The loading interstitial now relies on the illustrated dossier composition without the redundant caption that crossed a decorative line. Its full description remains in the image alt text.

## Primary paths

### Runtime and schema

- `src/graphics/ArtManifest.ts`
- `src/graphics/ArtRegistry.ts`
- `src/graphics/ArtVariantResolver.ts`
- `src/graphics/SpriteAtlasLoader.ts`
- `src/graphics/TextureFactory.ts`
- `src/rendering/BuildingRenderer.ts`
- `src/rendering/WindowLightRenderer.ts`
- `src/core/Game.ts`
- `src/core/SaveLoad.ts`
- `src/simulation/SimulationManager.ts`

### Art and manifest

- `public/assets/art/atlases/buildings-khrushchyovka-1x.svg`
- `public/assets/art/atlases/buildings-khrushchyovka-1x.json`
- `public/assets/art/manifest.v1.json`
- `public/assets/ui/opening-home.png`
- `public/assets/ui/opening-home.webp`

### Benchmark and validation

- `tests/fixtures/visual/pack4-worker-housing-v1.json`
- `scripts/check-khrushchyovka-atlas.cjs`
- `scripts/check-worker-housing-benchmark.cjs`
- `scripts/check-art-manifest.cjs`
- `scripts/check-art-manifest.test.cjs`
- `docs/PACK4_WORKER_HOUSING_BENCHMARK.md`

### Evidence

| File | SHA-256 | Acceptance |
|---|---|---|
| `opening-dossier-1366x768.png` | `8b45108590d1eb055f15bfe6172eaaf15f936ed5ff467e0a427e57d7cd48ee64` | Clean dossier art, no malformed paper lettering |
| `loading-dossier-1366x768.png` | `bd337d260212dca5141ab00097975049b7e8c3571fbead0a949dbe79153bb807` | Illustrated restore loader, no ASCII and no caption collision |
| `pack4-khrushchyovka-atlas.png` | `2cd7cdd5c516de8fa91de7e5ba87319650d3445a2cfd039bcd78b4ad3c646fe0` | Three masses across three LOD rows |
| `pack4-worker-housing-day-1366x768.png` | `973986cb475d45d2742caff918a61d2d16e41872addb19e2fb69f85c5bfef08d` | Populated winter district, High, zoom 1, day |
| `pack4-worker-housing-night-1366x768.png` | `0504cde4ed5ee8e258ee93a27a3481bc7eae8426d20bd879a419dda95a364806` | Stable HUD/minimap and powered authored pane lights |
| `pack4-worker-housing-far-025-1366x768.png` | `4efdf4851d91d5865a45d37ecc9474b18999031b5b7083c461db77cf55c67a4e` | Whole-city far silhouette at zoom 0.25 |

Benchmark fixture SHA-256: `496f2f491fb62c72fc425999498ea65f53d449b5fa1f4d8b97b0494b8aba8b3f`

## Verification

The following passed with the local cached Node runtime:

- Khrushchyovka atlas and anchor validator
- art manifest validator
- 14 authored-art tests
- deterministic simulation check
- elevation foundation check
- interaction regression check
- shared world-depth check
- worker-housing benchmark check
- paused-load power, week, year, tick, and RNG invariants
- TypeScript check
- production build
- production bundle exclusion for benchmark hook, queries, fixture ID, and path
- `git diff --check`

The production build retains the existing warning that the primary JavaScript chunk exceeds 500 kB. No new build failure was introduced.

## Adversarial review trail

The team rejected and corrected the following issues before sign-off:

1. Initial sprites read as towers. All nine frames were flattened into horizontal five-storey masses.
2. Short, long, and linked masses were too similar in gameplay. Width contrast, linked roof notch, and linked elbow shadow were strengthened.
3. Mutable district style participated in physical-mass hashing. It was removed from stable identity while remaining an eligibility input.
4. Window lights rebuilt on service and demand events. Those broad listeners were removed.
5. Generic effects did not respect authored geometry. Variant-owned door, queue, and window anchors now drive the effects.
6. Paused restored cities did not reconcile transient power flags. Load-time infrastructure reconciliation now runs without a simulation tick.
7. The opening art contained malformed prop lettering. It was replaced with an unlabeled planning chart and re-captured.
8. The loading caption crossed a decorative artwork line. The redundant visible caption was removed and its content preserved in alt text.

Final creative red-team result: PASS for the bounded Pack 4A slice.

Final interaction, rendering, performance, and production-dead-code result: PASS.

## Recovery and rollback

The verified Phase 1 checkpoint remains the pre-Pack4 rollback point. Pack 4A adds a new verified live-tree archive and review patch in both the repository backup directory and the durable off-workspace backup directory. Artifact names and hashes are recorded in `docs/GRAPHICS_BACKUP_AND_ROLLBACK.md` and the two `SHA256SUMS.txt` files.

Runtime fallback is also built in: a missing authored atlas or frame returns the Khrushchyovka to its existing procedural texture without changing simulation state.

The two pre-existing dirty paths remain outside Pack 4A authorship and retain their original hashes:

- `package-lock.json`: `8e984d6080545fadb6c6081943058e400b59d3401e83307e656a8a0f46b32252`
- `docs/MAINTENANCE-2026-05-24-node-audit.md`: `a31de528e1da2f11ae2d98554d48c638b519a9e0a917463910708d55fd5cc333`

## Explicit boundaries

Pack 4A does not claim completion of rotation-specific building frames, condition overlays, construction frames, full winter overlays for every state, or the full 48-case release-candidate screenshot matrix. The matrix remains defined and reproducible; Low and Medium quality, zoom 0.5 and 2, and the 1920 x 1080 viewport are later release-candidate evidence.

No commit, tag, push, pull request, deployment, or live rollback was performed.
