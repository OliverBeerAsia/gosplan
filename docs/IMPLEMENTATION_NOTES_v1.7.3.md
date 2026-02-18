# Implementation Notes v1.7.3 (Industrial Readability Hotfix)

Date: 2026-02-18

## Summary

This hotfix addresses visual clarity regressions in industrial building states introduced by recent polish work.

## Fixed

- Removed unpowered double-darkening in `src/rendering/BuildingRenderer.ts` by skipping additional tint when an unpowered texture variant is already active.
- Improved invalid placement ghost readability in `src/rendering/OverlayRenderer.ts` by increasing invalid ghost alpha and applying a light warning tint.

## Changed

- Reduced unpowered variant overlay intensity in `src/graphics/TextureFactory.ts` (`alpha: 0.22 -> 0.15`) to preserve building silhouette and facade detail.

## Impact

- Factory and coal power plant sprites remain readable under low-power conditions.
- Invalid placement previews are clearer while still communicating rejection state.
- No simulation logic, balance values, or save formats were changed.
