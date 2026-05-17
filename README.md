# GOSPLAN

Soviet city builder inspired by SimCity 2000-style planning, layouts, and progression loops, built with TypeScript + PixiJS.

## Play Online

https://oliverbeerasia.github.io/gosplan/

Every push to `main` auto-deploys to GitHub Pages via the Actions workflow in `.github/workflows/deploy-pages.yml`.

## Current Release

- Version: `1.9.3`
- Status: playable, desktop-first, production build passing

## What Is In 1.9.3

- **TTD-inspired building art pass** — building sprites now have crisper isometric rims, stronger roof silhouettes, residential balcony rhythm, industrial yard cues, and civic forecourt detail.
- **Solid-body readability preserved** — the upgrade keeps procedural building massing opaque and avoids transparent rectangular overlays or background bleed.
- **Graphics-only release** — no simulation, save-format, balance, placement, or renderer-anchor changes.

## What Is In 1.7.3

- **Industrial building readability fix** — factory and coal power plant sprites now avoid stacked unpowered darkening, keeping silhouettes and facade details visible during power deficits.
- **Invalid placement ghost clarity improved** — invalid ghost previews are brighter and lightly red-tinted so footprint shape remains legible while still signaling a blocked placement.
- **Unpowered variant tuning** — procedural unpowered overlay intensity was reduced for clearer midtone contrast.

## What Is In 1.7.2

- **Gameplay HUD polish pass** — top resource chips, panel headers, toolbar buttons, and quick tools now use tighter pixel-style spacing and hierarchy for improved desktop readability.
- **Building visuals refined** — residential/industrial/civic palettes and variant overlays were rebalanced for cleaner contrast and stronger isometric definition.
- **Placement/tooling clarity improvements** — building cards now have explicit name labels, DEMOLISH has destructive styling, and compact info toasts truncate long copy to reduce clutter.
- **Top-lane overlap fix** — tutorial hint and notification lanes were separated during onboarding to prevent directive/info text collisions.

## What Is In 1.7.1

- **Pixel-sharper launch typography** — opening and title-screen command text now uses a stronger retro pixel font treatment that better matches the central GOSPLAN visual identity.
- **Improved opening splash desktop UI** — status line, progress, and start action now sit in a cleaner command-deck layout under the hero artwork.
- **Simplified scenario selection slide** — decorative top copy and card icon strips removed; scenario cards now focus on name and target year for faster reading.

## What Is In 1.7.0

- **UI clutter reduced ~20%** — 3 always-visible panels removed from the gameplay screen (achievement, bulletin, and expanded district panels).
- **Achievement panel in pause menu** — "STATE HONORS" section accessible via ESC; no longer permanently on-screen.
- **Collapsible district panel** — starts as a one-line summary; click header to expand full detail view.
- **Unified Event Log** — ☰ button now shows combined bulletin + notification history with directive header, timestamps, and source tags.
- **5-tab toolbar** (was 7) — zones inlined into building categories; persistent DEMOLISH/INSPECT quick-access buttons.
- **Readable resource metrics** — "Stability" and "Access" show single composite percentages instead of cryptic abbreviations.
- **Advisor auto-dismiss** — fades out after 10 seconds; no more idle "all good" clutter.

## What Is In 1.6.0

- **Sound effects & ambient audio** — procedural SFX via Web Audio API and population-scaled ambient city hum with volume sliders.
- **Interactive tutorial** — 6-step guided first game with spotlight overlay and skip button.
- **Placement rejection reasons** — floating label near cursor explains why a building can't be placed.
- **Rich building tooltips** — hover tooltips with descriptions, stats, costs, and requirements.
- **Construction animation** — buildings scale up and fade in on placement (ease-out cubic tween).
- **Power grid visualization** — unpowered building icons, deficit pulse on resource bar, auto-flash power overlay.
- **Milestone celebrations** — population and budget milestones with Soviet-themed messages and gold screen flash.
- **Pause menu** — Escape key opens menu with settings (graphics, UI scale, audio volume), save, and quit.
- **Soviet advisor panel** — "Comrade Planner" contextual guidance with priority-ranked suggestions.
- **Statistics panel** — canvas line charts for population, happiness, budget, and power over time (`S` key).
- Soviet desk background on title screen, loading overlay, and game-over screen.
- Visual polish: building art refinement, outline removal, rounded happiness, slower base speed, softened unpowered overlay.

## What Is In 1.5.0

