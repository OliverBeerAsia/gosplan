import type { GameStateData } from './GameState';

const UINT32_RANGE = 0x100000000;
const DEFAULT_SEED = 0x6D2B79F5;

function normalizeSeed(seed: number): number {
  const normalized = seed >>> 0;
  return normalized === 0 ? DEFAULT_SEED : normalized;
}

function step(seed: number): number {
  let x = normalizeSeed(seed);
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return normalizeSeed(x);
}

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = normalizeSeed(seed);
  }

  nextFloat(): number {
    this.state = step(this.state);
    return this.state / UINT32_RANGE;
  }

  nextInt(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(this.nextFloat() * maxExclusive);
  }

  nextSignedFloat(): number {
    return this.nextFloat() * 2 - 1;
  }
}

export function deriveSeed(baseSeed: number, salt: number): number {
  const mixed = ((baseSeed >>> 0) ^ Math.imul(salt >>> 0, 0x9E3779B1)) >>> 0;
  return normalizeSeed(mixed);
}

export function createRuntimeSeed(): number {
  const timeSeed = Date.now() >>> 0;
  const entropySeed = Math.floor(Math.random() * UINT32_RANGE) >>> 0;
  return normalizeSeed(timeSeed ^ entropySeed);
}

export function nextGameRandom(state: Pick<GameStateData, 'rngState'>): number {
  state.rngState = step(state.rngState);
  return state.rngState / UINT32_RANGE;
}

export function nextGameRandomInt(
  state: Pick<GameStateData, 'rngState'>,
  maxExclusive: number
): number {
  if (maxExclusive <= 0) return 0;
  return Math.floor(nextGameRandom(state) * maxExclusive);
}

export function hashStringToSeed(input: string): number {
  let hash = 0x811C9DC5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return normalizeSeed(hash);
}
