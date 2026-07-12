# Pack 4 worker-housing benchmark

## Purpose

This benchmark is the fixed visual-review scene for Pack 4 worker housing. It is deliberately a development artifact, not a new scenario, cheat menu, save migration, or simulation-balance change.

Source of truth:

- fixture: `tests/fixtures/visual/pack4-worker-housing-v1.json`
- validator: `scripts/check-worker-housing-benchmark.cjs`
- opt-in browser control: `window.__gosplanVisualBenchmark`
- activation: local Vite development build with `?visual-benchmark=1&benchmark-fixture=pack4-worker-housing-v1`

The fixture is a normal version 4 save. Its extra top-level `benchmark` object is ignored by `SaveLoad`, so production saves remain version 4 and no existing field changes meaning.

## Scene contract

The paused winter fixture contains:

- eight Khrushchyovkas at fixed building IDs and coordinates
- five ground-level blocks and three blocks on a level-one plateau
- all four authored orientation targets: north-east, north-west, south-east, and south-west
- two same-elevation road loops with 56 road tiles
- independent level-zero and level-one power feeds
- five parks, one monument, and five fixed forest/tree cells forming two courtyards
- five cardinal level-zero/level-one transition pairs for cliff and depth review
- 1,200 residents against 1,600 units of housing capacity
- a frozen simulation (`speed: 0`), week 5 winter, fixed RNG state, and reduced motion

Restored building power flags are transient and are not part of the save schema. The load path therefore performs one deterministic infrastructure reconciliation before `game:loaded`. This powers the benchmark without advancing week, year, total ticks, or simulation RNG, and makes night-light evidence valid even while speed remains zero.

`orientationTarget` is Pack 4 art-review metadata. It describes the facade or mass variant expected at that anchor. It does not pretend that the current version 4 footprint schema can rotate a 2x1 building. A future authored renderer may consume the deterministic target without changing building coordinates or save balance.

## Validate the fixture

From the repository root:

```bash
node scripts/check-worker-housing-benchmark.cjs
```

The check loads the fixture twice through production `SaveLoad` and proves:

- identical terrain, elevation, building, state, RNG, and next-ID snapshots
- exact building inventory and unique IDs
- every building footprint is complete and points to its master cell
- every Khrushchyovka exists at the expected coordinate and elevation
- every Khrushchyovka has a road within radius two on the same elevation
- every expected Khrushchyovka receives power from its same-level network
- all courtyard buildings and tree cells exist
- each declared elevation transition is a cardinal 0/1 pair and does not conduct power across the cliff
- the viewport, zoom, quality, winter, and day/night capture contract is complete
- the browser control remains guarded by both `import.meta.env.DEV` and the explicit query flag
- the raw fixture path uses the normal save parser without reading or writing `localStorage`
- ordinary loads with no raw input still read the existing `gosplan_save` key
- manual save and 60-second autosave are disabled for an in-memory benchmark session

Print all required capture cases as JSON Lines:

```bash
node scripts/check-worker-housing-benchmark.cjs --list-captures
```

After building, prove that the production JavaScript contains no benchmark hook, query, ID, or fixture path:

```bash
npm run build
node scripts/check-worker-housing-benchmark.cjs --check-production-bundle
```

The fixture SHA-256 is printed by the validator. Record that hash with any approved screenshot set so art reviews can be reproduced against the exact city.

## Load it in browser QA

Start the local Vite server:

```bash
npm run dev -- --host 127.0.0.1
```

### In-app browser path without evaluation or storage changes

Navigate directly to:

```text
http://127.0.0.1:5173/gosplan/?visual-benchmark=1&benchmark-fixture=pack4-worker-housing-v1
```

That short URL applies the fixture defaults after restore: center 17,14, zoom 1, high quality, and day lighting. An exact no-evaluation night capture URL is:

```text
http://127.0.0.1:5173/gosplan/?visual-benchmark=1&benchmark-fixture=pack4-worker-housing-v1&benchmark-center=17%2C14&benchmark-zoom=1&benchmark-quality=high&benchmark-light=night
```

The supported capture parameters are:

| Query | Accepted values | Safe default |
|---|---|---|
| `benchmark-center` | two in-bounds integer grid coordinates, such as `17,14` | `17,14` |
| `benchmark-zoom` | `0.25`, `0.5`, `1`, `2` | `1` |
| `benchmark-quality` | `low`, `medium`, `high` | `high` |
| `benchmark-light` | `day`, `night` | `day` |

Missing or invalid capture values are ignored in favor of these safe fixture defaults. Settings are applied once, through the same validated control setters, immediately after the restored game installs its development control.

Then use only visible controls:

1. Select `Open planning bureau` on the illustrated opening dossier.
2. Select `Restore archived city` on the title dossier.
3. Wait for the illustrated restore loading screen to close.
4. Confirm the city opens paused in week 5 with population 1,200.

