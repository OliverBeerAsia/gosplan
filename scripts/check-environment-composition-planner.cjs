#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const PLANNER_PATH = path.join(ROOT, 'src/rendering/EnvironmentCompositionPlanner.ts');
const RENDERER_PATH = path.join(ROOT, 'src/rendering/EnvironmentPropRenderer.ts');

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

const {
  ENVIRONMENT_COMPOSITION_CAPS,
  ENVIRONMENT_MIN_ANCHOR_SPACING,
  ENVIRONMENT_SAME_FAMILY_MIN_ANCHOR_SPACING,
  EnvironmentCompositionInvalidationQueue,
  planEnvironmentCompositions,
  stableEnvironmentHash,
} = require(PLANNER_PATH);

class StubGrid {
  constructor(size, buildings = []) {
    this.size = size;
    this.buildings = buildings;
    this.cells = new Map();
    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        this.cells.set(`${gx},${gy}`, {
          gx,
          gy,
          terrain: 'ground',
          zone: 'none',
          building: null,
          elevation: 0,
        });
      }
    }
    for (const building of buildings) {
      const cell = this.getCell(building.gx, building.gy);
      if (cell) cell.building = building;
    }
  }

  inBounds(gx, gy) {
    return gx >= 0 && gy >= 0 && gx < this.size && gy < this.size;
  }

  getCell(gx, gy) {
    return this.cells.get(`${gx},${gy}`) ?? null;
  }

  isBuildable(terrain) {
    return terrain === 'ground' || terrain === 'dirt';
  }

  getElevation(gx, gy) {
    return this.getCell(gx, gy)?.elevation ?? 0;
  }

  getAllBuildings() {
    return [...this.buildings];
  }

  getMasterBuilding(gx, gy) {
    return this.getCell(gx, gy)?.building ?? null;
  }
}

const registry = {
  get(id) {
    if (id === 'road') return { id, isRoad: true };
    if (id === 'khrushchyovka') {
      return { id, isRoad: false, category: 'residential', width: 2, height: 1 };
    }
    if (id.startsWith('housing_')) {
      return { id, isRoad: false, category: 'residential', width: 1, height: 1 };
    }
    return { id, isRoad: false, category: 'decoration', width: 1, height: 1 };
  },
};

function lod(prefix) {
  return {
    far: `test:${prefix}-far`,
    mid: `test:${prefix}-mid`,
    near: `test:${prefix}-near`,
  };
}

function part(id, offset = [0, 0]) {
  return {
    id,
    offset,
    layer: 'prop',
    anchor: [32, 72],
    lod: lod(id),
    winterLod: lod(`${id}-winter`),
    proceduralFallback: 'prop_bench',
  };
}

function definition(overrides = {}) {
  return {
    id: 'environment.test.courtyard',
    ownerBuildingIds: ['khrushchyovka'],
    footprint: [2, 1],
    placements: [
      { id: 'east', offset: [2, 0], variantIds: ['east_variant'] },
      { id: 'south', offset: [0, 2], variantIds: ['south_variant'] },
    ],
    variants: [
      { id: 'south_variant', weight: 1, parts: [part('south-main'), part('south-detail', [1, 0])] },
      { id: 'east_variant', weight: 1, parts: [part('east-main'), part('east-detail', [1, 0])] },
    ],
    powerSource: 'owner',
    ...overrides,
  };
}

function canonical(plan) {
  return plan.map((composition) => ({
    definitionId: composition.definitionId,
    variantId: composition.variantId,
    placementId: composition.placementId,
    ownerBuildingId: composition.ownerBuildingId,
    gx: composition.gx,
    gy: composition.gy,
    elevation: composition.elevation,
    claimedCells: composition.claimedCells,
    parts: composition.parts.map((planned) => ({
      partId: planned.partId,
      gx: planned.gx,
      gy: planned.gy,
      elevation: planned.elevation,
      stableId: planned.stableId,
    })),
  }));
}

function plan(grid, definitions, quality = 'high', mapSeed = 0x12345678) {
  return planEnvironmentCompositions({ grid, registry, definitions, quality, mapSeed });
}

