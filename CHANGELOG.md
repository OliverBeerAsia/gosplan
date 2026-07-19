# Changelog

## [Unreleased]

### Added

- SVG well-formedness validation in the art and atlas CI gates (dependency-free XML checker; catches duplicate attributes, mismatched tags, unquoted values), with node:test coverage and a shipped-SVG sweep.
- `docs/ART_AUTHORING_TEMPLATE.md`: the Khrushchyovka atlas and manifest entry extracted as the reusable template for future building-family packs.
- Shorelines drawn on the water side of water/land boundaries: submerged bank and broken foam line, shore-fast ice collar in winter.
- Distinct winter ice: matte pale frozen sheets with pressure cracks and snow drifts; shimmer disabled while frozen.
- Cliff faces gain sedimentary strata bands and embedded stones.
- Far-zoom forest canopy LOD below 0.45x zoom (massed crowns instead of aliasing speckle), with hysteresis at 0.55x.
- World-space day/night ambience: a multiply veil darkens terrain and buildings through amber dusk into moonlit night; window lights and new street-lamp ground pools render above it.
- Baked contact shadows seat every non-flat building on its tile.
- Traffic vehicles are small oriented isometric vans (per-direction textures, right-hand lane offset) instead of 3x4 rectangles.

### Fixed

- `pixel-city.svg` was invalid XML since 2026-02 (duplicate opacity attributes), so the legacy atlas never decoded in browsers; every boot logged an atlas warning and the terrain-override path was dead code. The SVG is repaired, the eight legacy building and seven legacy terrain manifest entries that referenced it are removed, and the dead runtime override is deleted. Boot is warning-free; behavior is unchanged and now truthful.
- Base tile textures bake a fixed frame (`TILE_TEXTURE_OVERHEAD`) and overlay masks a diamond frame, fixing bounds-derived sprite misalignment: forest tiles no longer bleed dark canopy over lower neighbors at elevation steps, and edge masks no longer render as floating streaks.
- Universal per-tile seam strokes removed; material boundaries use ragged dithered transition bands.
- Tutorial banner instructions wrap instead of truncating with an ellipsis.
- The idle inspect help text no longer sits permanently mid-screen.

### Compatibility

- Save format, simulation RNG, footprints, costs, and balance unchanged; determinism gate passes.
- Rollback reference: base commit `18df2e0` (v1.10 foundation merge). See `docs/GRAPHICS_BACKUP_AND_ROLLBACK.md` section 2026-07-18.

## [1.10.0] - Release candidate

v1.10.0 is a graphics foundation release, not the completed graphics overhaul. Production remains on v1.9.4 until the candidate commit passes CI, deploys through GitHub Pages, and passes live verification.

### Added

- Typed authored-art manifest, read-only runtime registry, deterministic variant resolver, multi-atlas loading, and automated art/fallback validation.
- Illustrated planning-dossier presentation across opening, scenario selection, loading, pause, and event surfaces.
- Deterministic elevation, exposed terrain-step rendering, height-aware interaction, and shared world-depth ordering.
- Authored Khrushchyovka worker-housing family with stable mass selection, far/mid/near LOD, authored effect anchors, and procedural fallback.
- Deterministic worker-housing courtyard compositions with seasonal LOD frames, bounded quality caps, protected claims, exact road-edge orientation, and owner-aware inspect/demolish feedback.
- Visual benchmark fixtures, production-bundle exclusion checks, provenance records, checkpoint archives, checksum sidecars, and restore rehearsals.
- v1.10.0 implementation notes, multi-agent review, test report, bug check, and release notes.

### Changed

- Placement, selection, demolition, zoning, modal shortcuts, and destructive drag cancellation now share more authoritative interaction state.
- Terrain, zones, props, buildings, traffic, smoke, lights, and overlays use height-aware placement and explicit depth semantics.
- GitHub Pages candidate workflow includes the new authored-art, worker-housing, courtyard, elevation, interaction, depth, determinism, benchmark, and production-build gates.
- Opening artwork received a bounded cleanup that replaced malformed prop lettering with an unlabeled planning chart; source and runtime hashes are recorded in the provenance ledger.

### Compatibility

- Save version and simulation RNG contracts remain unchanged.
- Existing building footprints, costs, capacities, placement rules, zones, roads, power, and balance remain authoritative.
- Missing or invalid authored art falls back to declared procedural or legacy graphics instead of producing a blank game.

### Known limitations

