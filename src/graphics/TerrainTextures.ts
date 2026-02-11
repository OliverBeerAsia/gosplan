import { Graphics, Renderer, Texture } from 'pixi.js';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { PALETTE } from './SovietPalette';

export function generateTerrainTextures(renderer: Renderer): Map<string, Texture> {
  const textures = new Map<string, Texture>();

  textures.set('ground', generateGroundTile(renderer));
  textures.set('water', generateWaterTile(renderer));
  textures.set('ground_highlight', generateHighlightTile(renderer, 0x00FF00, 0.3));
  textures.set('ground_invalid', generateHighlightTile(renderer, 0xFF0000, 0.3));
  textures.set('power_overlay', generateHighlightTile(renderer, 0xFFFF00, 0.25));

  return textures;
}

function generateGroundTile(renderer: Renderer): Texture {
  const g = new Graphics();
  // Diamond shape
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill(PALETTE.GROUND);

  // Top edge highlight
  g.moveTo(TILE_HALF_W, 0);
  g.lineTo(TILE_HALF_W * 2, TILE_HALF_H);
  g.stroke({ width: 1, color: PALETTE.GROUND_LIGHT, alpha: 0.5 });

  // Bottom edge shadow
  g.moveTo(0, TILE_HALF_H);
  g.lineTo(TILE_HALF_W, TILE_HALF_H * 2);
  g.lineTo(TILE_HALF_W * 2, TILE_HALF_H);
  g.stroke({ width: 1, color: PALETTE.GROUND_EDGE, alpha: 0.5 });

  // Subtle grid lines
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.stroke({ width: 0.5, color: PALETTE.GROUND_EDGE, alpha: 0.3 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateWaterTile(renderer: Renderer): Texture {
  const g = new Graphics();
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill(PALETTE.WATER);

  // Wave effect
  g.moveTo(TILE_HALF_W - 8, TILE_HALF_H - 2);
  g.lineTo(TILE_HALF_W + 8, TILE_HALF_H - 2);
  g.stroke({ width: 1, color: PALETTE.WATER_LIGHT, alpha: 0.5 });

  g.moveTo(TILE_HALF_W - 5, TILE_HALF_H + 4);
  g.lineTo(TILE_HALF_W + 5, TILE_HALF_H + 4);
  g.stroke({ width: 1, color: PALETTE.WATER_LIGHT, alpha: 0.3 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateHighlightTile(renderer: Renderer, color: number, alpha: number): Texture {
  const g = new Graphics();
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill({ color, alpha });
  g.stroke({ width: 1.5, color, alpha: alpha + 0.2 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}
