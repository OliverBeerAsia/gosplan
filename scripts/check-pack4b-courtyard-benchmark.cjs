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
const fixturePath = path.join(
  root,
  'tests/fixtures/visual/pack4-worker-housing-courtyards-v2.json'
);
const manifestPath = path.join(root, 'public/assets/art/manifest.v1.json');
const raw = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(raw);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const { EventBus } = require('../src/core/EventBus.ts');
const { loadGame } = require('../src/core/SaveLoad.ts');
const { BuildingRegistry } = require('../src/buildings/BuildingRegistry.ts');
const { BuildingPlacer } = require('../src/grid/BuildingPlacer.ts');
const { Grid } = require('../src/grid/Grid.ts');
const { hasRoadNearbyAtEqualElevation } = require('../src/simulation/CommuteService.ts');
const { PowerService, canTraversePowerEdge } = require('../src/simulation/PowerService.ts');
const { resolveBuildingArtVariant } = require('../src/graphics/ArtVariantResolver.ts');
const { getSeason } = require('../src/rendering/SeasonalEffects.ts');

assert.equal(fixture.version, 4, 'Pack 4B must remain a normal version 4 save');
assert.equal(fixture.benchmark.id, 'pack4-worker-housing-courtyards-v2');
assert.equal(fixture.benchmark.schemaVersion, 2);
assert.equal(fixture.benchmark.extends, 'pack4-worker-housing-v1');
assert.equal(fixture.state.speed, 0, 'capture fixture must be paused');
assert.equal(fixture.state.rngSeed, fixture.state.rngState, 'fixture RNG is frozen');
assert.equal(fixture.state.mapSeed, 1346454344, 'reviewed map seed');
assert.equal(getSeason(fixture.state.week), 'winter', 'week 5 must select winter');
assert.equal(
  fixture.benchmark.expected.winterSurfaceContract.weatherOverlay,
  'off',
  'static winter captures must disable nondeterministic live particles'
);

const ids = fixture.buildings.map((building) => building.id);
assert.equal(new Set(ids).size, ids.length, 'building IDs must be unique');
assert.ok(fixture.nextBuildingId > Math.max(...ids), 'nextBuildingId must exceed all IDs');

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
  assert.ok(state, 'fixture must load through production SaveLoad');
  assert.equal(reads, 0);
  assert.equal(writes, 0);
  return { grid, registry, events, placer, state };
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
      week: state.week,
      year: state.year,
      speed: state.speed,
      rngSeed: state.rngSeed,
      rngState: state.rngState,
      mapSeed: state.mapSeed,
      graphicsQuality: state.graphicsQuality,
    },
    nextBuildingId: placer.getNextId(),
  };
}

const first = loadFixture();
const second = loadFixture();
assert.deepEqual(snapshot(first), snapshot(second), 'independent restores must match exactly');
assert.equal(first.placer.getNextId(), fixture.nextBuildingId);

const counts = {};
for (const building of first.grid.getAllBuildings()) {
  counts[building.defId] = (counts[building.defId] ?? 0) + 1;
  const def = first.registry.get(building.defId);
  assert.ok(def, `unknown building definition ${building.defId}`);
  assert.deepEqual(
    first.grid.getBuildingFootprint(building.id),
    { gx: building.gx, gy: building.gy, width: def.width, height: def.height },
    `footprint index for building ${building.id}`
  );
  for (let dx = 0; dx < def.width; dx++) {
    for (let dy = 0; dy < def.height; dy++) {
      const cell = first.grid.getCell(building.gx + dx, building.gy + dy);
      assert.equal(cell?.building?.id, building.id, `occupancy for building ${building.id}`);
      assert.equal(cell?.masterGx, building.gx);
      assert.equal(cell?.masterGy, building.gy);
    }
  }
}
assert.deepEqual(counts, fixture.benchmark.expected.buildingCounts);

const roads = new Set(
  first.grid.getAllBuildings()
    .filter((building) => building.defId === 'road')
    .map((building) => `${building.gx},${building.gy}`)
);
const buildingArt = manifest.buildings.find((entry) => entry.buildingId === 'khrushchyovka');
assert.ok(buildingArt, 'authored Khrushchyovka definition must exist');

