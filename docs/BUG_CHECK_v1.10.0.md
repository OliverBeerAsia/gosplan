# Bug Check v1.10.0

Date: 2026-07-12

Status: Graphics foundation release-candidate review. Final candidate and live checks pending.

## Resolved before candidate preparation

- Raised terrain boundaries now render exposed faces instead of background voids.
- Terrain, props, buildings, traffic, and lights now share explicit world-depth ordering.
- Loading art resolves through the authored-art registry and retains fallback behavior.
- Scenario cards use distinct city vignettes instead of abstract placeholder charts.
- Pause blocks gameplay shortcuts and hidden speed mutations.
- Destructive drags cancel through off-canvas, pointer, blur, tool-change, and teardown paths.
- Legacy uneven multi-tile buildings restore through the compatibility path, including undo handling.
- Network and access behavior no longer crosses unequal elevations without ramp rules.
- Authored Khrushchyovka identity is stable and does not morph with mutable district metrics.
- Authored effects use variant-owned anchors, and paused load reconciles power without advancing simulation state.
- Courtyard props were rescaled, path decals corrected, refuse bins made explicit, orientation tightened, protected claims added, and interaction tied to the owning building.
- The environment fallback rehearsal now targets the actual environment atlas and restores it before final checks.
- `PlanPanel` performs an initial update so paused benchmarks and games do not wait for a simulation tick to display content.

## Residual risks and known limitations

### Accessibility

- Shared modal handling now provides initial focus, forward and reverse Tab containment, background isolation, shortcut suppression, Escape policy, and focus restoration across loading, opening, credits, events, campaign ending, and pause.
- Local browser smoke passed focus wrapping and restoration for credits and pause, and axe reported zero violations after the honors-list keyboard fix. The complete keyboard-only and reduced-motion matrix has not been run at both supported viewports.

### Performance

- Zone-paint invalidations are deduplicated and flushed once per rendered frame, including while paused. Representative sustained browser profiling remains a release-evidence follow-up.
- The integrated candidate main chunk is 604.36 kB minified and triggers the known Vite chunk-size warning.
- Synthetic shared-depth timing is a guardrail, not browser frame-time proof for representative populated cities.

### Visual completeness

- A dedicated north-west service-edge runtime fixture and capture are included in the 17-case matrix.
- Mixed-family far/low captures do not yet prove complete terrain, road hierarchy, neighborhood massing, or game-wide city-density parity.
- Night ground and road values remain close to daytime brightness.
- Industrial, civic, scientific-city, final terrain/road, Ministry Console, and living-city packs remain future work.
- The full quality, zoom, viewport, modal, fallback, night, and ending capture matrix remains incomplete.

### Release operations

- Candidate commit, tag, CI run, Pages deployment, deployed SHA, and live smoke evidence are pending.
- The candidate was isolated in a clean worktree from `origin/main`. Stage only the reviewed graphics and release-document paths.
- Keep `docs/MAINTENANCE-2026-05-24-node-audit.md` quarantined. The unrelated dirty source-tree `package-lock.json` remains untouched; the candidate owns a separately regenerated clean lockfile containing only the v1.10.0 version, axe development dependency, and audited transitive updates.

## Release decision

The bounded v1.10.0 graphics foundation can proceed to final candidate validation. It must not be described as the completed graphics overhaul.

Do not declare the release complete until the final command matrix, CI, deployment, and live smoke checks pass. Until then, production and rollback remain commit `fafaedb`, tag `v1.9.4`, run `25995410642`.

## Evidence placeholders

- Candidate SHA: `PENDING`
- CI workflow run and conclusion: `PENDING`
- Deployment run and conclusion: `PENDING`
- Live verified SHA: `PENDING`
- Live smoke outcome: `PENDING`
