# Project Best Practices

## Scope

This document defines practical standards used in GOSPLAN to maintain quality while shipping quickly.

## 1) Simulation Architecture

- Keep tick order deterministic and documented in `SimulationManager`.
- Place side-effect-heavy systems (events/outcomes) after core economy/population calculations.
- Use explicit clamps for all bounded indices (happiness, unrest, loyalty, demand bands).
- Favor data-driven tables (scenarios, achievements, event templates) over hardcoded branching.

## 2) State and Event Discipline

- Extend `GameStateData` through additive fields with sensible defaults.
- Maintain forward compatibility by merging loaded saves with `createInitialState()` defaults.
- Use typed event bus channels for cross-system communication.
- Avoid duplicate mutation paths for the same data structure (e.g., single bulletin push helper).

## 3) Rendering and Visual Quality

- Preserve procedural fallback paths when adding authored asset overrides.
- Introduce heavy visual features behind quality tiers.
- Keep readability-first color contrast for gameplay overlays and metrics.
- Tie visual storytelling cues (queues, tinting, district variants) to simulation state.

## 4) UI/UX Practices

- Surface intent first: directives, deficits, blockers, and outcomes should be visible without deep clicks.
- Keep modal flows state-safe (load/reload and post-campaign transitions).
- Ensure control-state sync for both direct input and system-driven changes.
- When adding new HUD panels, verify desktop and constrained-width layout behavior.

## 5) QA Workflow

Per release:
- run `npm run build`
- run preview startup smoke (`npm run preview -- --host 127.0.0.1 --port 4174`)
- perform targeted manual checklist for new features
- record residual risks explicitly

## 6) Documentation Standards

Per release create/update:
- implementation notes
- test report
- bug check
- release notes
- changelog entry

For major sessions:
- add a dated recap document with delivered scope, lessons learned, and follow-ups.

## 7) Release and Deployment

- version bump follows semver intent (patch/minor based on scope)
- commit message should state feature intent or release purpose
- tag every release and publish GitHub release notes
- verify release visibility after publish

## 8) Decision Heuristics

When choosing between options:
- prefer clarity over novelty for systems that affect player decision-making
- prefer maintainability over micro-optimizations unless profiling indicates a hotspot
- prefer incremental delivery with validation over large untested jumps

## 9) Known Ongoing Focus Areas

- campaign balancing and pacing coefficients
- high-density HUD ergonomics
- long-session event cadence tuning
