# Implementation Notes v1.9.4 (Coal Plant Stack Hotfix)

Date: 2026-05-17

## Summary

This hotfix corrects the coal power plant art introduced in v1.9.3. The cooling towers and smokestack were visually too far behind the main hall, making them read as separate objects.

## Fixed

- Moved the coal plant cooling towers and smokestack forward onto the plant roof plane in `src/graphics/BuildingTextures.ts`.
- Added a roof service deck, vents, and pipe/railing detail to anchor the stack assembly to the turbine hall.
- Retained the solid procedural building body and avoided transparent overlay tricks.

## Impact

- Coal power plant reads as one attached industrial complex.
- No simulation, save, placement, or renderer behavior changed.
