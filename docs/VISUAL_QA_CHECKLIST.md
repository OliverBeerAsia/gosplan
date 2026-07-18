# Visual QA Checklist

## Buildings

- Variants are visibly distinct and still identifiable by type.
- Every non-flat building has a contact shadow seating it on its tile.
- Traffic vehicles face their travel direction and keep to the right lane.
- Unpowered states remain readable.
- Service-stress tinting is visible but not confusing.
- Queue visuals appear only where expected and scale with pressure.

## Terrain

- Terrain variation reduces repeating patterns.
- Open ground reads as a continuous surface: no per-tile outline grid.
- Transition bands appear only at material boundaries and do not flicker.
- Shorelines show foam/bank on the water side; winter shows shore-fast ice.
- Winter water reads as matte ice (cracks, drifts), not dark liquid.
- Cliff faces show strata banding; no bare untextured quads.
- No dark bleed or floating streaks at elevation steps or forest edges.
- Below 0.45x zoom, forests switch to massed canopy and decals hide;
  zooming back past 0.55x restores detail without thrash.
- Decals remain subtle and do not hide tile readability.

## Day and Night

- The world itself darkens at night (terrain, water, buildings), passing
  through amber dusk into blue-grey night; UI and overlays stay readable.
- Window lights and street-lamp ground pools appear only at night and only
  where expected (powered buildings, lamps), rendered above the darkness.
- A night overview capture is part of every release evidence set.

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