No page evaluation, injected script, developer console, or `localStorage` mutation is needed for loading or exact capture setup. In development, `Game.init` fetches the checked-in JSON as text, verifies version 4 and the exact benchmark ID, holds it only in memory, and offers the normal restore action. `loadGame` parses that raw text through the same code path as an ordinary archive.

If the URL is missing either query value, the fixture request fails, the JSON or identity is invalid, or Vite cannot serve the file, Gosplan logs the error and leaves ordinary title/save behavior in place.

The user save slot is protected for the full benchmark session:

- loading the fixture does not read or write the archived city
- the pause-menu save action reports that the benchmark is read-only
- keyboard save and 60-second autosave do not write the benchmark
- export remains an ordinary read of any pre-existing local archive

### Optional exact matrix automation

The no-evaluation path is sufficient for in-app visual review at the fixture's initial state. An external browser harness may use the development-only control for exact matrix capture after loading through the query URL:

```js
await page.setViewportSize({ width: 1366, height: 768 });
await page.goto(
  'http://127.0.0.1:5173/gosplan/'
  + '?visual-benchmark=1&benchmark-fixture=pack4-worker-housing-v1'
);
await page.getByRole('button', { name: 'Open planning bureau' }).click();
await page.getByRole('button', { name: 'Restore archived city' }).click();
await page.waitForFunction(() => Boolean(window.__gosplanVisualBenchmark));
```

Use the control only after the restored city is visible:

```js
const actual = await page.evaluate(({ center, zoom, quality, light }) => {
  const benchmark = window.__gosplanVisualBenchmark;
  if (!benchmark) throw new Error('Pack 4 benchmark control is unavailable');
  benchmark.setCamera(center.gx, center.gy, zoom);
  benchmark.setQuality(quality);
  benchmark.setLighting(light);
  return benchmark.snapshot();
}, {
  center: { gx: 17, gy: 14 },
  zoom: 1,
  quality: 'high',
  light: 'night',
});
```

Assert that the returned snapshot matches the requested center, zoom, quality, and light, with `week: 5` and `buildingCount: 76`, before taking the screenshot. Wait two animation frames after setting the controls so Pixi and CSS ambience have rendered the requested state.

## Exact capture matrix

The release matrix is the full 48-case product below:

| Dimension | Values |
|---|---|
| Viewport | 1366x768, 1920x1080 |
| Camera center | grid 17,14 |
| Zoom | 0.25, 0.5, 1, 2 |
| Quality | low, medium, high |
| Season | winter, fixed by week 5 |
| Light | day, night |

The debug control maps day and night to fixed cycle times used by both `AmbienceOverlay` and `WindowLightRenderer`:

- day: 34,906.58504 ms
- night: 104,719.75512 ms

Use the filenames emitted by `--list-captures`. The template is:

```text
pack4-worker-housing__{width}x{height}__z{zoom}__{quality}__winter__{light}.png
```

Store approved evidence under `docs/graphics-implementation-evidence/pack4-worker-housing/` with the fixture hash in the review note.

Pack 4A keeps representative High-quality day, night, and far captures in the main evidence directory. The full 48-case matrix remains the release-candidate gate and is not claimed as complete by the bounded Pack 4A vertical slice.

At minimum, each creative review must inspect:

- silhouette separation at 0.25 and 0.5 zoom
- facade and roof readability at 1 and 2 zoom
- authored variant repetition across the eight fixed anchors
- courtyard coherence and building entrances
- winter roof/ground separation
- powered window anchors at night in medium and high quality
- semantic readability in low quality
- cliff, footprint, and depth correctness at the ground/plateau boundary

## Safety and cleanup

The control and fixture loader are installed only when all conditions are true:

1. Vite reports `import.meta.env.DEV`.
2. The URL contains `visual-benchmark=1`.
3. In-memory fixture loading additionally requires `benchmark-fixture=pack4-worker-housing-v1`.

There is no production menu or keyboard shortcut. The production bundle must contain none of `window.__gosplanVisualBenchmark`, `visual-benchmark`, `benchmark-fixture`, the four capture query names, the fixture ID, or its source path. The installer deletes an older control before creating a new one, so a hot-module replacement or second local game instance cannot keep callbacks bound to stale game state. A full reload naturally replaces the window.

After QA, navigate back to `http://127.0.0.1:5173/gosplan/`. There is no injected save to remove, and any archived city that existed before QA remains untouched.

## Pack 4B courtyard extension

Pack 4B preserves the accepted v1 fixture and adds a sibling development fixture:

- fixture: `tests/fixtures/visual/pack4-worker-housing-courtyards-v2.json`
- validator: `scripts/check-pack4b-courtyard-benchmark.cjs`
- benchmark ID: `pack4-worker-housing-courtyards-v2`

The file is still a normal version 4 save. Its `benchmark` object is development-only review metadata ignored by `SaveLoad`; courtyard compositions are recreated from the immutable owner building identity and map seed and are never serialized.

