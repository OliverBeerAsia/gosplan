# Release Notes v1.3.0

Date: 2026-02-12

## Highlights

- Added campaign and sandbox start modes on the title screen.
- Introduced district simulation with live district identity and civic-risk metrics.
- Added commute and service-access simulation to better model city mobility quality.
- Added adaptive central directives based on planning pressure.
- Added political/social event cards with choice-based consequences.
- Added state bulletin feed and immersive overlays for atmosphere and situational awareness.

## New Gameplay Systems

- District-level metrics:
  - service access
  - commute
  - loyalty
  - unrest risk
- New event loop:
  - triggers events from city conditions
  - presents policy choices
  - applies meaningful tradeoffs to budget, demand, efficiency, and public order

## UI Additions

- `DistrictPanel`
- `BulletinPanel`
- `EventChoiceModal`
- `AmbienceOverlay`

## Persistence and Compatibility

- Save format upgraded to `v4`.
- Backward compatibility preserved for `v1`, `v2`, and `v3` saves.

## Validation Summary

- Build: passed (`npm run build`)
- Preview smoke: passed (`HTTP/1.1 200 OK`)
