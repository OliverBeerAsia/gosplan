# GOSPLAN Phase 1 Graphics Scope Inventory

Date: 2026-07-10

Baseline commit: `fafaedb59a51fa8432065b41166ff4ca9989cbcc`

## Pre-existing dirty paths

These files existed in the dirty working tree before graphics implementation and must not be attributed to, staged with, or rolled back as graphics work:

| Path | State before Phase 1 | SHA-256 at handoff |
|---|---|---|
| `package-lock.json` | Modified tracked file | `8e984d6080545fadb6c6081943058e400b59d3401e83307e656a8a0f46b32252` |
| `docs/MAINTENANCE-2026-05-24-node-audit.md` | Untracked file | `a31de528e1da2f11ae2d98554d48c638b519a9e0a917463910708d55fd5cc333` |

Both hashes match the pre-implementation archive byte-for-byte.

## Phase 1 modified tracked paths

```text
.github/workflows/deploy-pages.yml
.gitignore
docs/GRAPHICS_CONTINUOUS_IMPROVEMENT_PLAN.md
package.json
public/assets/ui/scenario-industrial.svg
public/assets/ui/scenario-reconstruction.svg
public/assets/ui/scenario-stagnation.svg
src/core/EventBus.ts
src/core/Game.ts
src/core/MapGenerator.ts
src/core/SaveLoad.ts
src/core/UndoManager.ts
src/graphics/TextureFactory.ts
src/grid/BuildingPlacer.ts
src/grid/Grid.ts
src/input/ToolController.ts
src/rendering/BuildingRenderer.ts
src/rendering/Camera.ts
src/rendering/EnvironmentPropRenderer.ts
src/rendering/IsometricRenderer.ts
src/rendering/OverlayRenderer.ts
src/rendering/SmokeParticles.ts
src/rendering/TerrainRenderer.ts
src/rendering/TrafficRenderer.ts
src/rendering/WindowLightRenderer.ts
src/rendering/ZoneRenderer.ts
src/simulation/CommuteService.ts
src/simulation/DistrictService.ts
src/simulation/PowerService.ts
src/simulation/ZoneGrowthService.ts
src/ui/EventChoiceModal.ts
src/ui/InfoPanel.ts
src/ui/LoadingInterstitial.ts
src/ui/Minimap.ts
src/ui/OpeningSplash.ts
src/ui/PauseMenu.ts
src/ui/PlanPanel.ts
src/ui/TitleScreen.ts
src/ui/Toolbar.ts
src/ui/TutorialManager.ts
src/ui/styles/soviet-theme.css
```

## Phase 1 added paths

```text
docs/GRAPHICS_ASSET_PROVENANCE_2026-07-10.md
docs/GRAPHICS_BACKUP_AND_ROLLBACK.md
docs/GRAPHICS_IMPLEMENTATION_PLAN_2026-07-10.md
docs/GRAPHICS_PHASE1_IMPLEMENTATION_REPORT_2026-07-10.md
docs/GRAPHICS_PHASE1_SCOPE_2026-07-10.md
docs/GRAPHICS_REVIEW_AND_ROADMAP_2026-07-10.md
docs/graphics-implementation-evidence/
docs/graphics-review/
public/assets/art/
scripts/check-art-manifest.cjs
scripts/check-art-manifest.test.cjs
scripts/check-elevation-foundation.cjs
scripts/check-interaction-regressions.cjs
scripts/check-world-depth.cjs
src/graphics/ArtManifest.ts
src/graphics/ArtRegistry.ts
src/graphics/ArtVariantResolver.ts
src/rendering/WorldDepth.ts
tests/fixtures/art/
```

Ignored recovery artifacts under `.backups/graphics-program/2026-07-10/` are Phase 1 operational material but must not be committed.

## Release staging rule

If this tranche is staged later, use the explicit Phase 1 lists above and exclude the two pre-existing dirty paths. Verify the staged path set before any commit.