- This release does not complete the industrial, civic, or scientific-city authored families, final terrain/road atlas, Ministry Console, living-city animation, or the full release capture matrix.
- Shared focus trapping and restoration now cover loading, opening, credits, events, campaign ending, and pause; the complete two-viewport accessibility matrix remains follow-up work.
- Zone-paint invalidations are coalesced to one deterministic rebuild per rendered frame; representative browser performance profiling remains follow-up work.
- The north-west service-edge runtime capture and mixed-family foundation overview are included. Full mixed-family far/low art completion and stronger night ground/road treatment remain follow-up work.
- The integrated candidate build retains the documented 604.36 kB minified main-chunk warning.

### Release evidence

- Candidate commit SHA: `PENDING`
- CI workflow run: `PENDING`
- Deployment run: `PENDING`
- Live verification: `PENDING`
- Production and rollback reference until verification: commit `fafaedb`, tag `v1.9.4`, run `25995410642`

## [1.9.4] - 2026-05-17

### Fixed

- **Coal power plant stack assembly** — moved cooling towers and the smokestack onto a roof service deck so they read as attached plant infrastructure rather than separate props behind the building.

## [1.9.3] - 2026-05-17

### Changed

- **TTD-inspired building art pass** — sharpened procedural building sprites with crisper 1px isometric rims, stronger face separation, deterministic pixel wear, residential balcony runs, industrial yard cues, and civic forecourt details.
- **Building massing kept solid** — new polish layers avoid transparent rectangular overlays and preserve opaque building bodies so sprites do not appear ghosted or washed out.
- **Graphics-only release** — no simulation logic, save format, placement rules, sprite anchors, depth sorting, or balance values changed.

### Added

- Release documentation for v1.9.3 covering implementation notes, multi-agent review, test report, bug check, and release notes.

## [1.7.3] - 2026-02-18

### Fixed

- **Industrial sprites appearing too dark** — removed double unpowered darkening (texture + tint stacking) so factory and coal power plant remain readable during deficits.
- **Invalid placement ghost readability** — increased invalid ghost visibility and added subtle red tinting so blocked footprints are easier to read without losing warning semantics.

### Changed

- **Unpowered variant intensity reduced** — lowered procedural unpowered overlay opacity to preserve facade contrast.

## [1.7.2] - 2026-02-18

### Changed

- **Gameplay UI density and hierarchy tuned for desktop** — refined resource chips, tool/category bars, panel sizing, and typography for cleaner scanning during active play.
- **Building card readability improved** — consistent `building-name` labeling in the bottom build panel and stronger cost/name contrast.
- **Notification behavior refined** — info toasts now use compact/truncated formatting for long text while keeping full text in tooltip/title.
- **Info panel severity signaling improved** — added warning/critical styling split for queue pressure, power, road access, and unrest indicators.
- **Building art palette pass** — industrial/residential textures and tint variants were recalibrated for stronger silhouette clarity and less muddy tones.

### Fixed

- **Tutorial + notification overlap at top HUD** — tutorial bar and toast lane now use separated vertical tracks during onboarding to avoid collision.
- **District toggle messaging polish** — streamlined wording in initial/toggle notifications for clearer status feedback.

## [1.7.1] - 2026-02-18

### Changed

- **Opening splash desktop layout refined** — added a structured command-deck section under the hero image for cleaner spacing, clearer hierarchy, and better desktop readability.
- **Launch UI typography shifted to pixel-style treatment** — title/start/menu text on front-door screens now uses a sharper retro pixel face to better match the core GOSPLAN emblem style.
- **Scenario selection slide simplified** — removed decorative masthead copy, shortened status text, and tightened launch prompts to reduce visual noise.
- **Scenario cards simplified** — removed card art strip icons and subtitle blocks, keeping only scenario name and target year for faster selection scanning.

## [1.7.0] - 2026-02-16

### Changed

- **Achievement panel moved to pause menu** — removed always-visible 300×220px panel from gameplay; achievements now appear in a scrollable "STATE HONORS" section inside the ESC pause menu.
- **District panel collapses by default** — starts as a one-line summary header (`DISTRICTS — AVG LOYALTY 62% | UNREST 28%`); click to expand full detail view with chevron indicator.
- **Bulletin panel merged into Event Log** — removed standalone bulletin panel; notification history button (☰) now opens a unified reverse-chronological Event Log combining bulletin entries and notification toasts, with active directive pinned at top and color-coded source tags.
- **Toolbar reduced from 7 tabs to 5** — removed ZONING and TOOLS categories; zone buttons inlined into matching building panels (Housing Zone → HOUSING, Industry Zone → INDUSTRY, etc.); added persistent DEMOLISH and INSPECT quick-access buttons always visible below the toolbar.
- **Resource bar metrics simplified** — renamed "Order" → "Stability" (composite `loyalty - unrest×0.5`, e.g. "65% STABLE") and "Mobility" → "Access" (average of commute + service access, e.g. "42% FAIR"); breakdowns still available in district panel.
- **Advisor auto-dismisses after 10 seconds** — new fade-out animation instead of persisting for 30+ seconds; removed idle "Your city thrives, Comrade" message; silence when nothing is wrong.
- Updated `I` keyboard shortcut messaging to reference district panel specifically.

