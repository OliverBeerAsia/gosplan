#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SVG_PATH = path.join(ROOT, 'public/assets/art/atlases/buildings-khrushchyovka-1x.svg');
const FRAMES_PATH = path.join(ROOT, 'public/assets/art/atlases/buildings-khrushchyovka-1x.json');
const MANIFEST_PATH = path.join(ROOT, 'public/assets/art/manifest.v1.json');
const ATLAS_ID = 'buildings.khrushchyovka_1x';
const VARIANTS = ['short', 'long', 'linked'];
const LODS = ['far', 'mid', 'near'];

function gridPoints(xs, ys) {
  return ys.flatMap((y) => xs.map((x) => [x, y]));
}

// These points are frame-local coordinates after the reviewed SVG transforms,
// not pre-transform drawing coordinates. Entrance points sit on visible door
// pixels, queue points sit immediately below the thresholds, and window points
// sit inside the dark near-LOD panes.
const ANCHOR_CONTRACT = {
  short_slab: {
    entrances: [[52, 144], [77, 153]],
    queueAnchors: [[52, 147], [77, 155]],
    windowAnchors: gridPoints([45, 56, 72, 84], [102, 109, 117, 124, 132]),
  },
  long_slab: {
    entrances: [[40, 140], [61, 147], [83, 154]],
    queueAnchors: [[40, 144], [61, 151], [83, 158]],
    windowAnchors: gridPoints([32, 44, 56, 68, 80, 91], [93, 102, 111, 120, 129]),
  },
  linked_return: {
    entrances: [[44, 137], [70, 145]],
    queueAnchors: [[44, 142], [70, 150]],
    windowAnchors: gridPoints([32, 45, 60, 73], [101, 109, 117, 124, 132]),
  },
};

function fail(message) {
  console.error(`khrushchyovka-atlas-check: ${message}`);
  process.exitCode = 1;
}

const svg = fs.readFileSync(SVG_PATH, 'utf8');
const framesFile = JSON.parse(fs.readFileSync(FRAMES_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

if (!/<svg\b[^>]*\bwidth="480"[^>]*\bheight="528"/i.test(svg)) {
  fail('SVG must declare the fixed 480x528 atlas canvas');
}
if (!/<svg\b[^>]*\bshape-rendering="crispEdges"/i.test(svg)) {
  fail('SVG must opt into crispEdges pixel rendering');
}
if (/<(?:text|image|foreignObject)\b/i.test(svg) || /\burl\s*\(/i.test(svg)) {
  fail('SVG must remain code-native geometry with no text, linked images, or external paint');
}

const massTransforms = [...svg.matchAll(
  /<g transform="translate\((\d+) (\d+)\) translate\(80 160\) scale\(([0-9.]+) ([0-9.]+)\) translate\(-80 -160\)">/g,
)].map((match) => ({
  x: Number(match[1]),
  y: Number(match[2]),
  scaleX: Number(match[3]),
  scaleY: Number(match[4]),
}));
if (massTransforms.length !== 9) {
  fail('all nine frames must retain the reviewed base-preserving low-slab transform');
} else {
  for (const transform of massTransforms) {
    const expectedScaleX = transform.x === 0 ? 1.05 : transform.x === 160 ? 1.10 : 1.08;
    const expectedScaleY = transform.x === 0 ? 0.64 : 0.70;
    if (transform.scaleX !== expectedScaleX || transform.scaleY !== expectedScaleY) {
      fail(`frame at ${transform.x},${transform.y} has regressed from the reviewed horizontal massing`);
    }
  }
}

const expectedFrames = new Map();
for (const [row, lod] of LODS.entries()) {
  for (const [column, variant] of VARIANTS.entries()) {
    expectedFrames.set(`${variant}-${lod}`, {
      x: column * 160,
      y: row * 176,
      w: 160,
      h: 176,
    });
  }
}

const frames = framesFile.frames ?? {};
if (framesFile.image !== 'buildings-khrushchyovka-1x.svg') {
  fail('frames file must point to the colocated production SVG');
}
if (Object.keys(frames).length !== expectedFrames.size) {
  fail(`frames file must contain exactly ${expectedFrames.size} frames`);
}
for (const [id, expected] of expectedFrames) {
  if (JSON.stringify(frames[id]) !== JSON.stringify(expected)) {
    fail(`frame ${id} must be the untrimmed ${expected.w}x${expected.h} cell at ${expected.x},${expected.y}`);
  }
}

const atlas = manifest.atlases.find((entry) => entry.id === ATLAS_ID);
if (!atlas) {
  fail(`manifest is missing atlas ${ATLAS_ID}`);
} else if (
  atlas.image !== 'assets/art/atlases/buildings-khrushchyovka-1x.svg'
  || atlas.framesFile !== 'assets/art/atlases/buildings-khrushchyovka-1x.json'
  || atlas.pixelRatio !== 1
) {
  fail('manifest atlas registration does not match the production 1x files');
}

const building = manifest.buildings.find((entry) => entry.buildingId === 'khrushchyovka');
if (!building) {
  fail('manifest is missing the Khrushchyovka building definition');
} else {
  if (JSON.stringify(building.footprint) !== '[2,1]') fail('gameplay footprint must remain 2x1');
  if (JSON.stringify(building.anchor) !== '[80,168]') fail('every untrimmed frame must use anchor [80,168]');
  if (building.proceduralFallback !== 'khrushchyovka') fail('procedural recovery fallback must remain declared');
  if (building.variants.length !== VARIANTS.length) fail('manifest must expose exactly three authored masses');
  for (const field of ['entrances', 'queueAnchors', 'windowAnchors']) {
    if (building[field] !== undefined) {
      fail(`${field} must be owned by each physical variant, not the shared building definition`);
    }
  }

  for (const variant of building.variants) {
    const prefix = variant.id === 'linked_return'
      ? 'linked'
      : variant.id === 'long_slab'
        ? 'long'
        : variant.id === 'short_slab'
          ? 'short'
          : undefined;
    if (!prefix) {
      fail(`unexpected authored variant ${variant.id}`);
      continue;
    }
    for (const lod of LODS) {
      const expected = `${ATLAS_ID}:${prefix}-${lod}`;
      if (variant.lod?.[lod] !== expected) fail(`${variant.id}.${lod} must reference ${expected}`);
    }
    if (variant.frame !== `${ATLAS_ID}:${prefix}-near`) {
      fail(`${variant.id} backward-compatible frame must use its near LOD`);
    }
    const anchorContract = ANCHOR_CONTRACT[variant.id];
    for (const field of ['entrances', 'queueAnchors', 'windowAnchors']) {
      if (JSON.stringify(variant[field]) !== JSON.stringify(anchorContract?.[field])) {
        fail(`${variant.id}.${field} must match the reviewed post-transform visible-pixel contract`);
      }
      for (const point of variant[field] ?? []) {
        if (
          !Array.isArray(point)
          || point.length !== 2
          || !point.every(Number.isFinite)
          || point[0] < 0
          || point[0] > 160
          || point[1] < 0
          || point[1] > 176
        ) {
          fail(`${variant.id}.${field} contains a point outside the 160x176 frame`);
        }
      }
    }
  }
}

if (!process.exitCode) {
  console.log('khrushchyovka-atlas-check: ok (3 masses x 3 LODs, fixed anchor, variant doors/queues/windows, procedural fallback)');
}
