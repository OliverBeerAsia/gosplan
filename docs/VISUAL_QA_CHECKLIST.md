# Visual QA Checklist

## Buildings

- Variants are visibly distinct and still identifiable by type.
- Unpowered states remain readable.
- Service-stress tinting is visible but not confusing.
- Queue visuals appear only where expected and scale with pressure.

## Terrain

- Terrain variation reduces repeating patterns.
- Edge overlays appear at terrain boundaries and do not flicker.
- Decals remain subtle and do not hide tile readability.

## Zoning and Overlays

- Zone hatching remains clear across zoom levels.
- Service overlay remains legible over terrain and buildings.
- Power overlay and service overlay can be toggled without artifacts.

## Quality Tiers

- Low:
  - no heavy sprite noise
  - stable readability
- Medium:
  - visible atmosphere improvements with controlled density
- High:
  - full details active without breaking interaction

## Interaction

- Toolbar graphics controls work reliably.
- Keyboard `G` cycles quality tiers.
- Tool previews and placement highlights remain accurate.

## Stability

- Save/load keeps graphics quality preference.
- Build passes cleanly.
- No runtime exceptions during overlay toggles, building placement, and simulation ticks.
