import { Graphics, Renderer, Texture } from 'pixi.js';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { PALETTE } from './SovietPalette';

export function generateTerrainTextures(renderer: Renderer): Map<string, Texture> {
  const textures = new Map<string, Texture>();

  textures.set('ground', generateGroundTile(renderer));
  textures.set('water', generateWaterTile(renderer));
  textures.set('forest', generateForestTile(renderer));
  textures.set('hill', generateHillTile(renderer));
  textures.set('dirt', generateDirtTile(renderer));
  textures.set('ground_highlight', generateHighlightTile(renderer, 0x00FF00, 0.3));
  textures.set('ground_invalid', generateHighlightTile(renderer, 0xFF0000, 0.3));
  textures.set('power_overlay', generateHighlightTile(renderer, 0xFFFF00, 0.25));
  textures.set('service_overlay', generateHighlightTile(renderer, 0x00C8FF, 0.25));
  textures.set('zone_housing', generateZoneTile(renderer, 0x4CAF50));
  textures.set('zone_industry', generateZoneTile(renderer, 0xFF9800));
  textures.set('zone_civic', generateZoneTile(renderer, 0x03A9F4));
  textures.set('zone_green', generateZoneTile(renderer, 0x8BC34A));

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

function generateForestTile(renderer: Renderer): Texture {
  const g = new Graphics();
  // Green base diamond
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill(PALETTE.FOREST_GREEN);

  // Edge
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.stroke({ width: 0.5, color: PALETTE.FOREST_DARK, alpha: 0.5 });

  // Small triangular trees
  const treePositions = [
    { x: TILE_HALF_W - 8, y: TILE_HALF_H - 5 },
    { x: TILE_HALF_W + 6, y: TILE_HALF_H - 1 },
    { x: TILE_HALF_W - 1, y: TILE_HALF_H + 5 },
  ];
  for (const tp of treePositions) {
    // Trunk
    g.rect(tp.x - 1, tp.y - 2, 2, 4);
    g.fill(PALETTE.TREE_TRUNK);
    // Canopy triangle
    g.poly([
      { x: tp.x, y: tp.y - 10 },
      { x: tp.x - 5, y: tp.y - 2 },
      { x: tp.x + 5, y: tp.y - 2 },
    ]);
    g.fill(PALETTE.GREEN_DARK);
    // Lighter highlight
    g.poly([
      { x: tp.x, y: tp.y - 10 },
      { x: tp.x - 2, y: tp.y - 4 },
      { x: tp.x + 2, y: tp.y - 4 },
    ]);
    g.fill({ color: PALETTE.FOREST_GREEN, alpha: 0.7 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateHillTile(renderer: Renderer): Texture {
  const g = new Graphics();
  // Grey-brown base diamond
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill(PALETTE.HILL_GREY);

  // Angular rock shapes
  g.poly([
    { x: TILE_HALF_W - 6, y: TILE_HALF_H - 3 },
    { x: TILE_HALF_W + 2, y: TILE_HALF_H - 6 },
    { x: TILE_HALF_W + 8, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H + 2 },
  ]);
  g.fill(PALETTE.HILL_ROCK);

  // Small rock
  g.poly([
    { x: TILE_HALF_W - 12, y: TILE_HALF_H + 2 },
    { x: TILE_HALF_W - 8, y: TILE_HALF_H - 1 },
    { x: TILE_HALF_W - 4, y: TILE_HALF_H + 3 },
  ]);
  g.fill(PALETTE.HILL_ROCK);

  // Hatching lines for rocky texture
  for (let i = 0; i < 3; i++) {
    const y0 = TILE_HALF_H - 4 + i * 5;
    g.moveTo(TILE_HALF_W - 10 + i * 4, y0);
    g.lineTo(TILE_HALF_W - 4 + i * 4, y0 + 3);
    g.stroke({ width: 0.5, color: PALETTE.CONCRETE_DARK, alpha: 0.4 });
  }

  // Edge highlight
  g.moveTo(TILE_HALF_W, 0);
  g.lineTo(TILE_HALF_W * 2, TILE_HALF_H);
  g.stroke({ width: 1, color: PALETTE.HILL_ROCK, alpha: 0.6 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateDirtTile(renderer: Renderer): Texture {
  const g = new Graphics();
  // Brown earth base diamond
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill(PALETTE.DIRT_BROWN);

  // Subtle grid outline
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.stroke({ width: 0.5, color: 0x6B5D3A, alpha: 0.4 });

  // Pebble dots
  const pebbles = [
    { x: TILE_HALF_W - 6, y: TILE_HALF_H - 3 },
    { x: TILE_HALF_W + 5, y: TILE_HALF_H + 1 },
    { x: TILE_HALF_W - 2, y: TILE_HALF_H + 5 },
    { x: TILE_HALF_W + 9, y: TILE_HALF_H - 2 },
    { x: TILE_HALF_W - 10, y: TILE_HALF_H + 1 },
  ];
  for (const p of pebbles) {
    g.circle(p.x, p.y, 1.2);
    g.fill({ color: 0x7A6E4E, alpha: 0.5 });
  }

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

function generateZoneTile(renderer: Renderer, color: number): Texture {
  const g = new Graphics();
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill({ color, alpha: 0.22 });
  g.stroke({ width: 1, color, alpha: 0.55 });

  // Inner inset gives a pixel-signage feel without overpowering terrain art.
  g.poly([
    { x: TILE_HALF_W, y: 4 },
    { x: TILE_HALF_W * 2 - 8, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 - 4 },
    { x: 8, y: TILE_HALF_H },
  ]);
  g.stroke({ width: 1, color, alpha: 0.35 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}
