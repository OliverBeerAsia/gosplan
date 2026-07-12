#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(root, 'tests/fixtures/visual/pack4-worker-housing-v1.json');
const raw = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(raw);

const { EventBus } = require('../src/core/EventBus.ts');
const { loadGame } = require('../src/core/SaveLoad.ts');
const { BuildingRegistry } = require('../src/buildings/BuildingRegistry.ts');
const { BuildingPlacer } = require('../src/grid/BuildingPlacer.ts');
const { Grid } = require('../src/grid/Grid.ts');
const { hasRoadNearbyAtEqualElevation } = require('../src/simulation/CommuteService.ts');
const { PowerService, canTraversePowerEdge } = require('../src/simulation/PowerService.ts');
const { SimulationManager } = require('../src/simulation/SimulationManager.ts');

assert.equal(fixture.version, 4, 'benchmark must remain a normal version 4 save');
assert.equal(fixture.benchmark.schemaVersion, 1, 'benchmark metadata schema');
assert.equal(fixture.state.speed, 0, 'capture save must be paused');
assert.equal(
  fixture.state.week,
  fixture.benchmark.capture.season.week,
  'fixture state must match its winter capture contract'
);

const ids = fixture.buildings.map((building) => building.id);
assert.equal(new Set(ids).size, ids.length, 'building IDs must be unique');
assert.ok(fixture.nextBuildingId > Math.max(...ids), 'nextBuildingId must exceed every fixture ID');

function loadFixture() {
  let reads = 0;
  let writes = 0;
  global.localStorage = {
    getItem: () => {
      reads++;
      throw new Error('in-memory fixture load must not read localStorage');
    },
    setItem: () => {
      writes++;
      throw new Error('in-memory fixture load must not write localStorage');
    },
  };

  const grid = new Grid(fixture.benchmark.expected.mapSize);
  const registry = new BuildingRegistry();
  const events = new EventBus();
  const placer = new BuildingPlacer(grid, registry, events);
  const state = loadGame(grid, registry, placer, raw);
  assert.ok(state, 'fixture must load through production SaveLoad from raw input');
  assert.equal(reads, 0, 'raw fixture input must bypass localStorage reads');
  assert.equal(writes, 0, 'raw fixture input must bypass localStorage writes');
  return { grid, registry, events, placer, state, storage: { reads, writes } };
}

function snapshot({ grid, state, placer }) {
  const cells = [];
  for (let gx = 0; gx < grid.size; gx++) {
    for (let gy = 0; gy < grid.size; gy++) {
      const cell = grid.getCell(gx, gy);
      cells.push([
        gx,
        gy,
        cell.terrain,
        cell.elevation,
        cell.zone,
        cell.building?.id ?? null,
        cell.masterGx,
        cell.masterGy,
      ]);
    }
  }
  return {
    cells,
    state: {
      mode: state.mode,
      week: state.week,
      year: state.year,
      population: state.population,
      quality: state.graphicsQuality,
      rngSeed: state.rngSeed,
      rngState: state.rngState,
      mapSeed: state.mapSeed,
    },
    nextBuildingId: placer.getNextId(),
  };
}

const first = loadFixture();
const second = loadFixture();
assert.deepEqual(snapshot(first), snapshot(second), 'two independent loads must be identical');
assert.equal(first.placer.getNextId(), fixture.nextBuildingId, 'next building ID must restore exactly');

let ordinaryReads = 0;
let ordinaryWrites = 0;
global.localStorage = {
  getItem: (key) => {
    ordinaryReads++;
    return key === 'gosplan_save' ? raw : null;
  },
  setItem: () => {
    ordinaryWrites++;
  },
};
const ordinaryGrid = new Grid(fixture.benchmark.expected.mapSize);
const ordinaryRegistry = new BuildingRegistry();
const ordinaryPlacer = new BuildingPlacer(ordinaryGrid, ordinaryRegistry, new EventBus());
assert.ok(
  loadGame(ordinaryGrid, ordinaryRegistry, ordinaryPlacer),
  'ordinary load without raw input must still use localStorage'
);
assert.equal(ordinaryReads, 1, 'ordinary load must read the existing save key once');
assert.equal(ordinaryWrites, 0, 'ordinary load must not write localStorage');

