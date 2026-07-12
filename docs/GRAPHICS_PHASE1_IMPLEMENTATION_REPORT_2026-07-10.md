# GOSPLAN Phase 1 Graphics Implementation Report

Date: 2026-07-10

Branch: `main`

Baseline commit: `fafaedb59a51fa8432065b41166ff4ca9989cbcc`

Release status: Local implementation verified; not committed, tagged, pushed, or deployed

## Outcome

Phase 1 is implemented as a coherent graphics foundation, illustrated front door, interaction-truth pass, and elevation prototype.

The game-wide graphics program is not complete. Authored building families, final terrain and road atlases, the Ministry Console, living-city animation, and the full release capture matrix remain later packs.

## Delivered systems

### Illustrated Soviet planning-bureau front door

- opening screen rebuilt as a municipal planning dossier
- title and scenario selection rebuilt around the same desk-and-paper world
- three distinct scene-based scenario vignettes replaced abstract placeholder charts
- sandbox, campaign, and restore loading screens use illustrated production WebPs
- pause UI uses the same dossier material language and separates the quit action as a caution
- event choices use an urgent ministry telegram/decree rather than a black terminal panel
- ASCII, boot-log, ticker, and terminal-hero treatments were removed from the front-door flow

### Authored-art contract

- typed schema in `src/graphics/ArtManifest.ts`
- read-only runtime registry in `src/graphics/ArtRegistry.ts`
- deterministic variant resolver in `src/graphics/ArtVariantResolver.ts`
- versioned manifest at `public/assets/art/manifest.v1.json`
- `TextureFactory` loads the registry safely while retaining procedural and legacy fallbacks
- `LoadingInterstitial` resolves production loading art through the registry and retains direct WebP fallbacks
- validation checks schema, files, IDs, atlas frames, footprint agreement, anchor bounds, deterministic resolver rules, and exact runtime-to-manifest loading-file agreement

### Interaction truth

- one authoritative tool snapshot drives toolbar, cursor, preview, and help text
- full footprints are shown for building placement, selection, and demolition
- clear-zone previews are distinct from zone-paint previews
- semantic power and service information survives Low quality
- locked category traversal skips unavailable categories
- pause suppresses gameplay shortcuts and hidden speed changes
- off-canvas drag, outside release, pointer cancellation, blur, tool change, and teardown all cancel destructive drag state
- old uneven multi-tile buildings restore through the compatibility path during load and undo
- failed undo restoration stays on the undo stack
- roads, power lines, power reachability, growth/access checks, commute scoring, connection masks, and traffic do not cross unequal elevation without future ramp rules
- pause focus remains inside the dialog, the plan-panel header is a native keyboard button, and window lights recover when graphics quality rises from Low

### Elevation and shared world depth

- deterministic generated elevation with safe legacy clamping
- water remains on a shared zero-elevation plane
- new multi-tile placement requires level ground
- pointer picking, camera headroom, terrain, buildings, zones, props, traffic, smoke, lights, and overlays are height-aware
- exposed terrain steps render procedural earth, bank, rock, water, and seasonal face treatments
- Pixi `RenderLayer` interleaves terrain, cliffs, zones, props, buildings, traffic, and window lights across their logical renderer owners
- ground-plane depth is deterministic and independent of elevation
- overlays, smoke, weather, and DOM UI keep explicit fixed-layer semantics

### Recovery and release controls

- pre-implementation working-tree archive and tracked patch with verified SHA-256 values
- second checksum-verified backup outside the application workspace
- fresh-clone restore rehearsal passed
- authored-art, fallback, elevation, interaction, shared-depth, atlas, determinism, and build checks are GitHub Pages gates
- generated loading-art provenance, prompts, source hashes, output hashes, and rights review are documented
- visual evidence has accepted, superseded, and rejected labels

## Adversarial review resolution

