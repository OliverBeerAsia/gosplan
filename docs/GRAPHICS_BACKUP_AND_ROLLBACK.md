# GOSPLAN Graphics Program Backup and Rollback

Date: 2026-07-12

Status: Active recovery runbook

Companion plan: `docs/GRAPHICS_IMPLEMENTATION_PLAN_2026-07-10.md`

## 1. Pre-implementation recovery point

The graphics implementation began from this Git commit:

```text
fafaedb59a51fa8432065b41166ff4ca9989cbcc
```

The working tree was already dirty before implementation. A commit reference alone is therefore not a complete recovery point.

Two local backup artifacts were created before implementation code changed:

| Artifact | Workspace path | SHA-256 | Purpose |
|---|---|---|---|
| Full working-tree archive | `.backups/graphics-program/2026-07-10/gosplan-graphics-preimplementation-2026-07-10.tgz` | `2d6295199719119ea57c99d6522c319db2fa94c9a2bb88949a1edaab76a7108a` | Restores tracked and untracked working files |
| Tracked-change patch | `.backups/graphics-program/2026-07-10/gosplan-graphics-preimplementation-tracked.patch` | `735af074addd7fcdb1411a825e3b544ab147158640da9943dded28e4ef477b55` | Reapplies the pre-existing tracked diff to the baseline commit |

The archive excludes:

- `.git/`
- `node_modules/`
- `dist/`
- `.backups/`

These are either repository metadata or reproducible outputs. The archive includes the untracked graphics roadmap, implementation plan, review images, and pre-existing maintenance note.

`.backups/` is ignored by Git. Backup binaries must not be committed to the application repository.

A checksum-verified second copy is stored outside the application workspace at:

```text
/Users/home/.codex/visualizations/2026/07/10/019f4b7a-d6e3-7602-9fe8-9869766853b1/gosplan-backups/2026-07-10/
```

Both locations contain `SHA256SUMS.txt`. The second copy is a recovery artifact, not an application source file.

## 1.1 Post-implementation verified checkpoint

The exact locally verified Phase 1 handoff is preserved as:

| Artifact | Workspace path | Purpose |
|---|---|---|
| Verified Phase 1 archive | `.backups/graphics-program/2026-07-10/gosplan-graphics-phase1-verified-2026-07-10.tgz` | Restores the full verified working tree, including tracked and untracked Phase 1 files |
| Phase 1 tracked patch | `.backups/graphics-program/2026-07-10/gosplan-graphics-phase1-tracked.patch` | Reviews or reapplies tracked Phase 1 changes while excluding the pre-existing `package-lock.json` diff |

The current SHA-256 values are authoritative in `.backups/graphics-program/2026-07-10/SHA256SUMS.txt` and the checksum-verified second copy. The archive excludes `.git/`, `node_modules/`, `dist/`, and `.backups/`.

## 1.2 Pack 4A verified checkpoint

The accepted Khrushchyovka vertical slice is preserved as:

| Artifact | Workspace path | SHA-256 | Purpose |
|---|---|---|---|
| Pack 4A verified archive | `.backups/graphics-program/2026-07-10/gosplan-graphics-pack4a-khrushchyovka-verified-2026-07-10.tgz` | See `SHA256SUMS.txt` | Exact full-tree Pack 4A checkpoint under the documented exclusions |
| Pack 4A tracked review patch | `.backups/graphics-program/2026-07-10/gosplan-graphics-pack4a-tracked-review.patch` | See `SHA256SUMS.txt` | Reviews tracked changes while excluding the unrelated pre-existing `package-lock.json` diff |

Both artifacts and the updated checksum sidecar were copied to the durable off-workspace backup directory. All six checkpoint entries pass `shasum -a 256 -c SHA256SUMS.txt` in both locations, and corresponding Pack 4A files are byte-identical.

The Pack 4A archive contains 272 entries. A fresh extraction at `/private/tmp/gosplan-pack4a-restore-20260710-2236` matched the live tree exactly after excluding `.git`, `node_modules`, `dist`, and `.backups`. The restored extraction then passed the Khrushchyovka, art, benchmark, determinism, elevation, interaction, depth, TypeScript, production build, and production benchmark-exclusion checks.

## 1.3 Pack 4B verified checkpoint