ordinaryReads = 0;
const invalidGrid = new Grid(fixture.benchmark.expected.mapSize);
const invalidPlacer = new BuildingPlacer(invalidGrid, ordinaryRegistry, new EventBus());
assert.equal(
  loadGame(invalidGrid, ordinaryRegistry, invalidPlacer, '{invalid-json'),
  null,
  'invalid raw input must fail without falling back to a local archive'
);
assert.equal(ordinaryReads, 0, 'explicit raw input must never fall back to localStorage');
assert.equal(ordinaryWrites, 0, 'invalid raw input must remain non-destructive');

const actualCounts = {};
for (const building of first.grid.getAllBuildings()) {
  actualCounts[building.defId] = (actualCounts[building.defId] ?? 0) + 1;
  const def = first.registry.get(building.defId);
  assert.ok(def, `unknown building definition ${building.defId}`);
  const footprint = first.grid.getBuildingFootprint(building.id);
  assert.deepEqual(
    footprint,
    { gx: building.gx, gy: building.gy, width: def.width, height: def.height },
    `footprint index for building ${building.id}`
  );
  for (let dx = 0; dx < def.width; dx++) {
    for (let dy = 0; dy < def.height; dy++) {
      const cell = first.grid.getCell(building.gx + dx, building.gy + dy);
      assert.equal(cell?.building?.id, building.id, `footprint occupancy for building ${building.id}`);
      assert.equal(cell?.masterGx, building.gx, `master gx for building ${building.id}`);
      assert.equal(cell?.masterGy, building.gy, `master gy for building ${building.id}`);
    }
  }
}
assert.deepEqual(actualCounts, fixture.benchmark.expected.buildingCounts, 'expected building inventory');

const roads = new Set(
  first.grid.getAllBuildings()
    .filter((building) => building.defId === 'road')
    .map((building) => `${building.gx},${building.gy}`)
);
const orientations = new Set();
for (const expected of fixture.benchmark.expected.khrushchyovkas) {
  const building = first.grid.getBuildingById(expected.id);
  assert.ok(building, `missing Khrushchyovka ${expected.id}`);
  assert.equal(building.defId, 'khrushchyovka', `building ${expected.id} type`);
  assert.equal(building.gx, expected.gx, `building ${expected.id} gx`);
  assert.equal(building.gy, expected.gy, `building ${expected.id} gy`);
  assert.equal(first.grid.getElevation(building.gx, building.gy), expected.elevation);
  assert.equal(
    hasRoadNearbyAtEqualElevation(
      first.grid,
      building.gx,
      building.gy,
      roads,
      fixture.benchmark.expected.roadAccessRadius
    ),
    true,
    `Khrushchyovka ${expected.id} must have same-level road access`
  );
  orientations.add(expected.orientationTarget);
}
assert.deepEqual(
  [...orientations].sort(),
  ['north-east', 'north-west', 'south-east', 'south-west'],
  'all four Pack 4 orientation targets must be represented'
);

new PowerService(first.grid, first.registry, first.state, first.events).tick();
for (const id of fixture.benchmark.expected.poweredBuildingIds) {
  assert.equal(first.grid.getBuildingById(id)?.powered, true, `building ${id} must be powered`);
}