| Review finding | Resolution |
|---|---|
| Raised terrain exposed background voids | Added complete exposed-step geometry, boundary faces, material treatment, and browser recapture |
| Terrain and buildings could not interleave across renderer containers | Added a shared Pixi world-depth `RenderLayer` and deterministic ground-plane phases |
| Scenario cards were abstract placeholder charts | Replaced all three with distinct text-free city vignettes |
| Loading runtime bypassed the manifest | Registered production WebPs, resolved through `ArtRegistry`, and added exact runtime/manifest validation |
| Event choices remained a black terminal panel | Rebuilt as an accessible urgent ministry decree |
| Pause shortcuts could resume or mutate the game behind the dialog | Added modal shortcut suppression and speed reassertion |
| Off-canvas drag could remain destructive | Added cancelation for leave, outside release, pointer cancel, blur, tool change, and teardown |
| Legacy uneven buildings could be lost after undo | Unified compatibility restore behavior and retained failed undo actions |
| Roads, power, access scoring, and traffic crossed vertical cliffs | Added equal-elevation placement, power traversal, growth/access, commute, connection-mask, and traffic rules |
| Restore rehearsal attempted Git in an archive without `.git` | Replaced with the tested fresh clone, baseline checkout, archive overlay, and verification sequence |
| New checks were absent from deployment CI | Added every Phase 1 validation command to the Pages build job |
| Generated art lacked a provenance record | Added `docs/GRAPHICS_ASSET_PROVENANCE_2026-07-10.md` |

Final read-only re-audits passed for creative consistency, interaction/rendering truth, and recovery/release readiness within the bounded local Phase 1 claim.

## Verification matrix

All commands passed after final integration:

| Command | Result |
|---|---|
| `npm run build` | Passed. Vite produced the production bundle. Existing chunk-size warning remains. |
| `npm run check:art` | Passed: 1 atlas, 9 buildings, 7 terrain entries, 3 loading entries, 7 UI entries |
| `npm run test:art` | Passed: 8 of 8 tests |
| `npm run check:elevation` | Passed |
| `npm run check:interaction` | Passed |
| `npm run check:depth` | Passed |
| `npm run check:determinism` | Passed |
| `npm run check:atlas` | Passed: 22 legacy frames |
| `git diff --check` | Passed |

The final production JavaScript entry is 585.69 KB minified and 174.07 KB gzip. Vite still reports the existing greater-than-500-KB chunk warning. Code splitting is a later performance task, not hidden by this report.

The three production loading WebPs total 778,138 bytes. Their retained PNG production sources total 7,049,552 bytes. All three WebPs are currently preloaded after the opening screen. A later performance pack may switch to idle or mode-selective preload if browser traces justify it.

The shared-depth harness's synthetic nearly-sorted 5,500-node benchmark averaged approximately 0.085 ms per sort in Node. This is a guardrail, not a substitute for browser frame profiling on representative cities.

## Browser acceptance

Final browser QA at 1280 x 720, High graphics quality, and Normal UI scale verified:

- opening dossier
- revised scenario vignettes
- sandbox loading composition
- industrial campaign loading composition
- orbital restore loading composition
- generated terrain with physical exposed faces and shared-depth rendering
- pause dossier and gameplay-key suppression
- local save followed by page reload and archived-city restore
- no non-debug browser console errors

Evidence index: `docs/graphics-implementation-evidence/README.md`

## Backup and rollback posture

Pre-implementation artifacts:

- archive SHA-256: `2d6295199719119ea57c99d6522c319db2fa94c9a2bb88949a1edaab76a7108a`
- tracked patch SHA-256: `735af074addd7fcdb1411a825e3b544ab147158640da9943dded28e4ef477b55`

The fresh-clone recovery rehearsal at the baseline commit recreated the pre-implementation dirty set and passed cached dependency installation, build, atlas validation, and determinism validation.

The post-implementation checkpoint is stored as `gosplan-graphics-phase1-verified-2026-07-10.tgz` with a separate tracked-change review patch. Its authoritative hashes are in `SHA256SUMS.txt` in both backup locations. The checkpoint is created after this report and the exact path inventory so it represents the verified handoff state.

Whole-tranche rollback is executable. Pack-specific Git revert is not yet executable because this work remains one uncommitted working tree. Creating reviewed pack commits or pack-specific checkpoint bundles is a release gate. No commit was created because the user did not request one.

Full procedure: `docs/GRAPHICS_BACKUP_AND_ROLLBACK.md`

## Remaining program work

- authored Khrushchyovka and worker-housing family
- authored industrial, civic, and scientific-city families
- final cliff, bank, shoreline, retaining-wall, road-slope, and bridge atlas
- Ministry Console visual hierarchy, authored icons, and building thumbnails
- living-city crowds, transit stops, service queues, construction stages, and era change
- browser frame profiling with populated benchmark cities
- Low quality, second viewport, reduced motion, fallback, event, credits, ending, night, and full zoom capture matrix
- authored sprite segmentation or occlusion masks where one large building sprite must interleave within its own silhouette
- reviewed commit structure, tag, deployment run, live verification, and executable pack rollback ranges

## Claim boundary

Approved wording:

> Phase 1 graphics foundation, illustrated front door, interaction truth, and elevation prototype.

Do not call this the completed graphics overhaul.
