# Release Notes v1.4.0

Date: 2026-02-12

## Highlights

- Added three campaign scenarios with distinct start conditions and objectives.
- Added campaign outcome scoring and narrative endings.
- Added campaign report modal with one-click transition to sandbox continuation.
- Added achievement system with unlock notifications, bulletin integration, and honors panel.
- Improved runtime state flow by fixing load event timing for UI subscribers.

## New Gameplay Systems

- Scenario presets:
  - Reconstruction Drive
  - Industrial Surge
  - Late-Period Stagnation
- Outcome framework:
  - weighted campaign score
  - ending categories based on city condition profile
- Achievement progression for power, welfare, productivity, order, and mobility milestones.

## UI Additions

- Scenario card selector on title screen
- `AchievementPanel`
- `CampaignEndingModal`

## Validation Summary

- Build: passed (`npm run build`)
- Preview startup: passed (`npm run preview -- --host 127.0.0.1 --port 4174`)
