# Implementation Notes v1.9.3 (TTD-Inspired Building Art Pass)

Date: 2026-05-17

## Summary

This release improves in-game building graphics while keeping the existing procedural PixiJS texture pipeline intact.

## Changed

- Added crisper isometric rim strokes to core residential, industrial, civic, and service buildings in `src/graphics/BuildingTextures.ts`.
- Added deterministic pixel-scale facade wear so buildings read less smooth/vector-like without becoming noisy.
- Added residential balcony runs for slab and panel towers.
- Added industrial yard cues for factories, warehouses, and coal power assets.
- Added compact civic forecourt details for public buildings such as party HQ, hospital, school, cinema, metro station, and sports complex.

## Visual Guardrails

- Building bodies remain solid procedural geometry.
- No atlas replacement, sprite-anchor changes, depth-sort changes, or save-format changes.
- New detail layers avoid transparent rectangular building overlays and preserve silhouette readability at gameplay zoom.
- The art direction targets classic 2:1 transport-management readability while staying Soviet/GOSPLAN in palette and subject matter.

## Impact

- Buildings have stronger silhouettes, better roof identity, and clearer category-specific personality.
- The change is isolated to building texture generation and does not affect simulation, balance, placement, or persistence.
