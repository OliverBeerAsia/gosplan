# Implementation Notes v1.10.0

Date: 2026-07-12

Status: Graphics foundation release candidate. Not committed, tagged, pushed, deployed, or live-verified.

Baseline and current production: commit `fafaedb`, tag `v1.9.4`, GitHub Pages run `25995410642`

## Summary

v1.10.0 packages the first coherent graphics foundation plus two bounded worker-housing vertical slices. It is not the completed game-wide graphics overhaul.

The candidate combines an illustrated planning-dossier front door, a manifest-driven authored-art pipeline, interaction-truth improvements, deterministic elevation and shared depth, an authored Khrushchyovka family, and deterministic worker-housing courtyard compositions. Existing procedural and legacy fallbacks remain available.

Production remains on v1.9.4 until the candidate SHA passes CI, is deployed through GitHub Pages, and passes live verification.

## Implemented foundation

### Art contract and recovery

- Typed authored-art manifest and read-only runtime registry.
- Deterministic variant resolution that does not consume or mutate simulation RNG.
- Multi-atlas loading with stable `atlasId:frameId` references.
- File, schema, frame, footprint, anchor, deterministic-resolution, and fallback validation.
- Procedural or legacy fallback for missing or invalid authored assets.
- Checksum-verified working-tree checkpoints, off-workspace copies, and restore rehearsals.
- Provenance records for generated illustrations, bounded generated edits, and original code-native SVG atlases.

### Illustrated front door

- Planning-dossier treatment for opening, title/scenario selection, loading, pause, and event-choice surfaces.
- Three distinct scenario vignettes and three loading illustrations.
- Accessible runtime copy remains HTML rather than being baked into illustrations.
- Opening dossier paper lettering was replaced with an unlabeled chart through a bounded generative edit documented in the provenance ledger.

### Interaction and world foundation

- One authoritative tool snapshot drives toolbar, cursor, previews, and help state.
- Building placement, selection, demolition, and zone clearing show explicit footprint truth.
- Destructive drags cancel on off-canvas release, pointer cancellation, blur, tool change, and teardown.
- Pause suppresses gameplay shortcuts and hidden speed changes.
- Semantic overlays remain available at Low graphics quality.
- Deterministic elevation, height-aware picking, level-ground placement, exposed terrain faces, and equal-elevation network rules.
- Shared depth ordering across terrain, cliffs, zones, props, buildings, traffic, window lights, smoke, and overlays.
- Legacy uneven multi-tile buildings retain compatibility restore behavior.

### Worker-housing vertical slices

- Original authored Khrushchyovka atlas with short, long, and shallow linked-return masses.
- Stable deterministic physical-mass selection plus far, mid, and near LOD with hysteresis.
- Authored entrance, queue, and powered-window anchors with bounded effects.
- Original worker-housing courtyard atlas with play-square, laundry-green, and oriented service-edge compositions.
- Deterministic cosmetic claims based on map and immutable building identity, without save entities or simulation effects.
- Quality caps, seasonal frames, footprint protection, entrance protection, spacing, orientation, and owner-aware interaction.

## Compatibility boundary

- Save version remains unchanged.
- Simulation RNG and mutable RNG cursor remain unchanged.
- Existing footprints, costs, capacities, balance, placement rules, zones, roads, power, elevation, and buildings remain authoritative.
- Courtyard props are cosmetic and do not affect demand, happiness, service, commute, power, or balance.
- Benchmark fixtures and capture controls are development-only and checked for exclusion from the production bundle.

## Explicitly not completed

- Complete authored industrial, civic, and scientific-city families.
- Final terrain, cliff, bank, shoreline, retaining-wall, road-slope, crossing, bridge, and street atlases.
- Ministry Console, complete icon system, and full building-thumbnail pass.
- Living-city crowds, transit activity, service queues, construction stages, and era expression.
- Full keyboard focus containment and focus restoration for every modal surface.
- Full visual matrix across both supported viewports, all quality levels, all zooms, reduced motion, night, fallback, credits, event, and ending states.
- Browser frame profiling and approved performance thresholds for representative populated cities.
- Complete SimCity 2000-style city-density parity.

## Source-tree quarantine and candidate lock ownership

These source-tree paths predate the graphics program and remain untouched in the original mixed worktree:

- `docs/MAINTENANCE-2026-05-24-node-audit.md`, recorded handoff SHA-256 `a31de528e1da2f11ae2d98554d48c638b519a9e0a917463910708d55fd5cc333`

The original dirty `package-lock.json`, recorded handoff SHA-256 `8e984d6080545fadb6c6081943058e400b59d3401e83307e656a8a0f46b32252`, is not copied into the release worktree. The v1.10.0 candidate intentionally owns a clean lockfile regenerated from committed v1.9.4 for the version update, axe development dependency, and audited transitive fixes.

## Release evidence

The integrated pre-commit candidate passed the complete local command matrix, dependency audit, 18-image evidence contract, real-browser smoke, and axe A/AA audit. Commit, CI, deployment, and live evidence remain pending below.

The release intentionally includes approximately 44 MB of review and visual-evidence history plus 0.85 MB of runtime authored art. The larger files are provenance sources, approved direction boards, and reproducible release evidence; they are not included in the Vite production bundle. No file approaches GitHub's 100 MB limit.

| Evidence | Value |
|---|---|
| Candidate commit SHA | `PENDING` |
| Candidate tag | `PENDING` |
| CI workflow run and conclusion | `PENDING` |
| Deployment run and conclusion | `PENDING` |
| Live site verified SHA | `PENDING` |
| Live title/loading/menu/courtyard/fallback smoke | `PENDING` |
| Live keyboard smoke | `PENDING` |
| Current production and rollback reference | `fafaedb` / `v1.9.4` / run `25995410642` |

Do not replace any `PENDING` value with an expectation. Record only evidence read back from GitHub and the live site.
