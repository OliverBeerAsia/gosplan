# Changelog

## [Unreleased]

### Changed

- Switched GitHub Pages source from legacy branch deploy to workflow-based deploy.
- Removed 90-second legacy builder wait from deploy workflow (deploy ~30s instead of ~2m30s).
- Added deployment documentation to README and RELEASE_RUNBOOK.

## [1.5.0] - 2026-02-16

### Added

- Richer building facades (Khrushchyovka, Stalinka, Panelák, civic services, industrial complexes) with depth, rooftop props, and factory gantries inspired by classic city-builders.
- District glyph accents layered in `TextureFactory` so each style (`worker_housing`, `heavy_industry`, `scientific_city`, `historic_core`) gets unique architectural flourishes before tint variants are created.
- Release documentation sets for v1.5.0 (`docs/IMPLEMENTATION_NOTES_v1.5.0.md`, `docs/MULTI_AGENT_REVIEW_v1.5.0.md`, `docs/TEST_REPORT_v1.5.0.md`, `docs/BUG_CHECK_v1.5.0.md`, and `docs/RELEASE_NOTES_v1.5.0.md`).

### Changed

- Updated `package.json`, `package-lock.json`, and `README.md` to reference v1.5.0.
- Building texture rendering now layers district glyphs in `src/graphics/TextureFactory.ts` before applying style tints.

## [1.4.1] - 2026-02-12

### Added

- Session recap document with full-day shipped timeline and lessons learned:
  - `docs/SESSION_RECAP_2026-02-12.md`
- Project best-practices playbook for architecture, rendering, UI, QA, and release workflow:
  - `docs/PROJECT_BEST_PRACTICES.md`
- Documentation release artifacts:
  - `docs/IMPLEMENTATION_NOTES_v1.4.1.md`
  - `docs/MULTI_AGENT_REVIEW_v1.4.1.md`
  - `docs/TEST_REPORT_v1.4.1.md`
  - `docs/BUG_CHECK_v1.4.1.md`
  - `docs/RELEASE_NOTES_v1.4.1.md`

### Changed

- Updated `README.md` current release metadata and docs index for `v1.4.1`.

## [1.4.0] - 2026-02-12

### Added

- Campaign scenario system (`CampaignScenarios`) with three starts:
  - `reconstruction`
  - `industrial_surge`
  - `stagnation`
- Campaign outcome evaluation service (`CampaignOutcomeService`):
  - weighted score calculation
  - narrative ending classification
  - campaign completion event + report modal flow
- Achievement simulation (`AchievementService`) with unlock notifications and bulletin integration.
- New UI components:
  - `AchievementPanel`
  - `CampaignEndingModal`
- Campaign ending metadata persisted in state for reload-safe report continuity.

### Changed

- Title screen now presents campaign scenario cards with objective context.
- `SimulationManager` tick flow now includes campaign outcome and achievement processing.
- Resource bar speed controls now stay synced to non-button speed changes.
- Plan panel now displays campaign completion summary when campaign closes.
- Event director now suppresses new events after campaign completion in campaign mode.
- Load flow now emits `game:loaded` after UI initialization so load-reactive panels/modals update correctly.

## [1.3.0] - 2026-02-12

### Added

- Campaign and Sandbox start options on title screen.
- District simulation layer with style classification and district metrics:
  - service access
  - commute quality
  - loyalty
  - unrest risk
  - activity level
- Commute simulation (`CommuteService`) and city mobility index.
- Adaptive directive system (`CampaignDirectorService`) with performance pressure scoring.
- Political/social event system (`EventDirectorService`) with choice-based consequences.
- State bulletin feed and event history entries.
- New immersion UI components:
  - `DistrictPanel`
  - `BulletinPanel`
  - `EventChoiceModal`
  - `AmbienceOverlay`
- Save format v4 with backward compatibility for v1-v3.

### Changed

- Simulation tick order now includes commute, district, directive, and event layers.
- Happiness model now includes commute/service access, loyalty, unrest, and event mood modifiers.
- Economy now respects `industrialEfficiency` modifier from event outcomes.
- Resource bar now includes `Order` and `Mobility` indicators.
- Plan panel now supports Sandbox-mode messaging when Five-Year plans are disabled.

## [1.2.0] - 2026-02-12

### Added

- Terrain material variants (`ground`, `dirt`, `forest`, `water`, `hill`) with deterministic tile selection.
- Terrain edge shading masks and decal overlays for better environmental depth.
- Graphics quality system (`low`, `medium`, `high`) with toolbar controls and `G` keyboard cycling.
- Queue citizen texture and demand-driven queue rendering near service buildings.
- Environment prop pass:
  - kiosks
  - bus stops
  - lamp posts
  - fences
  - utility poles
  - courtyard greenery
- District facade presets:
  - `worker_housing`
  - `heavy_industry`
  - `scientific_city`
  - `historic_core`
- Shared queue pressure model used by both renderer and info diagnostics.
- Art direction and continuous graphics QA documents:
  - `docs/ART_DIRECTION.md`
  - `docs/GRAPHICS_CONTINUOUS_IMPROVEMENT_PLAN.md`
  - `docs/VISUAL_QA_CHECKLIST.md`
  - `docs/IMPLEMENTATION_NOTES_v1.2.0.md`
  - `docs/RELEASE_NOTES_v1.2.0.md`
  - `docs/MULTI_AGENT_REVIEW_v1.2.0.md`
  - `docs/TEST_REPORT_v1.2.0.md`
  - `docs/BUG_CHECK_v1.2.0.md`

### Changed

- Zone overlay visuals now use planning-map style hatch patterns per zone type.
- Building rendering now applies deterministic facade variants and condition-aware tinting (power and service coverage).
- Overlays, weather, smoke, terrain detail, queue density, and prop density now respond to graphics quality settings.
- `TextureFactory` now auto-generates stylistic building variants before unpowered variants.

## [1.1.0] - 2026-02-12

### Added

- Zoning model (`housing`, `industry`, `civic`, `green`) with paint/erase tooling.
- Zone-driven growth simulation with demand channels and placement heuristics.
- Service coverage simulation and map overlay.
- Tile query diagnostics and growth blocker explanations.
- Sprite atlas loader and authored atlas assets (`public/assets/atlas`).
- Zone renderer layer and zone minimap visualization.
- New event bus channels for demand, service, tile selection, and overlay toggles.
- Save format v3 with zone persistence.
- Release documentation suite in `docs/`.

### Changed

- Building rendering now updates incrementally on placement/demolition rather than full rebuild per action.
- Roads and power lines now render using connection masks (autotile variants).
- Texture generation pipeline is async and atlas-aware.
- Info panel now supports both building detail and tile-level diagnostics.
- Resource bar now includes demand readout.
- Toolbar includes zoning category and service map toggle action.

### Performance

- Grid now indexes buildings by id with footprint tracking.
- Building removal switched from O(map^2) scan to O(footprint) clear.

### Persistence

- Save/load upgraded to v3 while maintaining compatibility with v1 and v2 saves.
- Loaded game state now merges with current defaults for forward compatibility.

## [1.0.0] - 2026-02-11

- Initial public release.