const expectedKhrushchyovkas = fixture.benchmark.expected.khrushchyovkas;
assert.equal(expectedKhrushchyovkas.length, 9, 'balanced benchmark uses nine blocks');
for (const expected of expectedKhrushchyovkas) {
  const building = first.grid.getBuildingById(expected.id);
  assert.ok(building, `missing Khrushchyovka ${expected.id}`);
  assert.equal(building.defId, 'khrushchyovka');
  assert.equal(building.gx, expected.gx);
  assert.equal(building.gy, expected.gy);
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
  const resolved = resolveBuildingArtVariant(buildingArt.variants, {
    mapSeed: fixture.state.mapSeed,
    building,
    districtStyle: 'worker_housing',
    era: fixture.state.currentEra,
  });
  assert.equal(resolved?.id, expected.expectedVariantId, `visual mass for ${expected.id}`);
}
assert.deepEqual(
  [...new Set(expectedKhrushchyovkas.map((entry) => entry.expectedVariantId))].sort(),
  ['linked_return', 'long_slab', 'short_slab'],
  'all three authored physical masses must be represented'
);

new PowerService(first.grid, first.registry, first.state, first.events).tick();
for (const id of fixture.benchmark.expected.poweredBuildingIds) {
  assert.equal(first.grid.getBuildingById(id)?.powered, true, `building ${id} must be powered`);
}

function key([gx, gy]) {
  return `${gx},${gy}`;
}

function assertCardinallyConnected(cells, label) {
  assert.ok(cells.length > 0, `${label} cannot be empty`);
  const all = new Set(cells.map(key));
  const visited = new Set([key(cells[0])]);
  const queue = [cells[0]];
  while (queue.length > 0) {
    const [gx, gy] = queue.shift();
    for (const neighbor of [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]]) {
      const neighborKey = key(neighbor);
      if (all.has(neighborKey) && !visited.has(neighborKey)) {
        visited.add(neighborKey);
        queue.push(neighbor);
      }
    }
  }
  assert.equal(visited.size, all.size, `${label} must be one cardinally connected set`);
}

const courtClaims = new Set();
const familyIds = new Set();
for (const family of fixture.benchmark.expected.courtyardFamilies) {
  assert.equal(family.buildingIds.length, 3, `${family.id} family size`);
  assert.equal(new Set(family.buildingIds).size, 3);
  assert.equal(familyIds.has(family.id), false, 'family IDs must be unique');
  familyIds.add(family.id);
  assertCardinallyConnected(family.pathCells, `${family.id} path`);

  const familyBuildings = family.buildingIds.map((id) => {
    const expected = expectedKhrushchyovkas.find((entry) => entry.id === id);
    assert.ok(expected, `${family.id} references unknown housing ID ${id}`);
    assert.equal(expected.familyId, family.id);
    assert.equal(expected.expectedVariantId, family.expectedVariantId);
    assert.equal(expected.elevation, family.elevation);
    return expected;
  });

  const pathSet = new Set(family.pathCells.map(key));
  for (const expected of familyBuildings) {
    const [approachGx, approachGy] = expected.approachCell;
    assert.equal(
      approachGy,
      expected.gy + 1,
      `approach for ${expected.id} must sit on the visible +gy facade`
    );
    assert.ok(
      approachGx >= expected.gx && approachGx < expected.gx + 2,
      `approach for ${expected.id} must touch its 2x1 footprint`
    );
    assert.ok(pathSet.has(key(expected.approachCell)), `approach for ${expected.id} is on path`);
  }

  for (const [gx, gy] of family.pathCells) {
    const cell = first.grid.getCell(gx, gy);
    assert.ok(cell, `path cell ${gx},${gy} exists`);
    assert.equal(cell.terrain, 'dirt', `path cell ${gx},${gy} uses dirt`);
    assert.equal(cell.elevation, family.elevation, `path elevation in ${family.id}`);
    assert.equal(cell.building ?? null, null, `path cell ${gx},${gy} remains walkable visually`);
  }

  let touchesRoad = false;
  for (const [roadGx, roadGy] of family.roadContactCells) {
    assert.ok(roads.has(`${roadGx},${roadGy}`), `${family.id} road contact exists`);
    assert.equal(first.grid.getElevation(roadGx, roadGy), family.elevation);
    touchesRoad ||= family.pathCells.some(([gx, gy]) => (
      Math.abs(gx - roadGx) + Math.abs(gy - roadGy) === 1
    ));
  }
  assert.equal(touchesRoad, true, `${family.id} path must meet a same-level road`);

  for (const cell of family.courtCells) {
    const cellKey = key(cell);
    assert.equal(courtClaims.has(cellKey), false, `courtyard families overlap at ${cellKey}`);
    courtClaims.add(cellKey);
    const master = first.grid.getMasterBuilding(cell[0], cell[1]);
    if (master) {
      const def = first.registry.get(master.defId);
      assert.notEqual(def?.category, 'residential', `housing intrudes into ${family.id} court`);
      assert.equal(def?.isRoad, undefined, `road intrudes into ${family.id} court`);
    }
  }

  for (const id of family.decorBuildingIds) {
    const building = first.grid.getBuildingById(id);
    assert.ok(building, `missing ${family.id} decoration ${id}`);
    assert.equal(first.registry.get(building.defId)?.category, 'decoration');
    assert.equal(first.grid.getElevation(building.gx, building.gy), family.elevation);
  }
  for (const [gx, gy] of family.treeCells) {
    assert.equal(first.grid.getCell(gx, gy)?.terrain, 'forest', `${family.id} tree ${gx},${gy}`);
    assert.equal(first.grid.getElevation(gx, gy), family.elevation);
  }
}

