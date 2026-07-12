# Test Report v1.10.0

Date: 2026-07-12

Status: Integrated pre-commit candidate checks and local browser smoke passed; candidate commit, CI, deployment, and live verification pending.

## Required local release-candidate validation

Run from the exact candidate tree after quarantine and final integration:

```bash
npm run check:art
npm run test:art
npm run check:khrushchyovka
npm run check:courtyard
npm run check:environment
npm run check:benchmark:pack4a
npm run check:benchmark:pack4b
npm run check:visual-evidence
npm run check:elevation
npm run check:interaction
npm run check:depth
npm run check:determinism
npm run check:atlas
npm run build
npm run check:benchmark:pack4a:production
npm run check:benchmark:pack4b:production
npm audit --audit-level=low
npx tsc --noEmit
git diff --check
```

## Recorded foundation evidence

The Phase 1, Pack 4A, and Pack 4B implementation reports record passing local results for:

- authored-art schema, file, manifest, fallback, and runtime mapping validation;
- 15 authored-art and fallback tests at the Pack 4B checkpoint;
- Khrushchyovka atlas, frame, anchor, and LOD validation;
- courtyard atlas and deterministic composition-planner validation;
- 48-case worker-housing benchmark and 17-case courtyard benchmark;
- elevation, interaction, shared-depth, determinism, and legacy atlas checks;
- TypeScript compilation and Vite production build;
- development benchmark hook and fixture exclusion from the production bundle;
- `git diff --check`;
- fresh restore rehearsals and a real environment-atlas outage fallback rehearsal.

This evidence validates the bounded implementation checkpoints. It does not replace a final run on the exact candidate commit.

## Recorded browser evidence

- Phase 1 browser acceptance covered opening, scenario selection, all three loading modes, terrain faces, shared depth, pause behavior, save/reload/restore, and console cleanliness at 1280 x 720, High quality, Normal UI scale.
- Pack 4A evidence covered opening cleanup, loading composition, authored worker housing at day/night/far zoom, HUD/minimap stability, and authored powered-window lights.
- Pack 4B evidence covered the 17-case courtyard matrix, 1920 x 1080 overview, night, Low-quality degradation, owner-aware demolish hover, north-west service edge, mixed-family foundation overview, and authored environment, building, and selected-frame fallbacks.

The full release matrix is not complete. Missing or partial coverage is listed in the bug check and multi-agent review.

## Candidate result placeholders

| Check | Result | Evidence |
|---|---|---|
| Final local command matrix | `PASS` | Clean `npm ci`; audit; all 13 validation scripts; build; both production exclusions; TypeScript; diff check |
| Visual evidence contract | `PASS` | 17 Pack 4B cases plus loading-art fallback, 18 exact nonblank PNGs |
| Local browser smoke | `PASS` | Opening, title, credits, sandbox, Plan Panel, pause, loading fallback, focus wrapping and restoration |
| Local axe WCAG A/AA | `PASS` | Zero violations after honors-list keyboard fix |
| Candidate commit SHA | `PENDING` | Git commit pending |
| CI workflow run | `PENDING` | GitHub Actions URL/run ID pending |
| CI conclusion | `PENDING` | Readback pending |
| Deployment run | `PENDING` | GitHub Pages run ID pending |
| Live deployed SHA | `PENDING` | Deployment readback pending |
| Live title/loading/menu smoke | `PENDING` | Browser evidence pending |
| Live courtyard and fallback smoke | `PENDING` | Browser evidence pending |
| Live keyboard smoke | `PENDING` | Browser evidence pending |

## Known non-blocking warning

The integrated build produces a 604.36 kB minified main chunk and retains the Vite chunk-size warning. It is a documented performance follow-up, not a hidden passing result.

## Production boundary

Until the pending evidence is complete, production remains commit `fafaedb`, tag `v1.9.4`, GitHub Pages run `25995410642`.
