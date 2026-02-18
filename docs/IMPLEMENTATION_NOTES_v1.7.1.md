# Implementation Notes v1.7.1 (Launch UI Polish)

Date: 2026-02-18

## Summary

This patch release focuses on first-impression UI polish: stronger pixel-style typography for launch screens, better desktop composition on the opening splash, and a cleaner scenario selection slide with reduced visual noise.

## Added

- Introduced a dedicated `--font-pixel` token in `src/ui/styles/soviet-theme.css` for sharper retro display text on launch surfaces.
- Added opening-splash command-deck structure in `src/ui/OpeningSplash.ts` to separate heading and controls for improved desktop layout control.

## Changed

- Updated opening splash layout and responsive behavior in `src/ui/styles/soviet-theme.css`:
  - desktop-oriented split between heading and controls
  - tighter spacing and hierarchy under the hero image
  - refined progress/status/start button typography
- Simplified title screen content in `src/ui/TitleScreen.ts`:
  - shortened heading copy
  - removed decorative masthead text block
  - simplified status messages
  - scenario cards now show only label + target year
- Updated launch-screen typography styles in `src/ui/styles/soviet-theme.css` for title/menu/status/button elements.

## Impact

- Launch screens better match the game’s pixel-art identity.
- Scenario selection is faster to parse on desktop.
- No gameplay logic, simulation systems, or save data paths were modified.
