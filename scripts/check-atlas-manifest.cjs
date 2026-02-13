#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, 'public/assets/atlas/pixel-city.json');

function fail(message) {
  console.error(`atlas-check: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  fail(`missing manifest at ${manifestPath}`);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in manifest: ${String(error)}`);
}

if (!manifest || typeof manifest !== 'object') {
  fail('manifest root is not an object');
}

if (typeof manifest.image !== 'string' || manifest.image.length === 0) {
  fail('manifest.image must be a non-empty string');
}

const imagePath = path.join(path.dirname(manifestPath), manifest.image);
const resolvedImagePath = manifest.image.startsWith('/')
  ? path.join(ROOT, 'public', manifest.image.replace(/^\//, ''))
  : imagePath;
if (!fs.existsSync(resolvedImagePath)) {
  fail(`manifest image file does not exist: ${resolvedImagePath}`);
}

if (!manifest.frames || typeof manifest.frames !== 'object') {
  fail('manifest.frames must be an object');
}

const frameEntries = Object.entries(manifest.frames);
if (frameEntries.length === 0) {
  fail('manifest.frames is empty');
}

for (const [key, frame] of frameEntries) {
  if (!frame || typeof frame !== 'object') {
    fail(`frame "${key}" is not an object`);
  }
  for (const prop of ['x', 'y', 'w', 'h']) {
    if (typeof frame[prop] !== 'number' || !Number.isFinite(frame[prop])) {
      fail(`frame "${key}" missing numeric "${prop}"`);
    }
  }
  if (frame.w <= 0 || frame.h <= 0) {
    fail(`frame "${key}" has non-positive dimensions`);
  }
}

console.log(`atlas-check: ok (${frameEntries.length} frames)`);
