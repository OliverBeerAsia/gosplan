# CLAUDE.md — Gosplan Development Guide

## Project Overview

Gosplan is a Soviet-themed isometric city builder (SimCity 2000 / Transport Tycoon Deluxe style) built with **PixiJS 8** + **TypeScript** + **Vite**. Players manage a 1980s USSR city with five-year plans, housing, industry, power, and civic services.

**Live:** https://oliverbeerasia.github.io/gosplan/
**Repo:** https://github.com/OliverBeerAsia/gosplan

## Commands

```bash
npm run dev          # Local dev server (Vite)
npm run build        # Production build (tsc + vite build)
npm run preview      # Preview production build locally
npm run check:determinism   # Verify simulation determinism
npx tsc --noEmit     # Type-check without emitting
```

## Deployment

- Push to `main` triggers GitHub Pages deploy via `.github/workflows/deploy-pages.yml`
- Deploys to https://oliverbeerasia.github.io/gosplan/
- Vite base path is `/gosplan/` (set in `vite.config.ts`)
- Check deploy status: `gh run list --limit 1`

## Architecture

### Core (`src/core/`)
- `Game.ts` — Main game loop, renderer initialization, season/weather/quality logic
- `EventBus.ts` — Typed pub/sub event system connecting all subsystems
- `GameState.ts` — State types and interfaces

### Rendering (`src/rendering/`)
- `TerrainRenderer.ts` — Isometric terrain grid, seasonal textures, water shimmer
- `BuildingRenderer.ts` — Building sprites, z-ordering, construction tweens, queue citizens
- `TrafficRenderer.ts` — Car dots on road networks
- `WindowLightRenderer.ts` — Night window glow on powered buildings
- `SmokeParticles.ts` — Factory smoke + industrial smog
- `WeatherEffects.ts` — Rain/snow particles
- `EnvironmentPropRenderer.ts` — Context-sensitive decorative props
- `IsometricRenderer.ts` — `gridToWorld()`, `depthKey()` utilities

### Graphics (`src/graphics/`)
- `BuildingTextures.ts` — Procedural building texture generation (all drawn with PixiJS Graphics API)
- `TerrainTextures.ts` — Procedural terrain tiles with seasonal variants (5 variants per terrain type per season)
- `TextureFactory.ts` — Generates variant/district/unpowered texture copies using sprite tinting
- `SovietPalette.ts` — Color constants for the Soviet aesthetic

### Grid (`src/grid/`)
- `Grid.ts` — Tile grid with building placement, terrain, zones

### UI (`src/ui/`)
- `styles/soviet-theme.css` — Single CSS file for all UI (2500+ lines)
- `ResourceBar.ts`, `Toolbar.ts`, `PlanPanel.ts`, `InfoPanel.ts`, `AdvisorPanel.ts`, etc.

## Key Conventions

### Isometric Math
- Tile size: 64x32 pixels (`TILE_HALF_W=32`, `TILE_HALF_H=16`)
- Grid-to-world: `gridToWorld(gx, gy, 0)` returns screen `{x, y}`
- Depth sorting: `depthKey(gx, gy)` = `gx + gy` (bottom-right corner for multi-tile buildings)
- Building anchors: `sprite.anchor.set(0.5, 1)` — bottom-center

### Texture Generation
- All textures are procedural (PixiJS `Graphics` → `renderer.generateTexture()`)
- `generateTexture()` produces transparent backgrounds by default
- **NEVER use overlay rectangles** (rect fills covering the bounding box) on building textures — they bleed into transparent areas creating visible backgrounds
- Use `sprite.tint` for color variants instead of overlay rectangles
- TextureFactory creates warm/cool/district/unpowered variants via tinting only

### Particle Systems
- All particle renderers (smoke, weather, traffic) use **sprite pooling** — never create/destroy per frame
- Use **swap-and-pop** for array removal (`arr[i] = arr[arr.length-1]; arr.pop()`) — O(1) vs splice's O(n)
- Subtle animations (shimmer, flicker, bob) are **frame-throttled** to every 3-4 frames

### Quality Tiers
- Three tiers: `low`, `medium`, `high` — toggled with G key
- Every renderer implements `setQuality(quality)` and responds to `graphics:quality:changed` event
- Low hides: traffic, window lights, props, terrain decals/edges
- Excess particles/dots are pooled on downgrade, never destroyed

### Event System
Key events renderers must listen to:
- `building:placed` / `building:demolished` — rebuild cached data
- `game:loaded` — full rebuild after save load
- `power:updated` — rebuild power-dependent visuals (window lights, smoke positions)
- `graphics:quality:changed` — adjust detail level

### Seasons
- Weeks 1-13: Winter, 14-26: Spring, 27-39: Summer, 40-52: Autumn
- Season change triggers: terrain texture swap, weather type, wind values, shimmer colors
- `Game.currentSeason` initialized to `null` to force sync on first frame (including save loads)

### CSS / UI
- Minimum font size: 10px (using `--font-display` which falls back to PT Sans Narrow)
- `Press Start 2P` pixel font used for headers/labels only, not body text at small sizes
- Advisor panel (Comrade Planner) needs `bottom: 142px` to clear expanded toolbar (~137px)
- All panels use `max-height` + `overflow-y: auto` to prevent cutoff

## Common Pitfalls

1. **Don't use `container.mask` with `generateTexture()`** — PixiJS 8 alpha masking can crash silently during texture generation, producing blank screens. Use `sprite.tint` instead.

2. **Don't use `splice(i, 1)` in particle loops** — O(n) per removal. Use swap-and-pop.

3. **Don't call `getAllBuildings()` in per-frame/per-tick code** — it allocates a new array. Cache the results and rebuild on events.

4. **Don't accumulate position with `+=` in animation loops** — store a `baseY` and set absolute position. Additive animation drifts over time.

5. **Don't forget `power:updated` listeners** — any renderer that checks `building.powered` needs to rebuild when power state changes, not just on building placed/demolished.

6. **Don't use screen coords for grid comparisons** — `gridToWorld()` output is screen space. Grid logic must compare `gx`/`gy` directly.

## Testing Checklist

Before deploying, verify:
- [ ] `npx tsc --noEmit` — no type errors
- [ ] `npm run build` — clean production build
- [ ] `npm run check:determinism` — simulation determinism maintained
- [ ] Visual: terrain renders at all zoom levels (0.25x to 2x)
- [ ] Visual: seasonal cycle (winter snow, spring flowers, autumn colors)
- [ ] Visual: night window lights on powered buildings only
- [ ] Visual: traffic dots move on roads without backtracking
- [ ] Visual: smoke drifts with wind from powered factories only
- [ ] Visual: quality toggle (G key) gracefully degrades
- [ ] Visual: no rectangular backgrounds behind buildings
- [ ] UI: all text readable (min 10px), Comrade Planner not cut off
