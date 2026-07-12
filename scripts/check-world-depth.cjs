#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require('./install-node-browser-globals.cjs');

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
  WorldDepthPhase,
  footprintDepth,
  movingDepth,
  tileDepth,
} = require('../src/rendering/WorldDepth.ts');
const { gridToWorld } = require('../src/rendering/IsometricRenderer.ts');

function seededShuffle(values, seed) {
  const result = [...values];
  let state = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function main() {
  const gx = 8;
  const gy = 9;

  // Projection changes with elevation, painter order does not.
  assert.notEqual(gridToWorld(gx, gy, 0).y, gridToWorld(gx, gy, 8).y);
  const elevationZeroDepth = tileDepth(gx, gy, WorldDepthPhase.TERRAIN);
  const elevationEightDepth = tileDepth(gx, gy, WorldDepthPhase.TERRAIN);
  assert.equal(elevationZeroDepth, elevationEightDepth, 'ground depth must be elevation-invariant');

  const phases = [
    WorldDepthPhase.CLIFF,
    WorldDepthPhase.TERRAIN,
    WorldDepthPhase.TERRAIN_EDGE,
    WorldDepthPhase.TERRAIN_DECAL,
    WorldDepthPhase.ZONE,
    WorldDepthPhase.SURFACE_INFRASTRUCTURE,
    WorldDepthPhase.PROP,
    WorldDepthPhase.STRUCTURE,
    WorldDepthPhase.VEHICLE,
    WorldDepthPhase.BUILDING_EFFECT,
  ].map((phase) => tileDepth(gx, gy, phase));
  for (let i = 1; i < phases.length; i++) {
    assert.ok(phases[i - 1] < phases[i], `phase ${i - 1} must precede phase ${i}`);
  }

  const behindBuilding = footprintDepth(8, 8, 1, 1, WorldDepthPhase.STRUCTURE, 41);
  const raisedForeground = tileDepth(9, 9, WorldDepthPhase.TERRAIN);
  assert.ok(
    behindBuilding < raisedForeground,
    'raised foreground terrain must render after a flat building behind it'
  );

  const cliff = tileDepth(9, 9, WorldDepthPhase.CLIFF);
  const sourceTop = tileDepth(9, 9, WorldDepthPhase.TERRAIN);
  const cameraFacingNeighbor = tileDepth(10, 9, WorldDepthPhase.TERRAIN);
  assert.ok(cliff < sourceTop, 'a cliff face must precede its source tile top');
  assert.ok(sourceTop < cameraFacingNeighbor, 'the lower foreground neighbor must mask the cliff bottom');

  const footprint = footprintDepth(3, 4, 3, 2, WorldDepthPhase.STRUCTURE, 77);
  const nearestCell = tileDepth(5, 5, WorldDepthPhase.STRUCTURE, 77);
  assert.equal(footprint, nearestCell, 'multi-tile depth must use the nearest footprint cell');

  const from = tileDepth(2, 3, WorldDepthPhase.VEHICLE, 12);
  const halfway = movingDepth(2, 3, 3, 3, 0.5, WorldDepthPhase.VEHICLE, 12);
  const to = tileDepth(3, 3, WorldDepthPhase.VEHICLE, 12);
  assert.equal(movingDepth(2, 3, 3, 3, 0, WorldDepthPhase.VEHICLE, 12), from);
  assert.equal(movingDepth(2, 3, 3, 3, 1, WorldDepthPhase.VEHICLE, 12), to);
  assert.ok(from < halfway && halfway < to, 'traffic depth must interpolate continuously');

  const fixtures = [
    { id: 'behind-building', depth: behindBuilding },
    { id: 'foreground-cliff', depth: cliff },
    { id: 'foreground-top', depth: sourceTop },
    { id: 'foreground-neighbor', depth: cameraFacingNeighbor },
    { id: 'same-tile-prop', depth: tileDepth(9, 9, WorldDepthPhase.PROP, 2) },
    { id: 'same-tile-effect', depth: tileDepth(9, 9, WorldDepthPhase.BUILDING_EFFECT, 3) },
  ];
  const canonical = [...fixtures]
    .sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id))
    .map((entry) => entry.id);
  for (let seed = 1; seed <= 100; seed++) {
    const sorted = seededShuffle(fixtures, seed)
      .sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id))
      .map((entry) => entry.id);
    assert.deepEqual(sorted, canonical, `insertion order must not affect depth order for seed ${seed}`);
  }

  // Pixi's RenderLayer preserves logical ownership, sorts across owners, and
  // automatically detaches children removed from their logical parent.
  const { Container, RenderLayer } = await import('pixi.js');
  const ownerA = new Container();
  const ownerB = new Container();
  const back = new Container();
  const front = new Container();
  back.label = 'back';
  front.label = 'front';
  back.zIndex = behindBuilding;
  front.zIndex = raisedForeground;
  ownerA.addChild(front);
  ownerB.addChild(back);

  const layer = new RenderLayer({ sortableChildren: false });
  layer.attach(front, back);
  layer.sortRenderLayerChildren();
  assert.deepEqual(layer.renderLayerChildren.map((child) => child.label), ['back', 'front']);

  ownerB.removeChild(back);
  assert.equal(layer.renderLayerChildren.includes(back), false, 'logical removal must detach from layer');
  ownerB.addChild(back);
  layer.attach(back);
  assert.equal(layer.renderLayerChildren.includes(back), true, 'pooled nodes must be reattached after re-add');

  console.log('world-depth-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
