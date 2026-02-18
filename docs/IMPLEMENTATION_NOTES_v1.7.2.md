# Implementation Notes v1.7.2 (Gameplay UI + Building Visual Polish)

Date: 2026-02-18

## Summary

This patch release focuses on in-game readability and presentation quality: tighter HUD composition, clearer build controls, improved info/notification legibility, and cleaner building texture contrast.

## Changed

- Rebalanced gameplay HUD and panel layout styles in `src/ui/styles/soviet-theme.css`:
  - refined resource-chip sizing and spacing
  - updated panel widths/heights for plan/info/stats/district/minimap
  - stronger pixel-style typography hierarchy in gameplay surfaces
- Enhanced resource bar structure in `src/ui/ResourceBar.ts` with primary/secondary chip emphasis for faster visual parsing.
- Improved build controls in `src/ui/Toolbar.ts`:
  - explicit `.building-name` labels for both standard and zone buttons
  - destructive styling hook for DEMOLISH quick action
- Improved info toast presentation in `src/ui/NotificationManager.ts`:
  - compact info style
  - long-message truncation with original text preserved in title tooltip
- Improved info panel severity rendering in `src/ui/InfoPanel.ts` with warning vs critical state split.
- Polished building visuals and variants in:
  - `src/graphics/BuildingTextures.ts`
  - `src/graphics/SovietPalette.ts`
  - `src/graphics/TextureFactory.ts`

## Fixed

- Resolved top-lane overlap between tutorial steps and notification toasts by introducing tutorial-active lane shifting:
  - `src/ui/TutorialManager.ts`
  - `src/ui/styles/soviet-theme.css`
- Shortened tutorial copy to reduce horizontal pressure on desktop top-bar surfaces.

## Impact

- Better gameplay readability at desktop resolutions.
- Cleaner visual separation between transient notices and guided tutorial actions.
- Improved building-art legibility without simulation or save-format changes.
