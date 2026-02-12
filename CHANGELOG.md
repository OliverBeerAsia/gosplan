# Changelog

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
