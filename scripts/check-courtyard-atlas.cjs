#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SVG_PATH = path.join(ROOT, 'public/assets/art/atlases/environment-worker-housing-1x.svg');
const FRAMES_PATH = path.join(ROOT, 'public/assets/art/atlases/environment-worker-housing-1x.json');
const MANIFEST_PATH = path.join(ROOT, 'public/assets/art/manifest.v1.json');
const ATLAS_ID = 'environment.worker_housing_1x';
const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 80;
const LODS = ['far', 'mid', 'near'];
const SEASONS = ['base', 'winter'];
const PART_TYPES = [
  'walkway',
  'play-frame',
  'sandpit',
  'bench-tree',
  'bench',
  'laundry-lines',
  'washing-post',
  'service-shelter-ne',
  'service-kiosk-ne',
  'service-shelter-nw',
  'service-kiosk-nw',
];
const PALETTE = new Set([
  '#263D49', '#303331', '#4A4F4B', '#53788A', '#6E503B', '#727970',
  '#7A7D76', '#8A6748', '#8B4A3A', '#969C93', '#A7AEAA', '#B66A4C',
  '#C6CFD1', '#D5D5CB', '#ECEBE3',
]);
const OWNER_IDS = ['khrushchyovka', 'panelak', 'kommunalka', 'stalinka'];
const FALLBACKS = new Set([
  'prop_none', 'prop_lamp', 'prop_fence', 'prop_kiosk', 'prop_courtyard',
  'prop_pole', 'prop_bus_stop', 'prop_statue', 'prop_bench',
  'prop_flowerbed', 'prop_flagpole',
]);

function fail(message) {
  console.error(`courtyard-atlas-check: ${message}`);
  process.exitCode = 1;
}

function isPoint(value) {
  return Array.isArray(value)
    && value.length === 2
    && value.every((coordinate) => Number.isInteger(coordinate));
}

function assertLod(part, field, partType, season, frameNames) {
  const lod = part[field];
  if (!lod || Object.keys(lod).sort().join(',') !== 'far,mid,near') {
    fail(`${part.id}.${field} must define far, mid, and near`);
    return;
  }
  for (const level of LODS) {
    const expected = `${ATLAS_ID}:${partType}-${season}-${level}`;
    if (lod[level] !== expected) fail(`${part.id}.${field}.${level} must be ${expected}`);
    frameNames.add(lod[level]);
  }
}

