#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Keep this check dependency-light: transpile the project's pure TypeScript
// modules through the already-installed compiler and execute them as CommonJS.
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

const { Grid, MAX_RENDER_ELEVATION } = require('../src/grid/Grid.ts');
const { MapGenerator } = require('../src/core/MapGenerator.ts');
const { loadGame } = require('../src/core/SaveLoad.ts');
const { BuildingPlacer } = require('../src/grid/BuildingPlacer.ts');
const { EventBus } = require('../src/core/EventBus.ts');
const {
  gridToWorld,
  getCliffFaceBandGeometry,
  getCliffFaceGeometry,
  screenToGridOnTerrain,
  depthKey,
} = require('../src/rendering/IsometricRenderer.ts');

function snapshot(grid) {
  const cells = [];
  for (let gx = 0; gx < grid.size; gx++) {
    for (let gy = 0; gy < grid.size; gy++) {
      const cell = grid.getCell(gx, gy);
      cells.push([cell.terrain, cell.elevation]);
    }
  }
  return cells;
}

const seed = 0x454c4556;
const first = new Grid(32);
const second = new Grid(32);
new MapGenerator(seed).generate(first);
new MapGenerator(seed).generate(second);
assert.deepEqual(snapshot(first), snapshot(second), 'same seed must produce identical elevation');

const center = Math.floor(first.size / 2);
let maxGeneratedElevation = 0;
let exposedSouthSteps = 0;
let generatedCliffFaces = 0;
for (let gx = 0; gx < first.size; gx++) {
  for (let gy = 0; gy < first.size; gy++) {
    const cell = first.getCell(gx, gy);
    maxGeneratedElevation = Math.max(maxGeneratedElevation, first.getElevation(gx, gy));
    if (cell.terrain === 'water') {
      assert.equal(cell.elevation, 0, `water elevation at ${gx},${gy}`);
    }

    if ((gx - center) ** 2 + (gy - center) ** 2 <= 25) {
      assert.equal(first.getElevation(gx, gy), 0, `starting zone elevation at ${gx},${gy}`);
      assert.equal(first.isBuildable(cell.terrain), true, `starting zone terrain at ${gx},${gy}`);
    }

    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const neighborElevation = first.inBounds(gx + dx, gy + dy)
        ? first.getElevation(gx + dx, gy + dy)
        : 0;
      if (first.inBounds(gx + dx, gy + dy)) {
        const delta = Math.abs(first.getElevation(gx, gy) - neighborElevation);
        assert.ok(delta <= 1, `adjacent elevation step ${delta} at ${gx},${gy}`);
      }

      const exposed = Math.max(0, first.getElevation(gx, gy) - neighborElevation);
      exposedSouthSteps += exposed;
      generatedCliffFaces += getCliffFaceGeometry(
        gx,
        gy,
        first.getElevation(gx, gy),
        neighborElevation,
        dx === 1 ? 'gx' : 'gy'
      ).length;
    }
  }
}
assert.ok(maxGeneratedElevation > 0, 'fixture seed must exercise visible generated elevation');
assert.ok(exposedSouthSteps > 0, 'fixture seed must expose at least one south-facing elevation step');
assert.equal(generatedCliffFaces, exposedSouthSteps, 'every exposed south-facing step must create a face');