const pausedLoad = loadFixture();
const pausedWeek = pausedLoad.state.week;
const pausedYear = pausedLoad.state.year;
const pausedRngState = pausedLoad.state.rngState;
const pausedTicks = pausedLoad.state.totalTicks;
const pausedSimulation = new SimulationManager(
  pausedLoad.grid,
  pausedLoad.registry,
  pausedLoad.placer,
  pausedLoad.state,
  pausedLoad.events
);
pausedSimulation.reconcileLoadedInfrastructure();
for (const id of fixture.benchmark.expected.poweredBuildingIds) {
  assert.equal(
    pausedLoad.grid.getBuildingById(id)?.powered,
    true,
    `paused load reconciliation must power building ${id}`
  );
}
assert.equal(pausedLoad.state.week, pausedWeek, 'load reconciliation must not advance the week');
assert.equal(pausedLoad.state.year, pausedYear, 'load reconciliation must not advance the year');
assert.equal(pausedLoad.state.totalTicks, pausedTicks, 'load reconciliation must not run a simulation tick');
assert.equal(pausedLoad.state.rngState, pausedRngState, 'load reconciliation must not consume simulation RNG');

for (const id of fixture.benchmark.expected.courtyardBuildingIds) {
  const building = first.grid.getBuildingById(id);
  assert.ok(building, `courtyard building ${id} must exist`);
  assert.ok(['park', 'monument'].includes(building.defId), `courtyard building ${id} type`);
}
for (const [gx, gy] of fixture.benchmark.expected.treeCells) {
  assert.equal(first.grid.getCell(gx, gy)?.terrain, 'forest', `tree cell ${gx},${gy}`);
}

for (const [[lowGx, lowGy], [highGx, highGy]] of fixture.benchmark.expected.elevationTransitionPairs) {
  assert.equal(first.grid.getElevation(lowGx, lowGy), 0, `lower transition ${lowGx},${lowGy}`);
  assert.equal(first.grid.getElevation(highGx, highGy), 1, `upper transition ${highGx},${highGy}`);
  assert.equal(
    Math.abs(lowGx - highGx) + Math.abs(lowGy - highGy),
    1,
    'elevation transition cells must be cardinal neighbors'
  );
  assert.equal(
    canTraversePowerEdge(first.grid, lowGx, lowGy, highGx, highGy),
    false,
    'the benchmark must not imply power connectivity across a cliff'
  );
}

const capture = fixture.benchmark.capture;
assert.deepEqual(capture.zooms, [0.25, 0.5, 1, 2], 'required zoom matrix');
assert.deepEqual(capture.qualities, ['low', 'medium', 'high'], 'required quality matrix');
assert.deepEqual(
  capture.viewports,
  [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }],
  'required viewport matrix'
);
assert.deepEqual(capture.lighting.map((entry) => entry.id), ['day', 'night']);
const caseCount = capture.viewports.length
  * capture.zooms.length
  * capture.qualities.length
  * capture.lighting.length;
assert.equal(caseCount, capture.requiredCaseCount, 'capture matrix case count');