- Richer building facades for core residential, civic, and industrial buildings with factory gantries, rooftop props, and high-contrast detailing inspired by SimCity/Transport Tycoon.
- District-style glyphs in the texture pipeline ensure each style (`worker_housing`, `heavy_industry`, `scientific_city`, `historic_core`) adds unique architectural flourishes before tinting.
- Release documentation set for traceability:
  - `docs/IMPLEMENTATION_NOTES_v1.5.0.md`
  - `docs/MULTI_AGENT_REVIEW_v1.5.0.md`
  - `docs/TEST_REPORT_v1.5.0.md`
  - `docs/BUG_CHECK_v1.5.0.md`
  - `docs/RELEASE_NOTES_v1.5.0.md`

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
  - `I`: toggle district panel
  - `Tab`: cycle toolbar categories
- Overlays:
  - `P`: power overlay
  - `C`: service coverage overlay
  - `S`: statistics panel (population, happiness, budget, power charts)
- Menu:
  - `Escape`: pause menu (settings, save, quit)
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
- `src/simulation`: economy, power, population, zoning growth, service coverage, commute, districts, directives, events, milestones, stats
- `src/rendering`: terrain/buildings/overlays/camera/isometric projection
- `src/graphics`: palette, texture generators, atlas loader, texture factory
- `src/audio`: procedural sound effects and ambient audio (Web Audio API)
- `src/ui`: toolbar (5-tab), resource bar, info panel, minimap, notifications/event log, advisor, pause menu (with achievements), stats panel, tutorial
- `public/assets/atlas`: authored sprite atlas assets
- `docs`: release documentation and QA artifacts

## Deployment

The game is hosted on GitHub Pages at `https://oliverbeerasia.github.io/gosplan/`.

- **Build tool:** Vite (base path `/gosplan/`)
- **Trigger:** every push to `main`, or manual `workflow_dispatch`
- **Workflow:** `.github/workflows/deploy-pages.yml`
- **Process:** checkout, `npm ci`, `npm run build`, upload `./dist` artifact, deploy via `actions/deploy-pages@v4`
- **Pages source:** GitHub Actions workflow (not legacy branch deploy)

No manual steps are needed — merging to `main` is a production deploy.

## Game Analytics (GoatCounter)

Gameplay analytics are wired through GoatCounter and event tracking is disabled until an endpoint is configured.

1. Open `index.html`.
2. Set the `goatcounter-endpoint` meta tag to your GoatCounter endpoint, for example:
   - `<meta name="goatcounter-endpoint" content="https://your-code.goatcounter.com/count" />`
3. Deploy; tracking starts automatically.

Tracked game events include:
- session start
- game start (mode/scenario/load source)
- building placed/demolished
- placement rejected (reason + building id)
- mode changed
- plan completed
- campaign ended
- achievement unlocked
- event choice selected
- tutorial completed
- game saved

## Release Docs

- `CHANGELOG.md`
- `docs/IMPLEMENTATION_NOTES_v1.7.3.md`
- `docs/MULTI_AGENT_REVIEW_v1.7.3.md`
- `docs/TEST_REPORT_v1.7.3.md`
- `docs/BUG_CHECK_v1.7.3.md`
- `docs/RELEASE_NOTES_v1.7.3.md`
- `docs/IMPLEMENTATION_NOTES_v1.7.2.md`
- `docs/MULTI_AGENT_REVIEW_v1.7.2.md`
- `docs/TEST_REPORT_v1.7.2.md`
- `docs/BUG_CHECK_v1.7.2.md`
- `docs/RELEASE_NOTES_v1.7.2.md`
- `docs/IMPLEMENTATION_NOTES_v1.7.1.md`
- `docs/MULTI_AGENT_REVIEW_v1.7.1.md`
- `docs/TEST_REPORT_v1.7.1.md`
- `docs/BUG_CHECK_v1.7.1.md`
- `docs/RELEASE_NOTES_v1.7.1.md`
- `docs/IMPLEMENTATION_NOTES_v1.5.0.md`
- `docs/MULTI_AGENT_REVIEW_v1.5.0.md`
- `docs/TEST_REPORT_v1.5.0.md`
- `docs/BUG_CHECK_v1.5.0.md`
- `docs/RELEASE_NOTES_v1.5.0.md`
- `docs/SESSION_RECAP_2026-02-16.md`
- `docs/SESSION_RECAP_2026-02-12.md`
- `docs/PROJECT_BEST_PRACTICES.md`
- `docs/IMPLEMENTATION_NOTES_v1.4.1.md`
- `docs/MULTI_AGENT_REVIEW_v1.4.1.md`
- `docs/TEST_REPORT_v1.4.1.md`
- `docs/BUG_CHECK_v1.4.1.md`
- `docs/RELEASE_NOTES_v1.4.1.md`
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
