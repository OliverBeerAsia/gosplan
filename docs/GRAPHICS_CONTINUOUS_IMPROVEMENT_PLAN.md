# Graphics Continuous Improvement Plan

## Objective

Deliver a sustained visual quality increase in buildings, terrain, zoning clarity, and Soviet atmosphere without sacrificing simulation readability or performance.

## Cadence

- Every 2 to 3 weeks:
  - ship one visual pack
  - include before/after screenshots
  - run visual QA checklist and performance smoke

## Workstreams

### 1) Buildings

- Expand building variant coverage:
  - facade packs
  - roof packs
  - weathering/condition layers
- Add district-specific architecture options:
  - worker housing blocks
  - industrial compounds
  - civic cores
- Keep queue storytelling tied to demand and service pressure.

### 2) Terrain and Environment

- Increase material variety:
  - grass/ground
  - dirt/yard
  - industrial wear
- Continue transition and edge polish.
- Add ambient props in later packs:
  - lamp posts
  - fences
  - kiosks
  - utility poles

### 3) Zone and Data Overlays

- Keep map-like hatch language for zones.
- Add and tune supplementary data layers:
  - queue pressure
  - pollution/noise
  - desirability
- Maintain strict readability checks.

### 4) Performance and Smoothness

- Keep draw-call and particle budgets per quality tier.
- Maintain camera smoothness and stable frame times.
- Track impact per added visual system.

## Release Gate

A visual pack ships only if:
- build passes
- visual QA checklist passes
- no gameplay readability regressions
- quality-tier behavior remains functional

## Ownership Model

Use rotating review roles for each pack:
- Rendering Review
- Simulation/UI Readability Review
- Stability/Performance Review

This keeps quality high while maintaining gameplay integrity.