const gameSource = fs.readFileSync(path.join(root, 'src/core/Game.ts'), 'utf8');
assert.match(
  gameSource,
  /this\.simulation\.reconcileLoadedInfrastructure\(\);\s*this\.events\.emit\('game:loaded', \{\}\);/,
  'restored cities must reconcile transient power before the loaded event'
);
assert.match(
  gameSource,
  /if \(!import\.meta\.env\.DEV\) return;/,
  'benchmark window control must be guarded by import.meta.env.DEV'
);
assert.match(
  gameSource,
  /get\('visual-benchmark'\) !== '1'/,
  'benchmark window control must also require an explicit query flag'
);
assert.match(
  gameSource,
  /delete window\.__gosplanVisualBenchmark;/,
  'benchmark window control must clear stale HMR instances before installation'
);
assert.match(
  gameSource,
  /'pack4-worker-housing-v1': 'tests\/fixtures\/visual\/pack4-worker-housing-v1\.json'/,
  'the original fixture ID must map to its exact checked-in development path'
);
assert.match(
  gameSource,
  /fixtureId !== null\s*&& fixtureFiles\[fixtureId\]/,
  'development fixture loading must require a recognized exact fixture ID'
);
assert.match(
  gameSource,
  /import\.meta\.env\.DEV \? this\.visualBenchmarkSaveRaw \?\? undefined : undefined/,
  'only development builds may pass the in-memory raw save to SaveLoad'
);
assert.match(
  gameSource,
  /if \(import\.meta\.env\.DEV && this\.visualBenchmarkSaveRaw !== null\) return;/,
  'benchmark autosave must be disabled'
);
assert.match(
  gameSource,
  /Visual benchmark sessions are read-only\./,
  'manual save must report the read-only benchmark contract'
);
for (const queryName of [
  'benchmark-center',
  'benchmark-zoom',
  'benchmark-quality',
  'benchmark-light',
]) {
  assert.match(
    gameSource,
    new RegExp(`params\\.get\\('${queryName}'\\)`),
    `capture control must read ${queryName} from the development query`
  );
}
assert.match(
  gameSource,
  /: \{ gx: 17, gy: 14 \};/,
  'fixture query must default to the approved grid center'
);
assert.match(
  gameSource,
  /\[0\.25, 0\.5, 1, 2\]\.includes\(requestedZoom\) \? requestedZoom : 1/,
  'fixture query must accept only the approved zoom matrix and default to 1'
);
assert.match(
  gameSource,
  /requestedQuality === 'low'[\s\S]+: 'high';/,
  'fixture query must accept the quality enum and default to high'
);
assert.match(
  gameSource,
  /requestedLight === 'night' \? 'night' : 'day'/,
  'fixture query must accept night and default to day'
);
assert.match(
  gameSource,
  /control\.setCamera\(center\.gx, center\.gy, zoom\);[\s\S]+control\.setQuality\(quality\);[\s\S]+control\.setLighting\(light\);/,
  'query settings must be applied through the same validated control setters'
);
assert.doesNotMatch(
  gameSource,
  /localStorage\.setItem/,
  'Game benchmark wiring must never write localStorage directly'
);

if (process.argv.includes('--check-production-bundle')) {
  const assetsDir = path.join(root, 'dist/assets');
  assert.ok(fs.existsSync(assetsDir), 'production bundle check requires npm run build first');
  const bundle = fs.readdirSync(assetsDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8'))
    .join('\n');
  for (const forbidden of [
    '__gosplanVisualBenchmark',
    'visual-benchmark',
    'benchmark-fixture',
    'benchmark-center',
    'benchmark-zoom',
    'benchmark-quality',
    'benchmark-light',
    'pack4-worker-housing-v1',
    'tests/fixtures/visual',
  ]) {
    assert.equal(
      bundle.includes(forbidden),
      false,
      `production JavaScript must not contain ${forbidden}`
    );
  }
  console.log('worker-housing-benchmark-production-check: ok');
}

function formatFilename(viewport, zoom, quality, light) {
  return capture.filenameTemplate
    .replace('{width}', String(viewport.width))
    .replace('{height}', String(viewport.height))
    .replace('{zoom}', String(zoom))
    .replace('{quality}', quality)
    .replace('{light}', light);
}

if (process.argv.includes('--list-captures')) {
  for (const viewport of capture.viewports) {
    for (const zoom of capture.zooms) {
      for (const quality of capture.qualities) {
        for (const light of capture.lighting.map((entry) => entry.id)) {
          console.log(JSON.stringify({
            viewport,
            center: capture.centerGrid,
            zoom,
            quality,
            season: capture.season.id,
            light,
            filename: formatFilename(viewport, zoom, quality, light),
          }));
        }
      }
    }
  }
}

const sha256 = crypto.createHash('sha256').update(raw).digest('hex');
console.log(
  `worker-housing-benchmark-check: ok (${fixture.buildings.length} buildings, `
  + `${caseCount} capture cases, sha256 ${sha256})`
);