const svg = fs.readFileSync(SVG_PATH, 'utf8');
const framesFile = JSON.parse(fs.readFileSync(FRAMES_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

if (!/<svg\b[^>]*\bwidth="384"[^>]*\bheight="880"/i.test(svg)) {
  fail('SVG must declare the fixed 384x880 atlas canvas');
}
if (!/<svg\b[^>]*\bshape-rendering="crispEdges"/i.test(svg)) {
  fail('SVG must opt into crispEdges pixel rendering');
}
if (/<(?:text|image|foreignObject|linearGradient|radialGradient|filter|pattern)\b/i.test(svg)) {
  fail('SVG must remain code-native geometry without text, raster, gradients, filters, or patterns');
}
if (/\b(?:fill|stroke)="url\s*\(/i.test(svg)) {
  fail('SVG paint must not reference linked content');
}
for (const href of svg.matchAll(/\bhref="([^"]+)"/g)) {
  if (!href[1].startsWith('#')) fail(`SVG use reference must remain internal: ${href[1]}`);
}
for (const colour of svg.matchAll(/#[0-9A-Fa-f]{6}/g)) {
  const canonical = colour[0].toUpperCase();
  if (!PALETTE.has(canonical)) fail(`unreviewed palette colour ${colour[0]}`);
}
if (/\d+\.\d+/.test(svg)) fail('SVG geometry must use integer coordinates and widths');

const scaledPropViewports = svg.match(
  /<svg x="12" y="27" width="40" height="50" viewBox="0 0 64 80">/g,
) ?? [];
if (scaledPropViewports.length !== (PART_TYPES.length - 1) * SEASONS.length * LODS.length) {
  fail('every upright base/winter/LOD frame must use the reviewed five-eighths contact-preserving viewport');
}
if ((svg.match(/class="service-bin"/g) ?? []).length !== 12) {
  fail('every NE/NW refuse shelter LOD must contain two dark domestic-service bins');
}

const walkwaySection = svg.slice(svg.indexOf('<g id="walkway-far">'), svg.indexOf('<g id="play-frame-far">'));
if (!walkwaySection.includes('#6E503B') || !walkwaySection.includes('#7A7D76')) {
  fail('walkway must retain its muted gray-brown worn-path materials');
}
if (/#(?:ECEBE3|C6CFD1)/i.test(walkwaySection)) {
  fail('walkway base art must not regress to a raised bright rail');
}
const snowWalkwaySection = svg.slice(svg.indexOf('<g id="snow-walkway">'), svg.indexOf('<g id="snow-play-frame">'));
if ((snowWalkwaySection.match(/<rect /g) ?? []).length < 4) {
  fail('winter walkway must retain irregular paired footprints between snow breaks');
}

const definitionIds = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
for (const href of svg.matchAll(/\bhref="#([^"]+)"/g)) {
  if (!definitionIds.has(href[1])) fail(`SVG references missing internal definition ${href[1]}`);
}

const expectedFrames = new Map();
for (const [row, partType] of PART_TYPES.entries()) {
  for (const [seasonIndex, season] of SEASONS.entries()) {
    for (const [lodIndex, lod] of LODS.entries()) {
      const column = seasonIndex * LODS.length + lodIndex;
      expectedFrames.set(`${partType}-${season}-${lod}`, {
        x: column * FRAME_WIDTH,
        y: row * FRAME_HEIGHT,
        w: FRAME_WIDTH,
        h: FRAME_HEIGHT,
      });
    }
  }
}

const frames = framesFile.frames ?? {};
if (framesFile.image !== 'environment-worker-housing-1x.svg') {
  fail('frames file must point to the colocated production SVG');
}
if (Object.keys(frames).length !== expectedFrames.size) {
  fail(`frames file must contain exactly ${expectedFrames.size} frames`);
}
for (const [id, expected] of expectedFrames) {
  if (JSON.stringify(frames[id]) !== JSON.stringify(expected)) {
    fail(`frame ${id} must be the untrimmed 64x80 cell at ${expected.x},${expected.y}`);
  }
}

const cellTransforms = [...svg.matchAll(/<g transform="translate\((\d+) (\d+)\)">/g)]
  .map((match) => `${match[1]},${match[2]}`);
if (cellTransforms.length !== expectedFrames.size) {
  fail(`SVG must expose exactly ${expectedFrames.size} translated frame cells`);
}
for (const frame of expectedFrames.values()) {
  if (!cellTransforms.includes(`${frame.x},${frame.y}`)) {
    fail(`SVG is missing frame cell at ${frame.x},${frame.y}`);
  }
}

const atlas = manifest.atlases?.find((entry) => entry.id === ATLAS_ID);
if (!atlas) {
  fail(`manifest is missing atlas ${ATLAS_ID}`);
} else if (
  atlas.image !== 'assets/art/atlases/environment-worker-housing-1x.svg'
  || atlas.framesFile !== 'assets/art/atlases/environment-worker-housing-1x.json'
  || atlas.pixelRatio !== 1
) {
  fail('manifest atlas registration does not match the production 1x files');
}

const environments = manifest.environment ?? [];
const expectedFamilies = new Map([
  ['environment.worker_housing.play_square', { footprint: [2, 2], variants: ['oxide_climber'] }],
  ['environment.worker_housing.laundry_green', { footprint: [2, 1], variants: ['shared_wash_green'] }],
  ['environment.worker_housing.service_edge', { footprint: [2, 1], variants: ['north_east_service', 'north_west_service'] }],
]);
if (environments.length !== expectedFamilies.size) {
  fail(`manifest must expose exactly ${expectedFamilies.size} Pack 4B environment families`);
}

const frameRefs = new Set();
for (const [familyId, contract] of expectedFamilies) {
  const family = environments.find((entry) => entry.id === familyId);
  if (!family) {
    fail(`manifest is missing ${familyId}`);
    continue;
  }
  if (JSON.stringify(family.footprint) !== JSON.stringify(contract.footprint)) {
    fail(`${familyId} footprint must remain ${contract.footprint.join('x')}`);
  }
  if (JSON.stringify(family.ownerBuildingIds) !== JSON.stringify(OWNER_IDS)) {
    fail(`${familyId} must retain the reviewed worker-housing owner set`);
  }
  if (family.powerSource !== 'none') fail(`${familyId} must not depend on simulated power state`);
  if (!Array.isArray(family.placements) || family.placements.length < 2) {
    fail(`${familyId} requires at least two deterministic placement candidates`);
  }
  for (const placement of family.placements ?? []) {
    if (!placement.id || !isPoint(placement.offset)) fail(`${familyId} has an invalid placement candidate`);
    if (placement.requiresRoadWithin !== undefined && placement.requiresRoadWithin !== 1) {
      fail(`${familyId}.${placement.id} road proximity must be exactly one tile`);
    }
  }
  const variantIds = (family.variants ?? []).map((variant) => variant.id);
  if (JSON.stringify(variantIds) !== JSON.stringify(contract.variants)) {
    fail(`${familyId} variants must remain ${contract.variants.join(', ')}`);
  }
  for (const variant of family.variants ?? []) {
    if (!Number.isFinite(variant.weight) || variant.weight <= 0) fail(`${familyId}.${variant.id} weight must be positive`);
    const partIds = new Set();
    for (const part of variant.parts ?? []) {
      if (!part.id || partIds.has(part.id)) fail(`${familyId}.${variant.id} contains a missing or duplicate part id`);
      partIds.add(part.id);
      if (!isPoint(part.offset)
        || part.offset[0] < 0 || part.offset[1] < 0
        || part.offset[0] >= family.footprint[0] || part.offset[1] >= family.footprint[1]) {
        fail(`${familyId}.${variant.id}.${part.id} offset lies outside the reserved footprint`);
      }
      if (JSON.stringify(part.anchor) !== '[32,72]') fail(`${part.id} must retain anchor [32,72]`);
      if (!['ground_decal', 'prop'].includes(part.layer)) fail(`${part.id} has invalid depth layer ${part.layer}`);
      if (!FALLBACKS.has(part.proceduralFallback)) fail(`${part.id} has invalid procedural fallback ${part.proceduralFallback}`);
      if (!['medium', 'high'].includes(part.minimumQuality)) fail(`${part.id} has invalid minimumQuality`);
      const nearRef = part.lod?.near ?? '';
      const frameId = nearRef.startsWith(`${ATLAS_ID}:`) ? nearRef.slice(ATLAS_ID.length + 1) : '';
      const match = frameId.match(/^(.*)-base-near$/);
      if (!match || !PART_TYPES.includes(match[1])) {
        fail(`${part.id} does not resolve to a reviewed Pack 4B part type`);
        continue;
      }
      assertLod(part, 'lod', match[1], 'base', frameRefs);
      assertLod(part, 'winterLod', match[1], 'winter', frameRefs);
    }
  }
}

const service = environments.find((entry) => entry.id === 'environment.worker_housing.service_edge');
for (const orientation of ['north_east', 'north_west']) {
  const expectedVariant = `${orientation}_service`;
  if (!service?.placements.some((placement) => (
    placement.id.startsWith(orientation)
    && placement.requiresRoadWithin === 1
    && placement.roadEdge === orientation
    && JSON.stringify(placement.variantIds) === JSON.stringify([expectedVariant])
  ))) {
    fail(`service_edge is missing the explicit ${orientation} road-edge placement`);
  }
  if (!service?.variants.some((variant) => variant.id === expectedVariant)) {
    fail(`service_edge is missing the explicit ${orientation} art orientation`);
  }
}

for (const reference of frameRefs) {
  const frameId = reference.slice(ATLAS_ID.length + 1);
  if (!frames[frameId]) fail(`manifest references missing frame ${reference}`);
}
for (const frameId of Object.keys(frames)) {
  if (!frameRefs.has(`${ATLAS_ID}:${frameId}`)) fail(`atlas frame is not reachable from the environment manifest: ${frameId}`);
}

if (!process.exitCode) {
  console.log('courtyard-atlas-check: ok (3 families; NE/NW service edges; five-eighths upright scale; worn winter paths; service bins; 3 LOD recovery)');
}
