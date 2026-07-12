# Graphics audit handoff, 2026-07-12

> Superseded for the v1.10.0 candidate: the release worktree is now isolated from the mixed source tree, the Pack 4B contract has 17 captures including the north-west service edge and mixed-family foundation view, modal focus handling is implemented, and zone invalidations are coalesced. Historical findings below describe the pre-closure handoff. The unrelated dirty source-tree lockfile remains untouched while the candidate owns a clean regenerated lockfile.

## Publication status

The graphics program is not pushed. `main` and `origin/main` both remain at
`fafaedb` (`v1.9.4`). The current Pack 4A/4B graphics, loading-screen
replacement, runtime composition planner, evidence, documentation, and CI
gates are local working-tree changes. The remote Pages deployment therefore
still serves the pre-Pack4B release.

## Validation result

The local release gates pass:

- authored-art manifest and 15 art tests
- courtyard atlas and environment composition planner
- Pack 4B benchmark: 66 buildings and 13 captures
- legacy worker-housing benchmark
- interaction, depth, elevation, and determinism checks
- TypeScript compilation and `git diff --check`
- Vite production build
- production-bundle benchmark exclusion

The build retains the known 601 kB minified main-chunk warning. It is a
non-blocking optimization follow-up, not a failed gate.

## Audit findings

### Fixed in this audit

- `PlanPanel` now performs an initial update during construction. Paused games
  and paused visual benchmarks no longer show an empty panel while waiting for
  the first simulation tick.

### P2 follow-up before broad public release

- Loading, credits, event, and opening-splash dialogs need full keyboard focus
  trapping and focus restoration. Their current `aria-modal` declarations do
  not fully contain Tab focus.
- Long zone-paint drags rebuild the bounded environment composition set for
  each changed cell. Profile and coalesce updates if playtest frame time drops.
- Add a dedicated runtime capture for the north-west service-edge orientation.
- Add a mixed-family city overview and stronger far/low framing before claiming
  full SimCity 2000-style city-density parity. Current distant captures lose
  terrain, road hierarchy, and neighborhood massing.
- Night ground and road surfaces need a stronger dusk treatment; window lights
  are present, but the scene remains close to daytime brightness.

## Deployment gate

Do not deploy from the current mixed dirty tree. Quarantine the pre-existing
`package-lock.json` and `docs/MAINTENANCE-2026-05-24-node-audit.md` changes,
review the intended graphics scope, stage deliberately, commit, push, monitor
the Pages workflow, and perform live title/loading/menu/courtyard/fallback and
keyboard smoke checks. Record the deployed SHA and rollback reference in the
backup/rollback report.