Pack 4B is preserved as a new full-tree checkpoint. The archive includes the corrected courtyard atlas, environment planner, owner-aware interaction path, 13-case benchmark, complete visual evidence, CI gates, and implementation report. It excludes `.git/`, `node_modules/`, `dist/`, and `.backups/`.

| Artifact | Workspace path | SHA-256 | Durable copy |
|---|---|---|---|
| Pack 4B verified archive | `.backups/graphics-program/2026-07-11/gosplan-graphics-pack4b-courtyards-verified-2026-07-11.tgz` | See `SHA256SUMS.txt` | `/Users/home/.codex/visualizations/2026/07/10/019f4b7a-d6e3-7602-9fe8-9869766853b1/gosplan-backups/2026-07-11/` |
| Pack 4B tracked review patch | `.backups/graphics-program/2026-07-11/gosplan-graphics-pack4b-tracked-review.patch` | `76f7100622cc76e3a08e4aa855e52a91e2569b577658f587fa055516623a6aac` | Same durable directory |

Both copies pass `shasum -a 256 -c SHA256SUMS.txt`. The archive and restore extraction each contain 301 entries under the documented exclusions. The restore rehearsal at `/private/tmp/gosplan-pack4b-restore-20260711` passed art, courtyard-atlas, planner, Pack 4B benchmark, TypeScript, production build, and post-build production-bundle exclusion checks. The archive-only extraction has no `.git` directory, so `git diff --check` is intentionally a live-worktree check rather than a restore-extraction check.

The Pack 4B fallback rehearsal temporarily removed only `public/assets/art/atlases/environment-worker-housing-1x.json`, captured the procedural environment result, verified the missing-atlas warning, and restored the JSON before the final checks. The restored environment atlas SHA-256 is `d418e82fefd8475e1d326b09287c3c779c6fd90c9332f2ab887e0b61fffa33b5`.

## 1.4 v1.10.0 graphics foundation release candidate

v1.10.0 is a graphics foundation release candidate, not the completed graphics overhaul. The candidate must not replace the production reference until its exact commit passes CI, deploys through GitHub Pages, and passes live verification.

Exact current production and rollback reference:

```text
commit: fafaedb
tag: v1.9.4
GitHub Pages run: 25995410642
```

The release record remains intentionally incomplete until evidence exists:

| Evidence | Value |
|---|---|
| Candidate commit SHA | `PENDING` |
| Candidate tag | `PENDING` |
| Candidate checkpoint archive and SHA-256 | `PENDING` |
| Candidate tracked review patch and SHA-256 | `PENDING` |
| CI workflow run and conclusion | `PENDING` |
| Deployment run and conclusion | `PENDING` |
| Live deployed SHA | `PENDING` |
| Live title/loading/menu/courtyard/fallback smoke | `PENDING` |
| Live keyboard smoke | `PENDING` |

Do not create a candidate checkpoint from a partially staged tree. First verify the exact release path set, preserve the source-tree quarantine, then archive the exact committed candidate tree and copy its checksum sidecar to the durable off-workspace backup directory.

The following pre-existing path is quarantined from the graphics release and from graphics rollback:

- `docs/MAINTENANCE-2026-05-24-node-audit.md`, recorded handoff SHA-256 `a31de528e1da2f11ae2d98554d48c638b519a9e0a917463910708d55fd5cc333`

The unrelated dirty source-tree `package-lock.json`, recorded handoff SHA-256 `8e984d6080545fadb6c6081943058e400b59d3401e83307e656a8a0f46b32252`, remains untouched. The release candidate includes a clean lockfile regenerated from committed v1.9.4 for the v1.10.0 version, axe development dependency, and audited transitive fixes.

If candidate deployment or live verification fails:

1. Preserve the failed deployed SHA, workflow URL, live symptoms, console output, and screenshots.
2. Build and verify a rollback commit from tag `v1.9.4` at `fafaedb` in a clean checkout.
3. Deploy the rollback through the normal Pages workflow. Use run `25995410642` as the known production reference, not as proof that a new rollback deployment occurred.
4. Verify the live title, new game, loading, gameplay, save/restore, pause, and keyboard paths.
5. Record the new rollback deployment run and live SHA before closing the incident.

## 2. Backup verification

Verify checksums before relying on a backup:

```bash
shasum -a 256 \
  .backups/graphics-program/2026-07-10/gosplan-graphics-preimplementation-2026-07-10.tgz \
  .backups/graphics-program/2026-07-10/gosplan-graphics-preimplementation-tracked.patch
```

