# Release Notes v1.10.0

Date: 2026-07-12

Status: Graphics foundation release candidate. Production remains v1.9.4 pending live verification.

## Highlights

- Introduces a maintainable authored-art foundation with a typed manifest, deterministic variants, multi-atlas loading, automated validation, and safe procedural or legacy fallback.
- Reworks the opening, scenario selection, loading, pause, and event surfaces into a consistent Soviet municipal planning-dossier presentation.
- Adds deterministic elevation, height-aware interaction, physical terrain faces, and shared world-depth ordering.
- Improves placement, selection, demolition, zoning, pause, and drag-cancellation behavior so visual feedback better matches authoritative game state.
- Adds an original authored Khrushchyovka family with stable physical variants, far/mid/near LOD, and geometry-owned effects.
- Adds deterministic worker-housing courtyard compositions with seasonal LOD, protected footprints, road-edge orientation, bounded quality levels, fallback, and owner-aware interaction.
- Adds visual benchmark fixtures, production-bundle guards, provenance records, verified recovery checkpoints, and release documentation.

## Compatibility

- Save version remains unchanged.
- Simulation RNG behavior remains unchanged.
- Building footprints, costs, capacities, placement, zones, roads, power, and balance remain authoritative.
- Courtyard art is cosmetic and is not stored as simulation entities.
- Missing authored art falls back safely instead of preventing play.

## Claim boundary

This is a graphics foundation release, not the completed graphics overhaul.

Later work still includes complete industrial, civic, and scientific-city authored families; final terrain and street atlases; the Ministry Console; living-city animation; full accessibility closure; browser performance profiling; and the complete visual evidence matrix.

## Known risks

- Shared modal focus behavior now covers loading, opening, credits, events, campaign ending, and pause; final browser accessibility evidence remains part of the candidate gate.
- Zone-paint invalidations are coalesced to one deterministic composition rebuild per rendered frame; final browser performance evidence remains part of the candidate gate.
- The north-west service edge and a mixed-family foundation overview are now captured. Full mixed-family far/low art completion remains a later graphics pack.
- Night ground and roads need a stronger dusk treatment.
- The integrated candidate build retains a documented 604.36 kB minified main-chunk warning.

## Release and rollback status

Production remains at commit `fafaedb`, tag `v1.9.4`, GitHub Pages run `25995410642` until the following evidence is complete:

| Evidence | Value |
|---|---|
| v1.10.0 candidate commit SHA | `PENDING` |
| v1.10.0 tag | `PENDING` |
| CI workflow run and conclusion | `PENDING` |
| Pages deployment run and conclusion | `PENDING` |
| Live deployed SHA | `PENDING` |
| Live title/loading/menu/courtyard/fallback smoke | `PENDING` |
| Live keyboard smoke | `PENDING` |

If live verification fails, use the exact rollback reference `fafaedb` / `v1.9.4` / run `25995410642` and follow `docs/GRAPHICS_BACKUP_AND_ROLLBACK.md`.
