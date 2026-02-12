# Implementation Notes v1.3.0 (Immersion and Fun Systems)

Date: 2026-02-12

## Summary

This milestone implements the core gameplay/immersion layer from the SimCity + Tropico-inspired roadmap:
- Campaign/Sandbox mode split
- District simulation and metrics
- Commute/access depth
- Adaptive central directives
- Choice-based political/social events
- New immersion-focused UI panels

## Core State and Event Model

- Extended `GameStateData` with:
  - `mode`
  - district snapshots
  - loyalty/unrest/commute/service indexes
  - `activeDirective`
  - `performancePressure`
  - `activeEvent`
  - bulletin entries
  - event-driven modifiers (`industrialEfficiency`, `happinessModifier`)
- Expanded event bus with:
  - district/directive/commute channels
  - event trigger/resolve channels
  - bulletin entry channel

## New Simulation Services

- `CommuteService`
  - computes commute and service access indices from roads, metro reach, and tile service values.
- `DistrictService`
  - partitions map into district sectors
  - computes district style and district risk/health metrics
  - writes district markers back to cells for renderer/UI use.
- `CampaignDirectorService`
  - computes adaptive pressure from budget, happiness, plan progress, and city order
  - updates central directives and bulletin feed.
- `EventDirectorService`
  - triggers weighted political/social events
  - resolves player choices into budget, order, demand, and efficiency effects
  - publishes outcomes to notifications and bulletin.

## UI Additions

- `DistrictPanel` for district-by-district civic state.
- `BulletinPanel` for directive and event timeline.
- `EventChoiceModal` for event decisions with response windows.
- `AmbienceOverlay` for dynamic mood tinting and unrest pressure feedback.

## Mode and Persistence

- Title screen now offers:
  - `NEW CAMPAIGN`
  - `NEW SANDBOX`
  - `CONTINUE`
- Save format upgraded to `v4`; loading remains compatible with v1-v3 data.

## Gameplay Impact

- Event choices now directly affect medium-term city dynamics.
- District-level signals create better storytelling and clearer player feedback.
- Sandbox remains open-ended while campaign maintains directive pressure.