Verify every checkpoint in the directory with:

```bash
cd .backups/graphics-program/2026-07-10
shasum -a 256 -c SHA256SUMS.txt

cd .backups/graphics-program/2026-07-11
shasum -a 256 -c SHA256SUMS.txt
```

List the archive without extracting it:

```bash
tar -tzf .backups/graphics-program/2026-07-10/gosplan-graphics-preimplementation-2026-07-10.tgz

tar -tzf .backups/graphics-program/2026-07-11/gosplan-graphics-pack4b-courtyards-verified-2026-07-11.tgz
```

Never discover a corrupt backup during rollback. Run both checks at the start and end of every release pack.

## 3. Safe restore rehearsal

Restore into a fresh local clone first. Do not extract over the active working tree. The archive intentionally contains no `.git` directory, so running Git commands inside an archive-only extraction is not a valid rehearsal.

```bash
git clone . /private/tmp/gosplan-graphics-restore-check
git -C /private/tmp/gosplan-graphics-restore-check \
  checkout --detach fafaedb59a51fa8432065b41166ff4ca9989cbcc
tar -xzf \
  .backups/graphics-program/2026-07-10/gosplan-graphics-preimplementation-2026-07-10.tgz \
  -C /private/tmp/gosplan-graphics-restore-check
git -C /private/tmp/gosplan-graphics-restore-check status --short
npm --prefix /private/tmp/gosplan-graphics-restore-check ci --offline
npm --prefix /private/tmp/gosplan-graphics-restore-check run build
npm --prefix /private/tmp/gosplan-graphics-restore-check run check:atlas
npm --prefix /private/tmp/gosplan-graphics-restore-check run check:determinism
```

This exact fresh-clone rehearsal passed on 2026-07-10. It recreated the pre-implementation dirty set and passed dependency installation from the local cache, build, atlas validation, and determinism validation.

## 4. Rollback levels

### Level 1: Runtime fallback

Use when an authored asset or optional effect fails but the application remains usable.

- disable or remove only the affected authored manifest entry
- allow `TextureFactory` or the legacy atlas to use the procedural fallback
- keep semantic overlays and interaction feedback enabled
- record the missing or invalid asset ID
- rerun build, art validation, atlas validation, and the affected visual smoke

### Level 2: Pack rollback

Use when one graphics pack causes visual, interaction, performance, or accessibility regression.

- identify the pack merge commit or release tag
- create a new rollback branch from the current production commit
- revert only the pack commits in reverse order
- do not reset or overwrite an unrelated dirty working tree
- run the previous release's full check matrix
- deploy the rollback commit through the normal GitHub Pages workflow
- verify the live site and record the deployed commit

Current working-tree limitation: the graphics foundations and Pack 4A are still uncommitted, so no pack commit range exists. A checkpoint-level Pack 4A rollback is available: restore the verified Phase 1 archive into a fresh clone, verify the two pre-existing dirty-path hashes, then run the Phase 1 check matrix before replacing or deploying anything. A commit-level revert remains a release gate until the work is intentionally split into reviewable commits.

Do not extract the Phase 1 archive over the active dirty tree. The safe rollback target is a fresh clone or fresh recovery directory. Preserve the current Pack 4A state in its verified archive first, even when the failure appears limited to one asset.

### Level 3: Program rollback

Use when shared graphics architecture prevents a safe pack-level rollback.

- preserve the current failed state in a new backup before changing it
- restore into a fresh clone at baseline commit `fafaedb59a51fa8432065b41166ff4ca9989cbcc`
- overlay the pre-implementation archive
- verify the archive checksum and file inventory
- reinstall dependencies with `npm ci`
- run build, atlas, determinism, preview, and browser smoke checks
- deploy only after the restored build is verified locally

Do not run destructive `git reset`, `git clean`, or blind archive extraction as a rollback procedure.

## 5. Release-pack backup contract

Before each pack begins:

1. Confirm the active branch, commit, and dirty paths.
2. Save `git status --short` and `git diff --stat` in the pack implementation notes.
3. Verify the most recent backup checksum.
4. Create a new working-tree archive if uncommitted files are in the pack's path set.
5. Record the previous production tag and GitHub Pages deployment run.
6. Confirm that the procedural or previous authored fallback still exists.

After each pack passes review:

