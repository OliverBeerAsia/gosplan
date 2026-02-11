import { TILE_HALF_W, TILE_HALF_H, ELEVATION_HEIGHT } from '../constants';

/** Convert grid coordinates to world (pixel) position */
export function gridToWorld(gx: number, gy: number, elevation: number = 0): { x: number; y: number } {
  return {
    x: (gx - gy) * TILE_HALF_W,
    y: (gx + gy) * TILE_HALF_H - elevation * ELEVATION_HEIGHT,
  };
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

/** Generate depth sort key for diagonal sweep */
export function depthKey(gx: number, gy: number): number {
  return gx + gy;
}
