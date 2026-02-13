#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();

const gameplayFiles = [
  'src/core/MapGenerator.ts',
  'src/simulation/ZoneGrowthService.ts',
  'src/simulation/EventDirectorService.ts',
];

const requiredStateFields = ['rngSeed', 'rngState', 'mapSeed'];
const requiredStateFile = 'src/core/GameState.ts';
const requiredSaveLoadFile = 'src/core/SaveLoad.ts';

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function fail(message) {
  console.error(`determinism-check: ${message}`);
  process.exitCode = 1;
}

for (const relPath of gameplayFiles) {
  const content = read(relPath);
  if (content.includes('Math.random(')) {
    fail(`forbidden Math.random() in ${relPath}`);
  }
}

const gameStateContent = read(requiredStateFile);
for (const field of requiredStateFields) {
  if (!gameStateContent.includes(`${field}:`)) {
    fail(`missing GameState field "${field}" in ${requiredStateFile}`);
  }
}

const saveLoadContent = read(requiredSaveLoadFile);
for (const field of requiredStateFields) {
  if (!saveLoadContent.includes(field)) {
    fail(`Save/load path does not reference "${field}" in ${requiredSaveLoadFile}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('determinism-check: ok');
