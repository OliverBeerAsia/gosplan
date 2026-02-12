# Implementation Notes v1.4.0 (Scenarios, Endings, Replayability)

Date: 2026-02-12

## Summary

This milestone completes the replayability and campaign-arc layer:
- selectable campaign scenarios
- campaign completion evaluation and endings
- achievement progression
- post-campaign transition into sandbox mode

## Core State and Event Model

- Extended `GameStateData` with campaign arc fields:
  - `campaignScenarioId`
  - `campaignScenarioLabel`
  - `campaignTargetYear`
  - `campaignEnded`
  - `campaignEndingId`
  - `campaignEndingTitle`
  - `campaignEndingSummary`
  - `campaignScore`
  - `achievementsUnlocked`
- Added event channels:
  - `achievement:unlocked`
  - `campaign:ended`
  - `mode:changed`

## New Simulation Systems

- `CampaignScenarios`
  - defines scenario presets with start-state modifiers and target year.
- `CampaignOutcomeService`
  - evaluates campaign score at scenario target year
  - resolves narrative ending outcome
  - emits completion event, notification, bulletin entry, and pauses time
  - auto-closes active unresolved event on campaign completion.
- `AchievementService`
  - checks progression milestones
  - emits unlock events/notifications and bulletin entries
  - persists unlocked set in state.

## Runtime Integration

- `Game` startup now accepts campaign scenario selection from title screen.
- Scenario modifiers are applied on new campaign start.
- `SimulationManager` tick order now includes:
  - event director
  - campaign outcome
  - achievement checks
- `game:loaded` is now emitted after UI setup so load-reactive UI modules receive it.

## UI Additions and Updates

- `TitleScreen`
  - scenario cards with subtitle and target year.
- `AchievementPanel`
  - always-visible honor board with unlocked/total count.
- `CampaignEndingModal`
  - shows ending title/summary/score/scenario
  - allows `Continue as Sandbox` transition.
- `PlanPanel`
  - campaign-complete summary state.
- `ResourceBar`
  - speed button active state now tracks all speed changes.

## Gameplay Impact

- Campaigns now feel distinct from first tick due to scenario presets.
- Mid/late game now has clear closure and replay incentive through endings + achievements.
- Players can continue city-building after campaign closure without losing atmosphere or systems.
