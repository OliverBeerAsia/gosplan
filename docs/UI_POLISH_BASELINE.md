# UI Polish Baseline

## Scope
- Desktop-first HUD and front-door polish for `1920x1080` with secondary checks at `1366x768`.
- No simulation logic changes; UI settings/state, styling, and presentation flow only.

## Build + Integrity Checks
- `npm run build` (pass)
- `npm run check:atlas` (pass)
- `npm run check:determinism` (pass)

## Baseline Capture Set
- Title screen (main menu + scenario list)
- Opening splash sequence
- Loading interstitial (campaign, sandbox, load)
- In-game HUD at early/mid/late city states
- Event modal and campaign ending modal

## Readability + Layout Focus
- Typography hierarchy consistency across panel headers/body/value text.
- Right-column overlap avoidance between info/bulletin/history controls.
- Bottom toolbar + top resource bar readability at 1080p and 1366x768.

## Performance Guardrail
- Preserve current frame-rate feel for `LOW/MED/HIGH` quality tiers.
- UI motion constrained to transform/opacity transitions and reduced-motion fallback.