### Balanced scene contract

The fixed map seed `1346454344` deliberately resolves three Khrushchyovkas into each authored physical mass:

| Family | Elevation | Building IDs and master cells | Expected mass | Review center |
|---|---:|---|---|---|
| Short-slab civic court | 0 | `101@4,9`, `102@8,9`, `103@12,9` | `short_slab` | `9,11` |
| Long-slab green court | 0 | `201@5,14`, `202@8,14`, `203@11,14` | `long_slab` | `9,16` |
| Linked-return terrace court | 1 | `303@19,5`, `301@23,5`, `302@27,5` | `linked_return` | `24,8` |

Each visible entrance approach is an unoccupied dirt cell on the building's `+gy` facade. Each family path is one cardinally connected, same-elevation set ending next to a declared road. Decorations, tree cells, road contacts, power feeds, and five plateau cliff pairs are exact fixture metadata.

This is a visual approach contract. Gosplan does not currently route pedestrians from authored doors, so the benchmark does not claim pedestrian pathfinding, door simulation, rotated footprints, or inward-facing facades.

### Validate Pack 4B

Run:

```bash
node scripts/check-pack4b-courtyard-benchmark.cjs
```

The checker proves:

- two production `SaveLoad` restores are identical and do not touch `localStorage`
- nine complete 2 x 1 footprints resolve as three short, three long, and three linked masses
- every block has same-elevation road access and deterministic power
- approach and dirt-path cells are contiguous, unoccupied, same-elevation, and joined to roads
- the three declared courts do not overlap or contain residential or road footprints
- decorations, forests, plateau elevations, cliff pairs, and power separation match the contract
- the pure environment planner is repeatable and manifest-order invariant
- environment compositions expose reviewed owner, placement, claim, part, and stable-ID fields
- planner caps remain Low `0`, Medium `12`, High `24`
- base and winter parts share placement identity because season changes the selected frame, not the plan
- the explicit 17-case capture contract is complete

List the exact screenshot jobs:

```bash
node scripts/check-pack4b-courtyard-benchmark.cjs --list-captures
```

After a production build, the optional bundle check rejects the Pack 4B fixture ID and path in release JavaScript:

```bash
node scripts/check-pack4b-courtyard-benchmark.cjs --check-production-bundle
```

### Bounded 17-case matrix

The capture list is explicit rather than a large Cartesian product:

- each family at zoom `2`, High, day
- each family at zoom `2`, High, night
- each family at zoom `0.25`, High, day, preserving authored far-LOD evidence
- one `1920x1080` High day overview at grid `16,11`, zoom `1`
- one `1366x768` High night overview at the same camera
- one `1366x768` Low day overview at zoom `0.25` for graceful degradation
- one `1366x768` High day environment-fallback overview
- one `1366x768` High day north-west service-edge runtime case
- one `1366x768` High day mixed-family foundation overview
- one `1366x768` High day building-atlas fallback overview
- one `1366x768` High day selected environment-frame fallback overview

All cases use week 5 winter surfaces and disable live weather particles. This is required for reproducible composition review because the live particle overlay uses non-deterministic spawning. Static snow-covered terrain, dirt paths, forest treatment, roofs, and cliff lips remain visible.

The filename contract is:

```text
pack4b-courtyard__{caseId}__{width}x{height}.png
```

Before every screenshot, assert the development snapshot's requested center, zoom, quality, light, season, map seed, authored mass, LOD reference, and visible window-light count, then wait two animation frames.

### Real fallback capture

The fallback case must use a fresh browser context and abort the real worker-housing environment atlas frames request before navigation:

```js
await page.route(
  '**/assets/art/atlases/environment-worker-housing-1x.json',
  route => route.abort()
);
```

After the city loads, require the environment plan identity and claimed cells to remain unchanged, every composition part to report its declared procedural fallback, and zero claimed compositions with no visible fallback part before taking `fallback-overview-day`. This demonstrates whole environment-atlas recovery only. It does not test the Khrushchyovka building atlas. Partial or individual missing-frame recovery remains a focused runtime-test responsibility.

### Evidence boundaries

- A fixture hash and fixed clock do not imply byte-identical screenshots across browsers or machines.
- Snapshot `light: night` is state evidence, not proof of visible contrast. Keep paired human day/night review and require powered window lights on High night cases.
- Static checks cannot prove snow/ground separation, facade clarity, or correct visual overlap. Those remain adversarial review gates on the approved images.
- Low quality intentionally has no authored environment compositions or individual window lights.
- The three family far captures stay High quality so they prove authored far LOD. Low-quality graceful degradation is a separate overview case.
- Environment-atlas fallback evidence must not be described as building-atlas fallback evidence.
- The v1 fixture and its accepted screenshots remain unchanged; Pack 4B evidence uses its own filenames and review record.
