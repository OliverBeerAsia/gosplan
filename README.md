# GOSPLAN

Soviet city builder inspired by SimCity 2000-style planning, layouts, and progression loops, built with TypeScript + PixiJS.

## Current Release

- Version: `1.4.0`
- Status: playable, desktop-first, production build passing

## What Is In 1.4.0

- Campaign scenario framework:
  - Reconstruction Drive
  - Industrial Surge
  - Late-Period Stagnation
- Scenario-specific campaign targets and opening directives.
- Campaign ending evaluation system:
  - weighted city score
  - narrative ending outcomes
  - campaign report modal with "Continue as Sandbox"
- Achievement system with unlock tracking and state honors panel.
- Campaign state persistence expanded with ending metadata.
- Event flow refinement:
  - event stream pauses after campaign conclusion
  - active event is gracefully closed when campaign ends
- Title screen scenario cards with clearer pre-run selection context.
- Plan panel now reflects campaign completion state.
- Speed controls now stay visually synced when speed changes by systems/events.

## What Is In 1.3.0

- Campaign + Sandbox mode split from title screen.
- District identity simulation:
  - district styles and district-level metrics
  - loyalty/unrest/activity tracking
- Commute and service-access simulation indices integrated into city health.
- Central directives with adaptive planning pressure.
- Dynamic political/social event engine with choice-based outcomes.
- New immersion UI:
  - district panel
  - state bulletin panel
  - event choice modal
  - ambient day/night atmosphere overlay
- Save format upgraded to v4 (backward compatible with v1-v3).

## What Is In 1.2.0

- Terrain fidelity pass:
  - deterministic material variants
  - boundary edge shading
  - subtle ground decals
- Building fidelity pass:
  - procedural facade variants
  - district-specific facade presets (`worker_housing`, `heavy_industry`, `scientific_city`, `historic_core`)
  - service/power condition tinting
  - Soviet-style queue visuals near service buildings under pressure, tuned by shared queue model
- Zone readability pass:
  - planning-map hatch patterns by zone type
- Environment prop pass:
  - kiosks
  - bus stops
  - lamp posts
  - fences
  - utility poles
  - courtyard trees
- Graphics quality system:
  - `LOW`, `MED`, `HIGH`
  - toolbar controls and keyboard cycle (`G`)
  - quality-aware particles, overlays, terrain detail, building queues, and props

## What Is In 1.1.0

- Zoning system with paint tools:
  - Housing
  - Industry
  - Civic
  - Green
- Automatic district growth driven by demand, road access, and power conditions.
- Connection-aware road and power-line rendering (autotile masks).
- Service coverage simulation and overlay map.
- Tile query diagnostics with growth blockers.
- Hybrid graphics pipeline:
  - Procedural texture generation fallback
  - Authored sprite atlas overrides when available
- Save format v3 with zoning persistence.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL printed by Vite in your terminal (commonly `http://localhost:5173/` for dev).

From the title screen:
- campaign scenario cards for directive-driven progression
- `NEW SANDBOX` for open-ended city building

Production build:

```bash
npm run build
npm run preview
```

## Controls

- Camera:
  - Mouse wheel: zoom
  - Middle mouse / right mouse / Shift+left drag: pan
  - `WASD` or arrow keys: pan
  - `Home` or `H`: center map
- Simulation speed:
  - `1` pause
  - `2` 1x
  - `3` 2x
  - `4` 4x
- Tools:
  - `V`: select/query
  - `X`: demolish
  - `Q`: repeat last building
  - `G`: cycle graphics quality (`LOW -> MED -> HIGH`)
  - `Tab`: cycle toolbar categories
- Overlays:
  - `P`: power overlay
  - `C`: service coverage overlay
- Events:
  - active state events appear as a modal with 2-3 policy choices
- Campaign outcomes:
  - completed campaigns open a report modal and can transition into sandbox
- Management:
  - `Ctrl/Cmd+S`: save
  - `Ctrl/Cmd+Z`: undo
  - `Ctrl/Cmd+Shift+Z`: redo

## Gameplay Loop

1. Build power generation and basic road grid.
2. Paint zones for housing and industry.
3. Place services and green amenities to raise coverage and happiness.
4. Watch automatic growth respond to demand and infrastructure.
5. Complete Five-Year Plan goals to secure bonuses and avoid penalties.

## Graphics Pipeline

`TextureFactory` loads textures in this order:

1. Procedural terrain/building textures
2. Optional authored atlas overrides from `public/assets/atlas/pixel-city.json`
3. Generated building style variants (`_var1`, `_var2`) and district variants (`_district_*`)
4. Generated unpowered variants for applicable buildings

If the atlas or specific frames are missing, the game still runs via procedural fallback.

## Project Structure

- `src/core`: game bootstrap, state, save/load, event bus
- `src/grid`: cell/grid model, placement
- `src/simulation`: economy, power, population, zoning growth, service coverage, commute, districts, directives, events
- `src/rendering`: terrain/buildings/overlays/camera/isometric projection
- `src/graphics`: palette, texture generators, atlas loader, texture factory
- `src/ui`: toolbar, resource bar, info panel, minimap, notifications
- `public/assets/atlas`: authored sprite atlas assets
- `docs`: release documentation and QA artifacts

## Release Docs

- `CHANGELOG.md`
- `docs/IMPLEMENTATION_NOTES_v1.1.0.md`
- `docs/MULTI_AGENT_REVIEW_v1.1.0.md`
- `docs/TEST_REPORT_v1.1.0.md`
- `docs/IMPLEMENTATION_NOTES_v1.2.0.md`
- `docs/MULTI_AGENT_REVIEW_v1.2.0.md`
- `docs/TEST_REPORT_v1.2.0.md`
- `docs/BUG_CHECK_v1.2.0.md`
- `docs/RELEASE_NOTES_v1.2.0.md`
- `docs/IMPLEMENTATION_NOTES_v1.3.0.md`
- `docs/IMPLEMENTATION_NOTES_v1.4.0.md`
- `docs/TEST_REPORT_v1.3.0.md`
- `docs/TEST_REPORT_v1.4.0.md`
- `docs/MULTI_AGENT_REVIEW_v1.4.0.md`
- `docs/BUG_CHECK_v1.4.0.md`
- `docs/RELEASE_NOTES_v1.3.0.md`
- `docs/RELEASE_NOTES_v1.4.0.md`
- `docs/RELEASE_RUNBOOK.md`
- `docs/ART_DIRECTION.md`
- `docs/GRAPHICS_CONTINUOUS_IMPROVEMENT_PLAN.md`
- `docs/VISUAL_QA_CHECKLIST.md`
