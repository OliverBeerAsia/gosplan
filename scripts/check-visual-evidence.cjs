#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const evidenceDir = path.join(root, 'docs/graphics-implementation-evidence');
const fixture = require('../tests/fixtures/visual/pack4-worker-housing-courtyards-v2.json');

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

function inspectPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.ok(buffer.length > 64, `${filePath} must contain a complete PNG`);
  assert.deepEqual(
    [...buffer.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    `${filePath} must have a PNG signature`
  );

  let offset = 8;
  let ihdr;
  const imageData = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    assert.ok(dataEnd + 4 <= buffer.length, `${filePath} has a truncated ${type} chunk`);
    const data = buffer.subarray(dataStart, dataEnd);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      imageData.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  assert.ok(ihdr, `${filePath} must contain IHDR`);
  assert.equal(ihdr.bitDepth, 8, `${filePath} must use 8-bit channels`);
  assert.equal(ihdr.interlace, 0, `${filePath} must be non-interlaced`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.colorType];
  assert.ok(channels, `${filePath} uses unsupported PNG color type ${ihdr.colorType}`);
  assert.ok(imageData.length > 0, `${filePath} must contain image data`);

  const inflated = zlib.inflateSync(Buffer.concat(imageData));
  const rowBytes = ihdr.width * channels;
  assert.equal(
    inflated.length,
    (rowBytes + 1) * ihdr.height,
    `${filePath} decompressed image length must match IHDR`
  );

  let sourceOffset = 0;
  let previous = Buffer.alloc(rowBytes);
  let firstVisiblePixel;
  let hasVisiblePixel = false;
  let hasVariation = false;
  for (let y = 0; y < ihdr.height; y++) {
    const filter = inflated[sourceOffset++];
    const source = inflated.subarray(sourceOffset, sourceOffset + rowBytes);
    sourceOffset += rowBytes;
    const row = Buffer.allocUnsafe(rowBytes);
    for (let index = 0; index < rowBytes; index++) {
      const left = index >= channels ? row[index - channels] : 0;
      const up = previous[index];
      const upperLeft = index >= channels ? previous[index - channels] : 0;
      const predictor = filter === 0
        ? 0
        : filter === 1
          ? left
          : filter === 2
            ? up
            : filter === 3
              ? Math.floor((left + up) / 2)
              : filter === 4
                ? paeth(left, up, upperLeft)
                : undefined;
      assert.notEqual(predictor, undefined, `${filePath} has unsupported PNG filter ${filter}`);
      row[index] = (source[index] + predictor) & 0xff;
    }

    for (let index = 0; index < rowBytes; index += channels) {
      const alpha = ihdr.colorType === 4 || ihdr.colorType === 6
        ? row[index + channels - 1]
        : 255;
      if (alpha === 0) continue;
      hasVisiblePixel = true;
      const colorChannels = ihdr.colorType === 0 || ihdr.colorType === 4 ? 1 : 3;
      const pixel = row.subarray(index, index + colorChannels).toString('hex');
      if (firstVisiblePixel === undefined) firstVisiblePixel = pixel;
      else if (pixel !== firstVisiblePixel) hasVariation = true;
    }
    previous = row;
  }

  assert.equal(hasVisiblePixel, true, `${filePath} must not be fully transparent`);
  assert.equal(hasVariation, true, `${filePath} must not be a blank single-color image`);
  return ihdr;
}

function captureFilename(captureCase) {
  return fixture.benchmark.capture.filenameTemplate
    .replace('{caseId}', captureCase.id)
    .replace('{width}', String(captureCase.viewport.width))
    .replace('{height}', String(captureCase.viewport.height));
}

const requiredCases = fixture.benchmark.capture.cases;
assert.equal(requiredCases.length, fixture.benchmark.capture.requiredCaseCount);
const requiredEvidence = [
  ...requiredCases.map((captureCase) => ({
    filename: captureFilename(captureCase),
    viewport: captureCase.viewport,
  })),
  {
    filename: 'v1.10.0-loading-art-fallback-sandbox-1366x768.png',
    viewport: { width: 1366, height: 768 },
  },
];

for (const evidence of requiredEvidence) {
  const { filename } = evidence;
  const filePath = path.join(evidenceDir, filename);
  assert.equal(fs.existsSync(filePath), true, `required visual evidence is missing: ${filename}`);
  const png = inspectPng(filePath);
  assert.deepEqual(
    { width: png.width, height: png.height },
    evidence.viewport,
    `${filename} dimensions must match the declared capture viewport`
  );
}

console.log(`visual-evidence-check: ok (${requiredEvidence.length} required nonblank PNGs)`);
