# Multi-Agent Review v1.9.4 (Coal Plant Stack Hotfix)

Date: 2026-05-17

## Scope Reviewed

- Coal power plant stack/tower attachment.
- Risk of new transparent or detached-looking building detail.
- Release hygiene for a narrow visual hotfix.

## Rendering Review

Findings:
- The issue was localized to `drawCoalPowerPlant()` in `src/graphics/BuildingTextures.ts`.
- The fix changes only procedural texture geometry and adds one helper for the roof service deck.

## Visual Review

Findings:
- The stack assembly now overlaps the main roof plane and has an explicit deck/pipe connection.
- The power plant reads as one object at gameplay zoom.
- No transparent building massing or rectangular bleed was introduced.

## Outcome

- No release blockers identified for v1.9.4.
