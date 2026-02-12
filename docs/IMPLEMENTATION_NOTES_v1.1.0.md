# Implementation Notes - v1.1.0

## Scope Delivered

This release delivered two major tracks:

1. Hybrid authored graphics pipeline (atlas + fallback)
2. SimCity-style planning improvements (service coverage + tile diagnostics)

It also includes foundational zoning/growth/rendering changes that were required for these tracks to work coherently.

## Major Technical Additions

### 1) Atlas Pipeline

- Added `SpriteAtlasLoader` to load a JSON manifest and slice textures from a single source image.
- Refactored `TextureFactory.generate` to async and atlas-aware.
- Atlas frames override procedural textures when key names match.
- Unpowered variants are generated after atlas merge so authored textures are supported.

Key files:

- `src/graphics/SpriteAtlasLoader.ts`
- `src/graphics/TextureFactory.ts`
- `public/assets/atlas/pixel-city.json`
- `public/assets/atlas/pixel-city.svg`

### 2) Service Coverage and Query Diagnostics

- Added per-cell `serviceCoverage` field.
- Added `ServiceCoverageService` simulation pass.
- Added service overlay rendering and controls.
- Added tile query path and blockers in info panel.

Key files:

- `src/grid/Cell.ts`
- `src/simulation/ServiceCoverageService.ts`
- `src/rendering/OverlayRenderer.ts`
- `src/ui/InfoPanel.ts`
- `src/core/EventBus.ts`

### 3) Zoning/Growth and SimCity-Like Planning

- Added zone types and zone paint tooling.
- Added demand signals and zone growth automation.
- Added zoning category in toolbar and zone minimap tinting.

Key files:

- `src/grid/Grid.ts`
- `src/input/ToolController.ts`
- `src/simulation/ZoneGrowthService.ts`
- `src/ui/Toolbar.ts`
- `src/ui/Minimap.ts`

### 4) Rendering and Performance Foundations

- Added incremental building sprite updates on place/demolish.
- Added road/power connection masks for network visuals.
- Added `ZoneRenderer` world layer.
- Added building index + footprint map in `Grid`.

Key files:

- `src/rendering/BuildingRenderer.ts`
- `src/graphics/BuildingTextures.ts`
- `src/rendering/ZoneRenderer.ts`
- `src/grid/Grid.ts`

### 5) Save Compatibility

- Added save `version: 3` with zone cells.
- Preserved backward loading for v1 and v2.
- Merged loaded state with `createInitialState()` defaults.

Key file:

- `src/core/SaveLoad.ts`

## Product UX Changes

- Service overlay toggle added:
  - Keyboard: `C`
  - Toolbar: Tools -> `SERVICE MAP`
- Empty tile query now shows planning diagnostics instead of hiding panel.
- Resource bar now includes demand indicators (`R`, `I`, `C`).

## Known Tradeoffs

- Current atlas is partial and intentionally coexists with procedural fallback.
- Service coverage uses Manhattan radius approximation and simple additive strength.
- No automated browser integration test harness yet; validation is currently build + static + runtime manual checklist.
