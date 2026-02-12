# Changelog

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