function main() {
  assert.deepEqual(ENVIRONMENT_COMPOSITION_CAPS, { low: 0, medium: 12, high: 24 });
  assert.equal(ENVIRONMENT_MIN_ANCHOR_SPACING, 4);
  assert.equal(ENVIRONMENT_SAME_FAMILY_MIN_ANCHOR_SPACING, 8);

  const invalidations = new EnvironmentCompositionInvalidationQueue();
  invalidations.invalidate(5, 4);
  invalidations.invalidate(2, 9);
  invalidations.invalidate(5, 4);
  invalidations.invalidate(2, 3);
  let rebuildCount = 0;
  let rebuiltCells = [];
  assert.equal(invalidations.flush((cells) => {
    rebuildCount++;
    rebuiltCells = cells;
  }), true);
  assert.deepEqual(
    rebuiltCells,
    [{ gx: 2, gy: 3 }, { gx: 2, gy: 9 }, { gx: 5, gy: 4 }],
    'one frame coalesces duplicate zone cells into deterministic grid order',
  );
  assert.equal(rebuildCount, 1, 'one invalidation burst requests exactly one rebuild');
  assert.equal(invalidations.flush(() => rebuildCount++), false);
  assert.equal(rebuildCount, 1, 'an empty frame does not request another rebuild');
  invalidations.invalidate(1, 7);
  assert.equal(invalidations.flush((cells) => {
    rebuildCount++;
    rebuiltCells = cells;
  }), true);
  assert.deepEqual(rebuiltCells, [{ gx: 1, gy: 7 }]);
  assert.equal(rebuildCount, 2, 'edits after a flush request one next-frame rebuild');

  const owners = [
    { id: 12, defId: 'khrushchyovka', gx: 4, gy: 4, powered: true },
    { id: 8, defId: 'khrushchyovka', gx: 12, gy: 12, powered: true },
  ];
  const firstGrid = new StubGrid(24, owners);
  const firstDefinition = definition();
  const first = plan(firstGrid, [firstDefinition]);
  assert.equal(first.length, 2);
  assert.ok(first.every((composition) => composition.parts.length === 2));
  assert.ok(first.every((composition) => (
    composition.placementId === 'east'
      ? composition.variantId === 'east_variant'
      : composition.variantId === 'south_variant'
  )), 'placement-specific variants must preserve orientation');

  const reversedGrid = new StubGrid(24, owners.slice().reverse());
  const reordered = definition({
    placements: firstDefinition.placements.slice().reverse(),
    variants: firstDefinition.variants.slice().reverse(),
  });
  assert.deepEqual(
    canonical(plan(reversedGrid, [reordered])),
    canonical(first),
    'building, placement, and variant order must not affect the plan',
  );

  const ownerIdentity = owners[0];
  assert.equal(
    stableEnvironmentHash(77, ownerIdentity, 'courtyard'),
    stableEnvironmentHash(77, { ...ownerIdentity }, 'courtyard'),
  );
  assert.notEqual(
    stableEnvironmentHash(77, ownerIdentity, 'courtyard'),
    stableEnvironmentHash(78, ownerIdentity, 'courtyard'),
  );

  const blockedGrid = new StubGrid(16, [owners[0]]);
  for (const placement of firstDefinition.placements) {
    const gx = owners[0].gx + placement.offset[0];
    const gy = owners[0].gy + placement.offset[1];
    blockedGrid.getCell(gx, gy).elevation = 1;
  }
  assert.deepEqual(plan(blockedGrid, [firstDefinition]), [], 'composition may not cross elevation');

  const roadOwner = { id: 91, defId: 'khrushchyovka', gx: 4, gy: 4, powered: true };
  const road = { id: 92, defId: 'road', gx: 8, gy: 4, powered: true };
  const service = definition({
    id: 'environment.test.service',
    footprint: [1, 1],
    placements: [{ id: 'road_edge', offset: [2, 0], requiresRoadWithin: 2 }],
    variants: [{ id: 'service', weight: 1, parts: [part('service')] }],
  });
  assert.equal(plan(new StubGrid(16, [roadOwner, road]), [service]).length, 1);
  assert.equal(plan(new StubGrid(16, [roadOwner]), [service]).length, 0);

  const exactNorthEastService = definition({
    id: 'environment.test.service.ne',
    footprint: [2, 1],
    placements: [{
      id: 'north_east_edge',
      offset: [2, 0],
      roadEdge: 'north_east',
      requiresRoadWithin: 3,
      variantIds: ['north_east_service'],
    }],
    variants: [{ id: 'north_east_service', weight: 1, parts: [part('service-ne')] }],
  });
  const northEastRoads = [
    { id: 93, defId: 'road', gx: 6, gy: 3, powered: true },
    { id: 94, defId: 'road', gx: 7, gy: 3, powered: true },
  ];
  const northEastPlan = plan(
    new StubGrid(16, [roadOwner, ...northEastRoads]),
    [exactNorthEastService],
  );
  assert.equal(northEastPlan.length, 1);
  assert.equal(northEastPlan[0].variantId, 'north_east_service');
  assert.equal(
    plan(new StubGrid(16, [roadOwner, northEastRoads[0]]), [exactNorthEastService]).length,
    0,
    'every cell on the declared north-east edge requires a road',
  );
  const wrongSideRoad = { id: 95, defId: 'road', gx: 8, gy: 4, powered: true };
  assert.equal(
    plan(new StubGrid(16, [roadOwner, wrongSideRoad]), [exactNorthEastService]).length,
    0,
    'roadEdge takes precedence over any-side requiresRoadWithin fallback',
  );
  const raisedRoadGrid = new StubGrid(16, [roadOwner, ...northEastRoads]);
  raisedRoadGrid.getCell(7, 3).elevation = 1;
  assert.equal(
    plan(raisedRoadGrid, [exactNorthEastService]).length,
    0,
    'declared road edge must remain on the composition elevation',
  );

  const exactNorthWestService = definition({
    id: 'environment.test.service.nw',
    footprint: [2, 1],
    placements: [{
      id: 'north_west_edge',
      offset: [0, 2],
      roadEdge: 'north_west',
      variantIds: ['north_west_service'],
    }],
    variants: [{ id: 'north_west_service', weight: 1, parts: [part('service-nw')] }],
  });
  const northWestRoad = { id: 96, defId: 'road', gx: 3, gy: 6, powered: true };
  const northWestPlan = plan(
    new StubGrid(16, [roadOwner, northWestRoad]),
    [exactNorthWestService],
  );
  assert.equal(northWestPlan.length, 1);
  assert.equal(northWestPlan[0].variantId, 'north_west_service');

  const compact = definition({
    footprint: [1, 1],
    placements: [{ id: 'east', offset: [2, 0] }],
    variants: [{ id: 'compact', weight: 1, parts: [part('compact')] }],
  });
  const spacedOwners = [
    { id: 1, defId: 'khrushchyovka', gx: 2, gy: 2, powered: true },
    { id: 2, defId: 'khrushchyovka', gx: 7, gy: 2, powered: true },
    { id: 3, defId: 'khrushchyovka', gx: 10, gy: 2, powered: true },
  ];
  const spacedPlan = plan(new StubGrid(24, spacedOwners), [compact]);
  assert.deepEqual(
    spacedPlan.map((composition) => composition.ownerBuildingId),
    [1, 3],
    'same-family compositions require eight Manhattan anchor cells',
  );

  const familyOwners = [
    { id: 1, defId: 'housing_a', gx: 2, gy: 10, powered: true },
    { id: 2, defId: 'housing_b', gx: 6, gy: 10, powered: true },
    { id: 3, defId: 'housing_c', gx: 10, gy: 10, powered: true },
  ];
  const families = familyOwners.map((owner, index) => definition({
    id: `environment.test.family_${index}`,
    ownerBuildingIds: [owner.defId],
    footprint: [1, 1],
    placements: [{ id: 'east', offset: [2, 0] }],
    variants: [{ id: `family_${index}`, weight: 1, parts: [part(`family-${index}`)] }],
  }));
  const familyPlan = plan(new StubGrid(24, familyOwners), families);
  assert.deepEqual(
    new Set(familyPlan.map((composition) => composition.definitionId)),
    new Set(families.map((entry) => entry.id)),
    'three families survive when their anchors meet general spacing',
  );

  for (const zone of ['housing', 'industry', 'civic', 'green']) {
    const zonedGrid = new StubGrid(16, [roadOwner]);
    zonedGrid.getCell(6, 4).zone = zone;
    assert.equal(
      plan(zonedGrid, [compact]).length,
      0,
      `${zone} cells cannot be claimed by authored compositions`,
    );
  }

  const entranceBlocker = {
    id: 97,
    defId: 'housing_blocker',
    gx: 6,
    gy: 3,
    powered: true,
  };
  assert.equal(
    plan(new StubGrid(16, [roadOwner, entranceBlocker]), [compact]).length,
    0,
    'direct +gy residential entrance approaches remain clear',
  );

  const manyOwners = [];
  for (let index = 0; index < 30; index++) {
    manyOwners.push({
      id: index + 1,
      defId: 'khrushchyovka',
      gx: 2 + index * 8,
      gy: 2,
      powered: true,
    });
  }
  const capGrid = new StubGrid(256, manyOwners);
  assert.equal(plan(capGrid, [compact], 'low').length, 0);
  assert.equal(plan(capGrid, [compact], 'medium').length, 12);
  assert.equal(plan(capGrid, [compact], 'high').length, 24);

  const highPlan = plan(capGrid, [compact], 'high');
  const claimKeys = highPlan.flatMap((composition) => (
    composition.claimedCells.map((cell) => `${cell.gx},${cell.gy}`)
  ));
  assert.equal(new Set(claimKeys).size, claimKeys.length, 'composition claims may not overlap');

  const source = fs.readFileSync(PLANNER_PATH, 'utf8');
  assert.doesNotMatch(source, /Math\.random\s*\(/);
  assert.doesNotMatch(source, /\b(?:rngState|simulationRng)\b/);
  const rendererSource = fs.readFileSync(RENDERER_PATH, 'utf8');
  assert.match(
    rendererSource,
    /events\.on\('zone:changed',[\s\S]*?pendingZoneChanges\.invalidate\(gx, gy\)\)/,
    'zone changes must enter the frame-bounded invalidation queue',
  );
  assert.doesNotMatch(
    rendererSource,
    /events\.on\('zone:changed',[^;]*?updateAll\(\)/,
    'zone changes must not rebuild the full environment once per changed cell',
  );
  assert.match(
    rendererSource,
    /flushPendingUpdates\(\): void[\s\S]*?pendingZoneChanges\.flush\(/,
    'the renderer must expose a frame flush for queued zone changes',
  );
  const gameSource = fs.readFileSync(path.join(ROOT, 'src/core/Game.ts'), 'utf8');
  assert.match(
    gameSource,
    /private update\(\): void[\s\S]*?propRenderer\.flushPendingUpdates\(\)/,
    'the game ticker must flush zone edits even while simulation time is paused',
  );
  console.log('environment-composition-planner-check: ok');
}

main();