1. Record exact changed paths and asset IDs.
2. Record build, validation, determinism, visual, performance, and accessibility results.
3. Record before-and-after screenshots and benchmark state.
4. Record the release commit, tag, workflow run, and live URL check.
5. Record the rollback commit range and expected fallback behavior.
6. Verify a restore rehearsal before deleting any superseded local backup.

Backup retention:

- keep the pre-program backup until the entire graphics program is complete and the final release has been stable for at least two release cycles
- keep the previous two pack backups locally
- keep Git tags and release notes indefinitely
- do not delete a backup during the same release that supersedes it

Backup placement:

- keep the ignored in-workspace copy for fast local recovery
- keep a second checksum-verified copy outside the application workspace
- keep a `SHA256SUMS.txt` sidecar with every checkpoint directory
- do not call an ephemeral `/private/tmp` copy a durable second backup

## 6. Required documentation per pack

Every pack creates or updates:

- implementation notes
- test report
- adversarial creative review
- bug check
- release notes
- changelog
- asset inventory and manifest changes
- visual comparison captures
- performance comparison
- known residual risks
- backup verification result
- rollback instructions and rollback commit range
- live deployment verification

A pack is not complete when code and art are merged. It is complete when another engineer can understand, verify, and safely reverse it.

## 7. Rollback decision triggers

Rollback or disable the affected pack when any of these remain unresolved at release time:

- blank screen, missing critical art, or loader exception
- placement, selection, demolish, or overlay state contradicts game state
- existing saves fail to load or building footprints shift
- Low quality loses semantic information
- sustained benchmark frame-time regression exceeds the approved pack budget
- loading failure cannot return to a usable title screen
- keyboard, reduced-motion, or supported viewport regression blocks play
- art style materially diverges from the approved visual references
- production differs from the locally verified commit

## 8. Recovery ownership

The release owner decides whether to disable an asset, revert a pack, or restore the program baseline. Art direction, rendering, interaction, QA, and release owners provide evidence, but one named release owner performs and records the rollback.

No rollback is considered complete until the live GitHub Pages site is verified and the deployed commit is recorded.

## 2026-07-18 checkpoint: graphics quick wins + Workstreams A/B

Branch: `codex/graphics-quick-wins-ab`, seven commits on the clean base
`18df2e03228414c32567c7c98dabbffde53331c5` (the deployed v1.10 foundation
merge on `origin/main`). Built and verified in a clean clone, never in the
dirty mixed tree.

### Recovery points

- Pre-change recovery point: commit `18df2e0` itself. The branch contains no
  work from the dirty tree, so a commit reference is a complete recovery
  point for this series (unlike the 2026-07-10 checkpoints).
- Delivery artifacts (patch series, git bundle, evidence captures, apply
  instructions): `patches/2026-07-18-graphics-quick-wins-ab/` in the
  workspace. The bundle allows exact branch reconstruction offline:
  `git fetch graphics-quick-wins-ab.bundle codex/graphics-quick-wins-ab:...`
- Checksum-verified source archive of the candidate tree:
  `.backups/graphics-program/2026-07-18-quick-wins-ab/` with
  `SHA256SUMS.txt`. `.backups/` stays git-ignored; backup binaries are not
  committed.

### Rollback procedures

1. Before merge: delete the local branch and the patches folder. Nothing has
   changed on `main` or the live site.
2. After merge to `main`, before acceptance fails: `git revert -m 1 <merge_sha>`
   through a normal protected PR. The Pages workflow redeploys the reverted
   tree automatically on merge. Do not reset or force push (protected main).
3. Partial rollback: each commit in the series is independently revertable;
   the terrain commit (3) and ambience commit (4) have no dependencies on
   each other. Commit 2 (validator) depends on commit 1 (fixed SVG), revert
   them together if unwinding the atlas repair.
4. The removed legacy manifest entries are restorable from commit 1's diff,
   but note they were provably non-functional since 2026-02; restoring them
   restores the boot warning.

### Verification recorded for this checkpoint

All gates from `.github/workflows/deploy-pages.yml` pass locally on the
candidate: npm audit (0 vulnerabilities), check:art, test:art (19),
check:khrushchyovka, check:courtyard, check:environment, benchmark pack4a
and pack4b plus production-exclusion variants, check:visual-evidence,
check:elevation, check:interaction, check:depth, check:atlas,
check:determinism, tsc, and the production build. Browser evidence for the
visual changes is in `patches/2026-07-18-graphics-quick-wins-ab/evidence/`.