assert.deepEqual(
  [...familyIds].sort(),
  ['linked_terrace_court', 'long_green_court', 'short_civic_court']
);

for (const [[lowGx, lowGy], [highGx, highGy]]
  of fixture.benchmark.expected.elevationTransitionPairs) {
  assert.equal(first.grid.getElevation(lowGx, lowGy), 0);
  assert.equal(first.grid.getElevation(highGx, highGy), 1);
  assert.equal(Math.abs(lowGx - highGx) + Math.abs(lowGy - highGy), 1);
  assert.equal(
    canTraversePowerEdge(first.grid, lowGx, lowGy, highGx, highGy),
    false,
    'the benchmark must not imply power across a cliff'
  );
}

const terrainSource = fs.readFileSync(path.join(root, 'src/graphics/TerrainTextures.ts'), 'utf8');
assert.match(terrainSource, /seasons: TerrainSeason\[\] = \['winter', 'autumn', 'spring'\]/);
for (const material of ['ground', 'dirt', 'forest']) {
  const needle = 'textures.set(`' + material + '_${season}_${v}`';
  assert.ok(terrainSource.includes(needle), `seasonal ${material} texture generation`);
}
const atlasSvg = fs.readFileSync(
  path.join(root, 'public/assets/art/atlases/buildings-khrushchyovka-1x.svg'),
  'utf8'
);
assert.match(atlasSvg, /#ECEBE3/i, 'authored roof snow color');
const terrainRendererSource = fs.readFileSync(
  path.join(root, 'src/rendering/TerrainRenderer.ts'),
  'utf8'
);
assert.match(terrainRendererSource, /0xD6DCE2/, 'winter cliff lip color');

const capture = fixture.benchmark.capture;
assert.equal(capture.requiredCaseCount, 17);
assert.equal(capture.cases.length, 17);
assert.equal(new Set(capture.cases.map((entry) => entry.id)).size, 17);
for (const captureCase of capture.cases) {
  assert.equal(captureCase.weatherOverlay, 'off');
  assert.ok(['day', 'night'].includes(captureCase.light));
  assert.ok(['low', 'high'].includes(captureCase.quality));
  assert.ok([0.25, 0.5, 1, 2].includes(captureCase.zoom));
}
for (const family of fixture.benchmark.expected.courtyardFamilies) {
  const slug = family.id === 'short_civic_court'
    ? 'short-civic'
    : family.id === 'long_green_court'
      ? 'long-green'
      : 'linked-terrace';
  const day = capture.cases.find((entry) => entry.id === `${slug}-near-day`);
  const night = capture.cases.find((entry) => entry.id === `${slug}-near-night`);
  const far = capture.cases.find((entry) => entry.id === `${slug}-far-day-high`);
  assert.ok(day && night && far, `complete capture trio for ${family.id}`);
  assert.deepEqual(day.centerGrid, family.centerGrid);
  assert.deepEqual(night.centerGrid, family.centerGrid);
  assert.deepEqual(far.centerGrid, family.centerGrid);
  assert.equal(day.zoom, 2);
  assert.equal(night.zoom, 2);
  assert.equal(far.zoom, 0.25);
  assert.equal(day.quality, 'high');
  assert.equal(night.quality, 'high');
  assert.equal(far.quality, 'high');
}
assert.ok(capture.cases.find((entry) => entry.id === 'overview-day'));
assert.ok(capture.cases.find((entry) => entry.id === 'overview-night'));
const lowOverview = capture.cases.find((entry) => entry.id === 'overview-low-day');
assert.equal(lowOverview?.zoom, 0.25);
assert.equal(lowOverview?.quality, 'low');
assert.equal(lowOverview?.light, 'day');
const fallbackCase = capture.cases.find((entry) => entry.id === 'fallback-overview-day');
assert.equal(fallbackCase?.artMode, 'environment-fallback');
assert.match(fallbackCase?.atlasFailure ?? '', /abort .*environment-worker-housing-1x\.json/);
const fallbackContract = fixture.benchmark.expected.fallbackContract;
assert.equal(fallbackContract.expectedPlanIdentity, 'unchanged');
assert.equal(fallbackContract.expectedBlankCompositionCount, 0);
assert.deepEqual(
  fallbackContract.cases.map((entry) => entry.id),
  [
    'environment-atlas-loss',
    'building-atlas-loss',
    'partial-environment-frame-loss',
  ]
);
assert.deepEqual(
  fallbackContract.cases.map((entry) => entry.request),
  [
    'assets/art/atlases/environment-worker-housing-1x.json',
    'assets/art/atlases/buildings-khrushchyovka-1x.json',
    'assets/art/atlases/environment-worker-housing-1x.json',
  ]
);
assert.equal(
  fallbackContract.cases.find((entry) => entry.id === 'partial-environment-frame-loss')?.frameId,
  'service-shelter-nw-winter-near'
);
assert.equal(
  capture.cases.find((entry) => entry.id === 'fallback-building-atlas-day')?.artMode,
  'building-fallback'
);
assert.equal(
  capture.cases.find((entry) => entry.id === 'fallback-partial-environment-frame-day')?.artMode,
  'partial-environment-fallback'
);
const mixedFamilyOverview = capture.cases.find(
  (entry) => entry.id === 'mixed-family-overview-foundation-day'
);
assert.equal(mixedFamilyOverview?.evidenceScope, 'foundation-only');
assert.equal(mixedFamilyOverview?.zoom, 0.5);
const northWestServiceCapture = capture.cases.find(
  (entry) => entry.id === 'north-west-service-edge-day'
);
assert.equal(northWestServiceCapture?.expectedComposition, 'north_west_service');
assert.deepEqual(northWestServiceCapture?.centerGrid, { gx: 8, gy: 16 });

const plannerPath = path.join(root, 'src/rendering/EnvironmentCompositionPlanner.ts');
if (fs.existsSync(plannerPath)) {
  const {
    ENVIRONMENT_COMPOSITION_CAPS,
    planEnvironmentCompositions,
  } = require('../src/rendering/EnvironmentCompositionPlanner.ts');
  assert.deepEqual(
    ENVIRONMENT_COMPOSITION_CAPS,
    fixture.benchmark.expected.environmentPlanner.qualityCaps
  );
  const definitions = manifest.environment ?? [];
  const options = {
    grid: first.grid,
    registry: first.registry,
    definitions,
    mapSeed: fixture.state.mapSeed,
  };
  const low = planEnvironmentCompositions({ ...options, quality: 'low' });
  const medium = planEnvironmentCompositions({ ...options, quality: 'medium' });
  const high = planEnvironmentCompositions({ ...options, quality: 'high' });
  const repeated = planEnvironmentCompositions({ ...options, quality: 'high' });
  const reordered = planEnvironmentCompositions({
    ...options,
    definitions: definitions.slice().reverse(),
    quality: 'high',
  });
  assert.equal(low.length, 0, 'Low quality cap disables authored environment compositions');
  assert.ok(medium.length <= ENVIRONMENT_COMPOSITION_CAPS.medium);
  assert.ok(high.length <= ENVIRONMENT_COMPOSITION_CAPS.high);
  assert.ok(high.length > 0, 'fixture must admit authored environment compositions');
  assert.deepEqual(high, repeated, 'planner output must be repeatable');
  assert.deepEqual(high, reordered, 'manifest definition order must be inert');

  const expectedOwners = new Set(
    fixture.benchmark.expected.environmentPlanner.ownerBuildingIds
  );
  const plannedFamilies = new Set();
  let northWestServiceComposition;
  const claimed = new Set();
  for (const composition of high) {
    assert.ok(expectedOwners.has(composition.ownerBuildingId), 'composition owner is in fixture contract');
    const expectedOwner = expectedKhrushchyovkas.find(
      (entry) => entry.id === composition.ownerBuildingId
    );
    assert.ok(expectedOwner);
    plannedFamilies.add(expectedOwner.familyId);
    assert.equal(composition.ownerDefId, 'khrushchyovka');
    assert.equal(composition.elevation, expectedOwner.elevation);
    const compositionDefinition = definitions.find(
      (definition) => definition.id === composition.definitionId
    );
    const compositionPlacement = compositionDefinition?.placements.find(
      (placement) => placement.id === composition.placementId
    );
    assert.ok(compositionDefinition && compositionPlacement, 'planned recipe identity exists');
    if (compositionPlacement.variantIds) {
      assert.ok(
        compositionPlacement.variantIds.includes(composition.variantId),
        `placement ${composition.placementId} permits variant ${composition.variantId}`
      );
    }
    for (const field of fixture.benchmark.expected.environmentPlanner.requiredCompositionFields) {
      assert.ok(Object.hasOwn(composition, field), `composition field ${field}`);
    }
    for (const cell of composition.claimedCells) {
      const cellKey = `${cell.gx},${cell.gy}`;
      assert.equal(claimed.has(cellKey), false, `planner claim overlap at ${cellKey}`);
      claimed.add(cellKey);
    }
    for (const part of composition.parts) {
      for (const field of fixture.benchmark.expected.environmentPlanner.requiredPartFields) {
        assert.ok(Object.hasOwn(part, field), `planned part field ${field}`);
      }
      assert.ok(Number.isInteger(part.stableId) && part.stableId >= 0);
      assert.ok(part.part.lod, 'base LOD exists');
      assert.ok(part.part.winterLod, 'winter LOD replacement exists without changing placement');
      assert.equal(
        typeof part.part.proceduralFallback,
        'string',
        'every environment part declares a procedural fallback'
      );
    }
    assert.ok(
      composition.parts.some((part) => part.part.proceduralFallback !== 'prop_none'),
      `composition owned by ${composition.ownerBuildingId} must not become a blank claim`
    );
    if (
      composition.definitionId === 'environment.worker_housing.service_edge'
      && composition.variantId === 'north_west_service'
    ) {
      northWestServiceComposition = composition;
    }
  }
  assert.deepEqual(
    [...plannedFamilies].sort(),
    ['linked_terrace_court', 'long_green_court', 'short_civic_court'],
    'planner must place at least one composition in every courtyard family'
  );
  const northWestContract = fixture.benchmark.expected.northWestServiceEdgeContract;
  assert.ok(northWestServiceComposition, 'runtime fixture must plan a north-west service edge');
  assert.equal(northWestServiceComposition.ownerBuildingId, northWestContract.ownerBuildingId);
  assert.equal(northWestServiceComposition.definitionId, northWestContract.definitionId);
  assert.equal(northWestServiceComposition.variantId, northWestContract.variantId);
  assert.equal(northWestServiceComposition.placementId, northWestContract.placementId);
  assert.deepEqual(
    [northWestServiceComposition.gx, northWestServiceComposition.gy],
    northWestContract.anchorCell
  );
  assert.equal(northWestServiceComposition.elevation, northWestContract.elevation);
  for (const [gx, gy] of northWestContract.roadEdgeCells) {
    assert.equal(
      first.registry.get(first.grid.getMasterBuilding(gx, gy)?.defId)?.isRoad,
      true,
      `north-west service edge requires the declared road cell ${gx},${gy}`
    );
  }
}

if (process.argv.includes('--check-production-bundle')) {
  const assetsDir = path.join(root, 'dist/assets');
  assert.ok(fs.existsSync(assetsDir), 'production bundle check requires npm run build');
  const bundle = fs.readdirSync(assetsDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8'))
    .join('\n');
  for (const forbidden of [
    'pack4-worker-housing-courtyards-v2',
    'pack4b-courtyard',
    'tests/fixtures/visual/pack4-worker-housing-courtyards-v2.json',
  ]) {
    assert.equal(bundle.includes(forbidden), false, `production bundle contains ${forbidden}`);
  }
  console.log('pack4b-courtyard-production-check: ok');
}

function formatFilename(captureCase) {
  return capture.filenameTemplate
    .replace('{caseId}', captureCase.id)
    .replace('{width}', String(captureCase.viewport.width))
    .replace('{height}', String(captureCase.viewport.height));
}

if (process.argv.includes('--list-captures')) {
  for (const captureCase of capture.cases) {
    console.log(JSON.stringify({
      ...captureCase,
      season: 'winter',
      filename: formatFilename(captureCase),
    }));
  }
}

const sha256 = crypto.createHash('sha256').update(raw).digest('hex');
console.log(
  `pack4b-courtyard-benchmark-check: ok (${fixture.buildings.length} buildings, `
  + `${capture.cases.length} captures, sha256 ${sha256})`
);
