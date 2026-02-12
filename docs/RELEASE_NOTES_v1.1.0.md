# Release Notes - v1.1.0

GOSPLAN `v1.1.0` introduces the first major planning/visual upgrade after the initial launch.

## Highlights

- Added zoning workflow (housing/industry/civic/green) with drag painting.
- Added demand-driven automatic district growth.
- Added service coverage simulation and overlay map (`C` key).
- Added tile query diagnostics with explicit growth blockers.
- Added hybrid graphics pipeline with authored atlas overrides and procedural fallback.
- Upgraded network visuals with connection-aware road/power-line variants.
- Upgraded save format to v3 with zone persistence and backward-compatible loading.

## Why This Matters

This release moves the game closer to SimCity 2000-style planning and layout dynamics while preserving the Soviet atmosphere, progression framing, and UI tone.

## Upgrade Notes

- Existing v1 and v2 saves remain loadable.
- New saves include zoning data.
- Atlas assets are optional; fallback rendering remains automatic for missing frames.