### Removed

- `BulletinPanel` component and all associated CSS (~65 lines of orphaned styles).
- `ZONING` and `TOOLS` toolbar categories (functionality redistributed).
- Graphics quality controls from toolbar (already available in pause menu).
- Idle advisor "all good" message.
- ~100 lines of dead CSS (bulletin panel, quality buttons).

## [1.6.0] - 2026-02-16

### Added

- **Sound effects & ambient audio** — procedural SFX via Web Audio API (placement, demolish, invalid, UI clicks, event alerts, achievements) and population-scaled ambient city hum. Volume sliders (master/SFX/music) persisted to localStorage.
- **Interactive tutorial** — 6-step guided first game with spotlight overlay, step counter, and skip button. Persisted via localStorage so it never repeats.
- **Placement rejection reasons** — floating label near cursor explains why building ghost is red ("Insufficient rubles", "No road access", "Space occupied", etc.).
- **Rich building tooltips** — hover tooltips on toolbar buttons showing description, dimensions, cost, maintenance, capacity, power, service radius, and requirements.
- **Construction animation** — buildings scale up (0.75→1.0) and fade in (0.3→1.0) with ease-out cubic tween over 400ms on placement.
- **Power grid visualization** — red ⚡ icon on unpowered buildings, power deficit pulse animation on resource bar, auto-flash power overlay when placing power infrastructure.
- **Milestone celebrations** — population milestones (100, 500, 1K, 2K, 5K, 10K) and budget milestones (10K, 50K, 100K₽) with Soviet-themed messages and gold screen flash. Persisted in game state across save/load.
- **Pause menu** — Escape key opens pause menu with Resume, Save, Settings (graphics quality, UI scale, audio volume sliders), and Quit to Title.
- **Soviet advisor panel** — "Comrade Planner" shows priority-ranked contextual guidance (power deficit, housing demand, low happiness, etc.) with 30s dismissal cooldown.
- **Statistics panel** — canvas-based line charts for population, happiness, budget, and power (capacity vs demand dual-line). Toggle with `S` key. Data sampled every 4 ticks, circular buffer of 200 points persisted in saves.
- Soviet desk background image on title screen, loading overlay, and game-over screen.
- Session recap for 2026-02-16 (`docs/SESSION_RECAP_2026-02-16.md`).

### Changed

- Switched GitHub Pages source from legacy branch deploy to workflow-based deploy.
- Removed 90-second legacy builder wait from deploy workflow (deploy ~30s instead of ~2m30s).
- Added deployment documentation to README and RELEASE_RUNBOOK.
- Removed heavy building outlines; disabled `isoBox` outline default and cleaned terrain tile edge rendering.
- Multiple building art improvement passes: perspective windows, facade details, weathering, rooftop character.
- Removed white tint on well-serviced residential/government buildings (was washing out colors).
- Reduced unpowered building overlay darkness from 35% to 22% opacity.
- Enlarged opening splash hero image (80vh max-height, 1400px panel width).
- Rounded happiness display to integer (no more fractional percentages).
- Slowed base game speed: `BASE_TICK_MS` 1600 → 2400 (2.4s/week at 1x).
- Tutorial system fully rewritten from 5 conditional hints to step-based guided flow.
- Escape key now opens pause menu (or deselects tool if active).
- Simulation tick order expanded with MilestoneService and StatsCollector.
- Game state expanded with `milestonesTriggered` and `statsHistory` fields.

### Fixed

- Power overlay flash showing empty container (updatePowerOverlay early-return when showPowerOverlay was false).
- Stale sprite reference in construction tweens after building demolish (operated on destroyed PixiJS sprite).
- Building ghost showing green (valid) for unaffordable buildings (budget check asymmetry between canPlace and getPlacementRejection).
- Tutorial last step auto-completing instantly instead of displaying for 6 seconds.
- Double sound on achievement unlock (both milestone and achievement SFX played simultaneously).

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
