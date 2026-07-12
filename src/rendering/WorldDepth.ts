import type { RenderLayer } from 'pixi.js';

/**
 * Ground-plane painter order for the shared isometric world layer.
 *
 * Elevation deliberately does not participate in this key. Elevation changes
 * projection, while gx/gy describe which piece of ground is physically in
 * front. Mixing projected Y into painter order lets raised foreground terrain
 * render behind flat structures.
 */
export enum WorldDepthPhase {
  CLIFF = 0,
  TERRAIN = 1,
  TERRAIN_EDGE = 2,
  TERRAIN_DECAL = 3,
  ZONE = 4,
  SURFACE_INFRASTRUCTURE = 5,
  PROP = 6,
  STRUCTURE = 7,
  VEHICLE = 8,
  BUILDING_EFFECT = 9,
}

export type WorldDepthLayer = Pick<RenderLayer, 'attach'>;

const DIAGONAL_STRIDE = 1_000_000;
const SAME_DIAGONAL_TILE_STRIDE = 1_000;
const PHASE_STRIDE = 10;
const STABLE_ID_MODULUS = 1_000_000;

function stableFraction(stableId: number): number {
  if (!Number.isFinite(stableId)) return 0;
  return (Math.abs(Math.trunc(stableId)) % STABLE_ID_MODULUS) / STABLE_ID_MODULUS;
}

function groundDepth(
  gx: number,
  gy: number,
  phase: WorldDepthPhase,
  stableId: number
): number {
  return (gx + gy) * DIAGONAL_STRIDE
    + gy * SAME_DIAGONAL_TILE_STRIDE
    + phase * PHASE_STRIDE
    + stableFraction(stableId);
}

/** Sort a tile-owned renderable by its ground-plane position. */
export function tileDepth(
  gx: number,
  gy: number,
  phase: WorldDepthPhase,
  stableId = 0
): number {
  return groundDepth(gx, gy, phase, stableId);
}

/** Sort a footprint from its nearest occupied cell, not its visual centre. */
export function footprintDepth(
  gx: number,
  gy: number,
  width: number,
  height: number,
  phase: WorldDepthPhase,
  stableId = 0
): number {
  const safeWidth = Math.max(1, Math.floor(Number.isFinite(width) ? width : 1));
  const safeHeight = Math.max(1, Math.floor(Number.isFinite(height) ? height : 1));
  return groundDepth(
    gx + safeWidth - 1,
    gy + safeHeight - 1,
    phase,
    stableId
  );
}

/** Sort a moving renderable continuously between two ground tiles. */
export function movingDepth(
  fromGx: number,
  fromGy: number,
  toGx: number,
  toGy: number,
  progress: number,
  phase: WorldDepthPhase,
  stableId = 0
): number {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return groundDepth(
    fromGx + (toGx - fromGx) * t,
    fromGy + (toGy - fromGy) * t,
    phase,
    stableId
  );
}
