# Graphics Implementation Evidence Index

Capture date: 2026-07-10

Local URL: `http://127.0.0.1:5173/gosplan/`

Browser viewport: 1280 x 720 unless a file is explicitly marked otherwise

Graphics quality: High

UI scale: Normal

Repository baseline: `fafaedb59a51fa8432065b41166ff4ca9989cbcc` plus the uncommitted Phase 1 graphics tranche

## Accepted captures

| File | Surface | Result |
|---|---|---|
| `phase1-final-opening.png` | Opening dossier | Accepted Phase 1 reference |
| `updated-main-menu.png` | Main bureau menu | Accepted Phase 1 reference |
| `phase1-final-scenario-select.png` | Scenario selection with three revised city vignettes | Accepted Phase 1 reference |
| `phase1-final-loading-sandbox.png` | Sandbox loading interstitial | Accepted Phase 1 reference |
| `phase1-final-loading-campaign.png` | Industrial campaign loading interstitial | Accepted Phase 1 reference |
| `phase1-final-loading-restore.png` | Saved-city restore loading interstitial | Accepted Phase 1 reference |
| `phase1-final-pause.png` | Compact-height pause dossier with visible caution exit and focused Save action | Accepted Phase 1 reference |
| `updated-hud.png` | Gameplay HUD and tool truth | Accepted interaction reference, not final visual target |
| `phase1-final-terrain-depth.png` | Generated sandbox terrain after material and shared-depth fixes | Accepted Phase 1 elevation-prototype reference |
| `opening-dossier-1366x768.png` | Cleaned opening dossier with unlabeled planning-chart prop | Accepted Pack 4A menu reference |
| `loading-dossier-1366x768.png` | Saved-city loading dossier with illustrated orbital survey | Accepted Pack 4A loading reference |
| `pack4-khrushchyovka-atlas.png` | Short, long, and linked masses at far, mid, and near LOD | Accepted Pack 4A authored-atlas reference |
| `pack4-worker-housing-day-1366x768.png` | Populated winter housing district, High quality, zoom 1, day | Accepted Pack 4A gameplay reference |
| `pack4-worker-housing-night-1366x768.png` | Same district with reconciled power and authored window lights | Accepted Pack 4A gameplay reference |
| `pack4-worker-housing-far-025-1366x768.png` | Full district at zoom 0.25 | Accepted Pack 4A far-silhouette reference |

## Pack 4B courtyard captures

The Pack 4B matrix uses the fixed winter fixture `pack4-worker-housing-courtyards-v2` with map seed `1346454344`, weather particles disabled, and a 1366 x 768 viewport unless noted. All 17 contract cases are present under the filename template `pack4b-courtyard__{caseId}__{width}x{height}.png`.

| Case group | Evidence |
|---|---|
| Short civic court | Near day, near night, far High day |
| Long green court | Near day, near night, far High day |
| Linked terrace court | Near day, near night, far High day |
| Overview | 1920 x 1080 day, 1366 x 768 night, Low-quality day |
| Foundation closure | North-west service edge and mixed-family foundation overview |
| Recovery and interaction | Environment-atlas, building-atlas, and partial-frame fallbacks, plus owner-aware demolition hover |

The authored atlas contact sheet is `pack4b-environment-atlas.png`. The fallback capture was produced by temporarily removing only `environment-worker-housing-1x.json`; the file was restored and the post-restore art checks passed. The live fallback console warning identified the missing environment atlas, while the city remained populated through procedural props.

The v1.10.0 front-door closure also includes `v1.10.0-loading-art-fallback-sandbox-1366x768.png`. It was captured with every loading-scene WebP request deliberately aborted and proves the static municipal dossier fallback, progress treatment, and skip control at the required viewport.

## Rejected or superseded captures

| File | Reason |
|---|---|
| `updated-opening.png` | Superseded by `final-opening.png` |
| `final-opening.png` | Superseded by `phase1-final-opening.png` after final integration checks |
| `updated-scenario-select.png` | Superseded by the three scene-based scenario vignettes |
| `updated-loading-sandbox.png` | Superseded by the flattened final loading composition |
| `final-pause-menu.png` | Superseded by the caution exit treatment and modal-shortcut fixes |
| `elevated-terrain.png` | Rejected. Raised tiles exposed background voids before cliff geometry was added. Do not use as release evidence. |
| `elevated-terrain-with-cliffs.png` | Superseded. Geometry was closed, but faces had not yet received material detail or shared world-depth sorting. |

## Capture limitations

The Phase 1 captures prove the front door and elevation foundation. Pack 4A adds the authored housing family. Pack 4B adds the complete 17-case courtyard matrix, building and environment atlas-loss fallbacks, a selected-frame fallback, owner-aware cosmetic interaction messaging, and exact same-level road-edge validation. The complete 48-case Pack 4 release matrix remains defined in `docs/PACK4_WORKER_HOUSING_BENCHMARK.md`. Event choice, credits, campaign ending, and reduced-motion screenshots remain later-pack evidence.

Final browser QA also verified saved-city restore, pause-key suppression, trapped Tab focus, an accessible plan-panel button, manifest-resolved loading art, and zero non-debug console errors. Automated shared-depth and interaction harnesses cover the deterministic behavior that is not visible in a static screenshot.