assert.equal(getCliffFaceGeometry(3, 4, 1, 1, 'gx').length, 0, 'level neighbors need no face');
for (const direction of ['gx', 'gy']) {
  const tiers = getCliffFaceGeometry(3, 4, 3, 0, direction);
  assert.equal(tiers.length, 3, `${direction} must create one quad per elevation step`);
  for (const tier of tiers) {
    assert.equal(tier.points.length, 4, `${direction} tier must be a closed quad`);
    const ys = tier.points.map((point) => point.y);
    assert.ok(Math.max(...ys) > Math.min(...ys), `${direction} tier must have visible height`);

    const tonalBand = getCliffFaceBandGeometry(tier.points, 0.40, 0.57);
    const baseShadowBand = getCliffFaceBandGeometry(tier.points, 0.82, 1);
    assert.equal(tonalBand.length, 4, `${direction} tonal treatment must remain a quad`);
    assert.equal(baseShadowBand.length, 4, `${direction} base shadow must remain a quad`);
    assert.ok(
      Math.min(...tonalBand.map((point) => point.y)) >= Math.min(...ys),
      `${direction} tonal band must stay inside its face`
    );
    assert.ok(
      Math.max(...baseShadowBand.map((point) => point.y)) <= Math.max(...ys),
      `${direction} base shadow must stay inside its face`
    );
  }
}
assert.equal(
  getCliffFaceBandGeometry([{ x: 0, y: 0 }], 0.4, 0.6).length,
  0,
  'material treatment must reject malformed face geometry safely'
);

const placement = new Grid(6);
placement.getCell(2, 2).elevation = 1;
assert.equal(
  placement.getPlacementRejection(1, 2, 2, 1),
  'Ground must be level',
  'new multi-tile construction must reject uneven ground with the exact reason'
);
assert.equal(
  placement.canRestoreFootprint(1, 2, 2, 1),
  true,
  'legacy uneven multi-tile footprints must remain restorable'
);

const legacySave = JSON.stringify({
  version: 4,
  state: {},
  buildings: [{ defId: 'legacy_2x1', gx: 1, gy: 2, id: 41 }],
  nextBuildingId: 42,
  terrainCells: [{ gx: 2, gy: 2, terrain: 'ground', elevation: 1 }],
  zoneCells: [],
});
global.localStorage = {
  getItem: (key) => key === 'gosplan_save' ? legacySave : null,
  setItem: () => {},
};
const restoredGrid = new Grid(6);
const legacyRegistry = {
  get: (id) => id === 'legacy_2x1' ? { id, width: 2, height: 1 } : undefined,
};
const restoredPlacer = new BuildingPlacer(restoredGrid, legacyRegistry, new EventBus());
const restoredState = loadGame(
  restoredGrid,
  legacyRegistry,
  restoredPlacer
);
assert.ok(restoredState, 'v4 archive must load');
assert.equal(restoredPlacer.getNextId(), 42, 'save next ID must survive compatibility restore');
assert.equal(restoredGrid.getAllBuildings().length, 1, 'uneven legacy building must not be dropped');
assert.equal(restoredGrid.getMasterBuilding(2, 2)?.id, 41, 'legacy footprint must be reconstructed');

const safety = new Grid(4);
safety.getCell(0, 0).elevation = Number.NaN;
safety.getCell(1, 0).elevation = Number.POSITIVE_INFINITY;
safety.getCell(2, 0).elevation = 999;
safety.getCell(3, 0).terrain = 'water';
safety.getCell(3, 0).elevation = 5;
assert.equal(safety.getElevation(0, 0), 0);
assert.equal(safety.getElevation(1, 0), 0);
assert.equal(safety.getElevation(2, 0), MAX_RENDER_ELEVATION);
assert.equal(safety.getElevation(3, 0), 0);

const picking = new Grid(10);
picking.getCell(5, 6).elevation = 2;
const elevatedCenter = gridToWorld(5, 6, 2);
const camera = { x: 173, y: 91, zoom: 1.5 };
const picked = screenToGridOnTerrain(
  elevatedCenter.x * camera.zoom + camera.x,
  elevatedCenter.y * camera.zoom + camera.y,
  camera.x,
  camera.y,
  camera.zoom,
  picking
);
assert.deepEqual(picked, { gx: 5, gy: 6 }, 'pointer must pick the visible elevated diamond');
assert.ok(depthKey(5, 6, 2) < depthKey(5, 6, 1), 'depth must follow visible projected baseline');

console.log('elevation-foundation-check: ok');
