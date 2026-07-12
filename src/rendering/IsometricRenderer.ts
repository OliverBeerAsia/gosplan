import { TILE_HALF_W, TILE_HALF_H, ELEVATION_HEIGHT } from '../constants';
import type { Grid } from '../grid/Grid';
import { tileDepth, WorldDepthPhase } from './WorldDepth';

export type CliffDirection = 'gx' | 'gy';

export interface CliffFaceGeometry {
  direction: CliffDirection;
  step: number;
  points: Array<{ x: number; y: number }>;
}

function lerpPoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  amount: number
): { x: number; y: number } {
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
  };
}

/** Convert grid coordinates to world (pixel) position */
export function gridToWorld(gx: number, gy: number, elevation: number = 0): { x: number; y: number } {
  return {
    x: (gx - gy) * TILE_HALF_W,
    y: (gx + gy) * TILE_HALF_H - elevation * ELEVATION_HEIGHT,
  };
}

/**
 * Build one quad per exposed elevation step on the two camera-facing edges.
 * Drawing these quads before every terrain top lets the lower neighboring top
 * naturally occlude each face bottom without adding outline seams.
 */
export function getCliffFaceGeometry(
  gx: number,
  gy: number,
  elevation: number,
  neighborElevation: number,
  direction: CliffDirection
): CliffFaceGeometry[] {
  const topElevation = Math.max(0, Math.floor(elevation));
  const bottomElevation = Math.max(0, Math.floor(neighborElevation));
  const exposedSteps = Math.max(0, topElevation - bottomElevation);
  const faces: CliffFaceGeometry[] = [];

  for (let step = 0; step < exposedSteps; step++) {
    const upper = gridToWorld(gx, gy, topElevation - step);
    const lower = gridToWorld(gx, gy, topElevation - step - 1);

    if (direction === 'gx') {
      faces.push({
        direction,
        step,
        points: [
          { x: upper.x + TILE_HALF_W, y: upper.y },
          { x: upper.x, y: upper.y + TILE_HALF_H },
          { x: lower.x, y: lower.y + TILE_HALF_H },
          { x: lower.x + TILE_HALF_W, y: lower.y },
        ],
      });
    } else {
      faces.push({
        direction,
        step,
        points: [
          { x: upper.x - TILE_HALF_W, y: upper.y },
          { x: upper.x, y: upper.y + TILE_HALF_H },
          { x: lower.x, y: lower.y + TILE_HALF_H },
          { x: lower.x - TILE_HALF_W, y: lower.y },
        ],
      });
    }
  }

  return faces;
}

/** Return a horizontal material band inset within a cliff-face quad. */
export function getCliffFaceBandGeometry(
  points: CliffFaceGeometry['points'],
  start: number,
  end: number
): CliffFaceGeometry['points'] {
  if (points.length !== 4) return [];
  const bandStart = Math.max(0, Math.min(1, start));
  const bandEnd = Math.max(bandStart, Math.min(1, end));
  const startLeft = lerpPoint(points[0], points[3], bandStart);
  const startRight = lerpPoint(points[1], points[2], bandStart);
  const endRight = lerpPoint(points[1], points[2], bandEnd);
  const endLeft = lerpPoint(points[0], points[3], bandEnd);
  return [startLeft, startRight, endRight, endLeft];
}

/** Convert screen position (with camera offset) to grid coordinates */
export function screenToGrid(
  sx: number,
  sy: number,
  cameraX: number,
  cameraY: number,
  zoom: number
): { gx: number; gy: number } {
  // Remove camera transform
  const wx = (sx - cameraX) / zoom;
  const wy = (sy - cameraY) / zoom;

  // Inverse of the isometric transform
  const gx = (wx / TILE_HALF_W + wy / TILE_HALF_H) / 2;
  const gy = (wy / TILE_HALF_H - wx / TILE_HALF_W) / 2;

  return { gx: Math.floor(gx), gy: Math.floor(gy) };
}

/**
 * Height-aware pointer picking for the projected terrain surface.
 *
 * We project candidate coordinates at each elevation plane, then retain only
 * cells whose actual elevated diamond contains the pointer. When projected
 * diamonds overlap, the same visible-baseline order used by rendering chooses
 * the frontmost cell. The flat inverse remains the out-of-bounds fallback.
 */
export function screenToGridOnTerrain(
  sx: number,
  sy: number,
  cameraX: number,
  cameraY: number,
  zoom: number,
  grid: Grid
): { gx: number; gy: number } {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const wx = (sx - cameraX) / safeZoom;
  const wy = (sy - cameraY) / safeZoom;
  const fallback = screenToGrid(sx, sy, cameraX, cameraY, safeZoom);
  const candidates = new Map<string, { gx: number; gy: number }>();

  for (let elevation = 0; elevation <= grid.getMaxElevation(); elevation++) {
    const projectedWy = wy + elevation * ELEVATION_HEIGHT;
    const projectedGx = (wx / TILE_HALF_W + projectedWy / TILE_HALF_H) / 2;
    const projectedGy = (projectedWy / TILE_HALF_H - wx / TILE_HALF_W) / 2;
    const baseGx = Math.floor(projectedGx);
    const baseGy = Math.floor(projectedGy);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const gx = baseGx + dx;
        const gy = baseGy + dy;
        if (grid.inBounds(gx, gy)) candidates.set(`${gx},${gy}`, { gx, gy });
      }
    }
  }

  let picked: { gx: number; gy: number; depth: number } | null = null;
  for (const candidate of candidates.values()) {
    const elevation = grid.getElevation(candidate.gx, candidate.gy);
    const center = gridToWorld(candidate.gx, candidate.gy, elevation);
    const diamondDistance =
      Math.abs(wx - center.x) / TILE_HALF_W +
      Math.abs(wy - center.y) / TILE_HALF_H;
    if (diamondDistance > 1 + Number.EPSILON) continue;

    const depth = tileDepth(candidate.gx, candidate.gy, WorldDepthPhase.TERRAIN);
    if (!picked || depth > picked.depth) {
      picked = { ...candidate, depth };
    }
  }

  return picked ? { gx: picked.gx, gy: picked.gy } : fallback;
}

/**
 * Projected baseline helper retained for geometry checks and compatibility.
 * World painter order must use the ground-plane helpers in WorldDepth.ts.
 */
export function depthKey(
  gx: number,
  gy: number,
  elevation: number = 0,
  stableTieBreaker: number = 0
): number {
  const baseline = gridToWorld(gx, gy, elevation).y;
  return baseline + gy * 1e-3 + gx * 1e-6 + stableTieBreaker * 1e-9;
}
