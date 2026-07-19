# Graphics Quick Wins + Workstreams A/B Implementation Notes

Date: 2026-07-18
Branch: `codex/graphics-quick-wins-ab` (based on `origin/main` at `18df2e0`, the v1.10 merge)
Plan reference: `docs/GRAPHICS_EVALUATION_AND_IMPROVEMENT_PLAN_2026-07-18.md`

## Commits in this series

1. `fix(art)`: repair unparseable pixel-city.svg, remove dead legacy manifest entries
2. `feat(art)`: SVG well-formedness validation in CI gates, `docs/ART_AUTHORING_TEMPLATE.md`
3. `feat(terrain)`: seamless ground, shorelines, winter ice, textured cliffs, far-zoom canopy
4. `feat(ambience)`: world-space day/night cycle, street-lamp light pools
5. `feat(polish)`: building contact shadows, oriented vehicles, UI defect fixes

## Root causes fixed

Two long-standing systemic defects were found and fixed while implementing the plan:

- **pixel-city.svg was invalid XML since 2026-02.** Eight overlay polygons carried duplicate `opacity` attributes, so browsers refused to decode the SVG. Every `legacy.pixel_city` frame silently failed at runtime (source of the boot warning), and the TextureFactory atlas-override path was dead code on every shipped build. The SVG is fixed, the dead manifest entries and override are removed, and the validator now XML-checks every shipped SVG so this class of breakage fails CI instead of shipping.
- **Texture-bounds drift misaligned tiles.** Pixi `generateTexture` crops to drawn bounds. Forest tiles, whose trees overflow the diamond top, rendered shifted downward and bled dark canopy over lower neighbors at elevation steps; edge-mask textures whose geometry missed the tile origin rendered shifted up-left (the floating grey streaks). All base tiles now bake a fixed frame (`TILE_TEXTURE_OVERHEAD`) and all masks a diamond frame, with `TerrainRenderer` compensating at placement.

## Verification

- Gates: tsc, build, determinism, art (19 tests), atlas, khrushchyovka, courtyard, environment planner, depth, interaction, elevation, pack4a benchmark, pack4b benchmark: all pass.
- Boot console is free of asset warnings (previously: `legacy.pixel_city supplied no usable frames` on every load).
- Playwright captures against the production build confirm: seamless winter/summer/autumn ground with no per-tile outlines; shoreline foam and banks; matte winter ice with shore-fast collars; strata-textured cliffs; far-zoom forest canopy LOD; world-space dusk and night; contact shadows under buildings; tutorial banner wrapping; idle inspect tooltip hidden.

## Known follow-ups

- Oriented vehicle sprites (E1 minimal) pass all automated gates but were not eyeballed in motion during this session's captures (headless build choreography kept missing road placement). Eyeball a running city after applying; worst case is aesthetic, not functional.
- Night ambience uses a single multiply veil; smoke and data overlays intentionally render above it. Emissive courtyard parts still render below it and are slightly dimmed at night; acceptable, revisit with Workstream C anchors.
- The standard capture matrix should now include a night overview (plan gate F4).
- Workstreams C, D, E continue per the plan; the khrushchyovka authoring template (`docs/ART_AUTHORING_TEMPLATE.md`) is the entry point for the v1.12 residential family pack.
