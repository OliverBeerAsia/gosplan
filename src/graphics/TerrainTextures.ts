import { Graphics, Renderer, Texture } from 'pixi.js';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { PALETTE } from './SovietPalette';

export type TerrainSeason = 'summer' | 'winter' | 'autumn' | 'spring';

/**
 * Vertical headroom baked into every base tile texture, in pixels above the
 * diamond top. Trees and other tall tile-local details draw into this space.
 *
 * Pixi's generateTexture crops to drawn bounds, so without a fixed frame each
 * texture would acquire a different origin and render offset from its tile:
 * forest canopies pushed the whole diamond downward, bleeding dark pixels
 * over lower neighbors at elevation steps. Every base tile generator starts
 * with an invisible bounds rect spanning this exact frame, and TerrainRenderer
 * compensates by placing base sprites TILE_TEXTURE_OVERHEAD higher.
 */
export const TILE_TEXTURE_OVERHEAD = 20;

/** Fix the texture frame to (0,-OVERHEAD)..(2W, 2H) for every base tile. */
function normalizeTileBounds(g: Graphics): void {
  g.rect(0, -TILE_TEXTURE_OVERHEAD, TILE_HALF_W * 2, TILE_HALF_H * 2 + TILE_TEXTURE_OVERHEAD);
  g.fill({ color: 0x000000, alpha: 0 });
}

/** Fix the texture frame to exactly the tile diamond for overlay masks. */
function normalizeMaskBounds(g: Graphics): void {
  g.rect(0, 0, TILE_HALF_W * 2, TILE_HALF_H * 2);
  g.fill({ color: 0x000000, alpha: 0 });
}

export function generateTerrainTextures(renderer: Renderer): Map<string, Texture> {
  const textures = new Map<string, Texture>();

  // Summer (default) variants
  for (let v = 0; v < 3; v++) {
    textures.set(`ground_${v}`, generateGroundTile(renderer, v));
    textures.set(`dirt_${v}`, generateDirtTile(renderer, v));
    textures.set(`forest_${v}`, generateForestTile(renderer, v));
    textures.set(`water_${v}`, generateWaterTile(renderer, v));
    textures.set(`hill_${v}`, generateHillTile(renderer, v));
  }

  textures.set('ground', textures.get('ground_0')!);
  textures.set('dirt', textures.get('dirt_0')!);
  textures.set('forest', textures.get('forest_0')!);
  textures.set('water', textures.get('water_0')!);
  textures.set('hill', textures.get('hill_0')!);

  // Seasonal variants
  const seasons: TerrainSeason[] = ['winter', 'autumn', 'spring'];
  for (const season of seasons) {
    for (let v = 0; v < 3; v++) {
      textures.set(`ground_${season}_${v}`, generateSeasonalGround(renderer, v, season));
      textures.set(`forest_${season}_${v}`, generateSeasonalForest(renderer, v, season));
      textures.set(`water_${season}_${v}`, generateSeasonalWater(renderer, v, season));
      textures.set(`dirt_${season}_${v}`, generateSeasonalDirt(renderer, v, season));
      textures.set(`hill_${season}_${v}`, generateSeasonalHill(renderer, v, season));
    }
  }

  textures.set('ground_highlight', generateHighlightTile(renderer, 0x00FF00, 0.3));
  textures.set('ground_invalid', generateHighlightTile(renderer, 0xFF0000, 0.3));
  textures.set('power_overlay', generateHighlightTile(renderer, 0xFFFF00, 0.25));
  textures.set('service_overlay', generateHighlightTile(renderer, 0x00C8FF, 0.25));

  for (let mask = 0; mask < 16; mask++) {
    textures.set(`terrain_edge_${mask}`, generateTerrainEdgeMask(renderer, mask));
    textures.set(`shore_${mask}`, generateShorelineMask(renderer, mask, false));
    textures.set(`shore_winter_${mask}`, generateShorelineMask(renderer, mask, true));
  }

  // Far-zoom forest canopy LOD (per season)
  for (let v = 0; v < 3; v++) {
    textures.set(`forest_far_${v}`, generateFarForestTile(renderer, v, null));
    for (const season of ['winter', 'autumn', 'spring'] as TerrainSeason[]) {
      textures.set(`forest_${season}_far_${v}`, generateFarForestTile(renderer, v, season));
    }
  }

  textures.set('terrain_decal_0', generateEmptyOverlay(renderer));
  textures.set('terrain_decal_1', generateTerrainDecal(renderer, 0));
  textures.set('terrain_decal_2', generateTerrainDecal(renderer, 1));
  textures.set('terrain_decal_3', generateTerrainDecal(renderer, 2));

  textures.set('zone_housing', generateZoneTile(renderer, 0x4CAF50, 'diag'));
  textures.set('zone_industry', generateZoneTile(renderer, 0xFF9800, 'cross'));
  textures.set('zone_civic', generateZoneTile(renderer, 0x03A9F4, 'grid'));
  textures.set('zone_green', generateZoneTile(renderer, 0x8BC34A, 'dots'));

  textures.set('lamp_pool', generateLampPoolTexture(renderer));
  textures.set('building_shadow', generateBuildingShadowTexture(renderer));

  textures.set('prop_none', generateEmptyOverlay(renderer));
  textures.set('prop_lamp', generatePropTexture(renderer, 'lamp'));
  textures.set('prop_fence', generatePropTexture(renderer, 'fence'));
  textures.set('prop_kiosk', generatePropTexture(renderer, 'kiosk'));
  textures.set('prop_courtyard', generatePropTexture(renderer, 'courtyard'));
  textures.set('prop_pole', generatePropTexture(renderer, 'pole'));
  textures.set('prop_bus_stop', generatePropTexture(renderer, 'bus_stop'));
  textures.set('prop_statue', generatePropTexture(renderer, 'statue'));
  textures.set('prop_bench', generatePropTexture(renderer, 'bench'));
  textures.set('prop_flowerbed', generatePropTexture(renderer, 'flowerbed'));
  textures.set('prop_flagpole', generatePropTexture(renderer, 'flagpole'));

  return textures;
}

function drawTileDiamond(g: Graphics): void {
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
}

// Simple deterministic hash for variant positioning
function varHash(a: number, b: number): number {
  let v = a * 374761393 + b * 668265263;
  v = (v ^ (v >>> 13)) * 1274126177;
  return Math.abs(v);
}

// ===== GROUND =====
function generateGroundTile(renderer: Renderer, variant: number): Texture {
  const g = new Graphics();
  normalizeTileBounds(g);
  const baseColors = [
    PALETTE.GROUND,
    PALETTE.GROUND + 0x010101,
    PALETTE.GROUND - 0x010101,
  ];
  drawTileDiamond(g);
  g.fill(baseColors[variant]);

  // No per-tile seam stroke: open ground reads as a continuous surface.
  // Material boundaries are handled by the transition edge masks instead.

  // Subtle center shadow ellipse
  g.ellipse(TILE_HALF_W, TILE_HALF_H, 6, 3);
  g.fill({ color: PALETTE.GROUND_EDGE, alpha: 0.10 + variant * 0.02 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== WATER =====
function generateWaterTile(renderer: Renderer, variant: number): Texture {
  const g = new Graphics();
  normalizeTileBounds(g);
  const waterColors = [PALETTE.WATER, PALETTE.WATER + 0x010101, PALETTE.WATER - 0x010101];
  drawTileDiamond(g);
  g.fill(waterColors[variant]);

  // Bezier wave curves at different depths
  const waves = 3 + (variant % 3);
  for (let i = 0; i < waves; i++) {
    const yOff = TILE_HALF_H - 6 + i * 4 + (variant + i) % 3;
    const xStart = TILE_HALF_W - 12 + (i * 3) % 6;
    const xEnd = TILE_HALF_W + 12 - (i * 2) % 5;
    const cpx1 = xStart + (xEnd - xStart) * 0.33;
    const cpy1 = yOff - 2 - (i % 2);
    const cpx2 = xStart + (xEnd - xStart) * 0.66;
    const cpy2 = yOff + 2 + (i % 2);
    g.moveTo(xStart, yOff);
    g.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, xEnd, yOff);
    g.stroke({ width: 0.8, color: PALETTE.WATER_LIGHT, alpha: 0.35 - i * 0.05 });
  }

  // Specular highlight ellipses
  const highlights = 2 + variant % 3;
  for (let i = 0; i < highlights; i++) {
    const h = varHash(variant * 70 + i, 31);
    const hx = TILE_HALF_W + ((h % 20) - 10);
    const hy = TILE_HALF_H + (((h >> 8) % 12) - 6);
    g.ellipse(hx, hy, 2 + (h >> 4) % 2, 1);
    g.fill({ color: 0xFFFFFF, alpha: 0.08 + (i % 2) * 0.04 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== FOREST =====
function drawConifer(g: Graphics, x: number, y: number, height: number): void {
  // Trunk
  g.rect(x - 1, y - 2, 2, 4);
  g.fill(PALETTE.TREE_TRUNK);
  // Canopy layers
  const layerH = height * 0.4;
  g.poly([
    { x: x, y: y - height },
    { x: x - 5, y: y - height + layerH },
    { x: x + 5, y: y - height + layerH },
  ]);
  g.fill(PALETTE.GREEN_DARK);
  g.poly([
    { x: x, y: y - height + 2 },
    { x: x - 4, y: y - height + layerH + 2 },
    { x: x + 4, y: y - height + layerH + 2 },
  ]);
  g.fill({ color: PALETTE.FOREST_GREEN, alpha: 0.7 });
}

function drawBirch(g: Graphics, x: number, y: number, height: number): void {
  // White trunk
  g.rect(x - 1, y - 4, 2, 6);
  g.fill(PALETTE.BIRCH_TRUNK);
  // Dark marks on trunk
  g.rect(x - 1, y - 3, 2, 1);
  g.fill({ color: 0x444444, alpha: 0.4 });
  // Round canopy
  g.ellipse(x, y - height + 2, 4, height * 0.45);
  g.fill(PALETTE.BIRCH_LEAF);
  g.ellipse(x + 1, y - height + 3, 3, height * 0.35);
  g.fill({ color: PALETTE.GREEN_LIGHT, alpha: 0.6 });
}

function generateForestTile(renderer: Renderer, variant: number): Texture {
  const g = new Graphics();
  normalizeTileBounds(g);
  const forestColors = [
    PALETTE.FOREST_GREEN,
    PALETTE.FOREST_GREEN + 0x010101,
    PALETTE.FOREST_GREEN - 0x010101,
  ];
  drawTileDiamond(g);
  g.fill(forestColors[variant]);

  // Dense undergrowth fill
  g.ellipse(TILE_HALF_W, TILE_HALF_H, 18, 10);
  g.fill({ color: PALETTE.FOREST_DARK, alpha: 0.25 });

  // 4-5 trees with varied types and heights
  const treePositions = [
    [
      { x: -8, y: -5, type: 'c', h: 12 },
      { x: 6, y: -1, type: 'c', h: 10 },
      { x: -1, y: 5, type: 'b', h: 11 },
      { x: -12, y: 2, type: 'c', h: 9 },
    ],
    [
      { x: -10, y: -2, type: 'b', h: 11 },
      { x: 4, y: -6, type: 'c', h: 13 },
      { x: 7, y: 4, type: 'c', h: 10 },
      { x: -4, y: 6, type: 'b', h: 9 },
      { x: -7, y: -7, type: 'c', h: 8 },
    ],
    [
      { x: -6, y: -6, type: 'c', h: 14 },
      { x: 3, y: 1, type: 'b', h: 10 },
      { x: -10, y: 3, type: 'c', h: 11 },
      { x: 8, y: -3, type: 'c', h: 9 },
    ],
  ];

  const trees = treePositions[variant];

  // Edge trees at tile boundaries for connectivity
  const edgeTrees = [
    { x: -16, y: 0, type: 'c', h: 7 },
    { x: 16, y: 0, type: 'c', h: 7 },
    { x: 0, y: -8, type: 'c', h: 6 },
    { x: 0, y: 8, type: 'c', h: 6 },
  ];

  for (const t of edgeTrees) {
    const tx = TILE_HALF_W + t.x;
    const ty = TILE_HALF_H + t.y;
    drawConifer(g, tx, ty, t.h);
  }

  for (const t of trees) {
    const tx = TILE_HALF_W + t.x;
    const ty = TILE_HALF_H + t.y;
    // Ground shadow under each tree
    g.ellipse(tx + 1, ty + 2, 4, 2);
    g.fill({ color: 0x1A1A1A, alpha: 0.12 });
    // Draw tree
    if (t.type === 'b') {
      drawBirch(g, tx, ty, t.h);
    } else {
      drawConifer(g, tx, ty, t.h);
    }
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== HILL =====
function generateHillTile(renderer: Renderer, variant: number): Texture {
  const g = new Graphics();
  normalizeTileBounds(g);
  const hillColors = [PALETTE.HILL_GREY, PALETTE.HILL_GREY + 0x010101, PALETTE.HILL_GREY - 0x010101];
  drawTileDiamond(g);
  g.fill(hillColors[variant]);

  // 2-3 overlapping rock polygons
  const rockSets = [
    [
      [{ x: -7, y: -2 }, { x: 1, y: -7 }, { x: 9, y: 1 }, { x: -1, y: 3 }],
      [{ x: -4, y: 3 }, { x: 5, y: -1 }, { x: 10, y: 5 }, { x: 2, y: 7 }],
    ],
    [
      [{ x: -10, y: -1 }, { x: -2, y: -6 }, { x: 6, y: -2 }, { x: -3, y: 4 }],
      [{ x: 2, y: -3 }, { x: 11, y: 0 }, { x: 8, y: 6 }, { x: -1, y: 5 }],
      [{ x: -8, y: 4 }, { x: -2, y: 0 }, { x: 4, y: 5 }, { x: -5, y: 8 }],
    ],
    [
      [{ x: -5, y: -5 }, { x: 4, y: -8 }, { x: 10, y: -2 }, { x: 1, y: 2 }],
      [{ x: -9, y: 1 }, { x: -1, y: -3 }, { x: 5, y: 3 }, { x: -6, y: 6 }],
    ],
    [
      [{ x: -8, y: -4 }, { x: 0, y: -8 }, { x: 8, y: -1 }, { x: 2, y: 4 }],
      [{ x: -3, y: 2 }, { x: 7, y: 0 }, { x: 11, y: 6 }, { x: 1, y: 7 }],
      [{ x: -11, y: 0 }, { x: -6, y: -4 }, { x: -1, y: 2 }, { x: -8, y: 5 }],
    ],
    [
      [{ x: -6, y: -3 }, { x: 3, y: -7 }, { x: 9, y: 0 }, { x: 0, y: 4 }],
      [{ x: -10, y: 2 }, { x: -3, y: -1 }, { x: 4, y: 5 }, { x: -7, y: 7 }],
    ],
  ];

  const rocks = rockSets[variant];
  const rockColors = [PALETTE.HILL_ROCK, 0x9A9A85, 0x8A8A7A];
  for (let r = 0; r < rocks.length; r++) {
    g.poly(rocks[r].map(p => ({ x: TILE_HALF_W + p.x, y: TILE_HALF_H + p.y })));
    g.fill(rockColors[r % rockColors.length]);
  }

  // Crack bezier curves
  const cracks = 2 + variant % 2;
  for (let i = 0; i < cracks; i++) {
    const h = varHash(variant * 30 + i, 77);
    const sx = TILE_HALF_W - 6 + (h % 12);
    const sy = TILE_HALF_H - 4 + ((h >> 8) % 8);
    const ex = sx + 6 + (h >> 4) % 4;
    const ey = sy + 3 + (h >> 6) % 3;
    g.moveTo(sx, sy);
    g.bezierCurveTo(sx + 2, sy - 1, ex - 2, ey + 1, ex, ey);
    g.stroke({ width: 0.5, color: PALETTE.CONCRETE_DARK, alpha: 0.3 });
  }

  // Lichen patches
  const lichenCount = 1 + variant % 3;
  for (let i = 0; i < lichenCount; i++) {
    const h = varHash(variant * 20 + i, 55);
    const lx = TILE_HALF_W + ((h % 18) - 9);
    const ly = TILE_HALF_H + (((h >> 8) % 12) - 6);
    g.ellipse(lx, ly, 2 + (h >> 4) % 2, 1.5);
    g.fill({ color: PALETTE.LICHEN, alpha: 0.25 + (i % 2) * 0.1 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== DIRT =====
function generateDirtTile(renderer: Renderer, variant: number): Texture {
  const g = new Graphics();
  normalizeTileBounds(g);
  const dirtColors = [PALETTE.DIRT_BROWN, PALETTE.DIRT_BROWN + 0x010101, PALETTE.DIRT_BROWN - 0x010101];
  drawTileDiamond(g);
  g.fill(dirtColors[variant]);

  // Irregular polygon patches (puddle/mud areas)
  const patchCount = 1 + variant % 2;
  for (let i = 0; i < patchCount; i++) {
    const h = varHash(variant * 40 + i, 63);
    const cx = TILE_HALF_W + ((h % 16) - 8);
    const cy = TILE_HALF_H + (((h >> 8) % 10) - 5);
    g.poly([
      { x: cx - 3, y: cy - 1 },
      { x: cx + 1, y: cy - 3 },
      { x: cx + 4, y: cy },
      { x: cx + 2, y: cy + 3 },
      { x: cx - 2, y: cy + 2 },
    ]);
    g.fill({ color: PALETTE.DIRT_WET, alpha: 0.2 + variant * 0.03 });
  }

  // Rut lines (wheel tracks)
  if (variant >= 2) {
    const rutY = TILE_HALF_H - 2 + variant;
    g.moveTo(TILE_HALF_W - 14, rutY + 3);
    g.lineTo(TILE_HALF_W + 14, rutY - 3);
    g.stroke({ width: 1, color: PALETTE.DIRT_CRACK, alpha: 0.18 });
    g.moveTo(TILE_HALF_W - 12, rutY + 5);
    g.lineTo(TILE_HALF_W + 12, rutY - 1);
    g.stroke({ width: 0.8, color: PALETTE.DIRT_CRACK, alpha: 0.14 });
  }

  // Dried grass tufts
  const grassCount = 3 + variant % 3;
  for (let i = 0; i < grassCount; i++) {
    const h = varHash(variant * 60 + i, 88);
    const gx = TILE_HALF_W + ((h % 24) - 12);
    const gy = TILE_HALF_H + (((h >> 8) % 16) - 8);
    const angle = ((h >> 16) % 160) * Math.PI / 180;
    g.moveTo(gx, gy);
    g.lineTo(gx + Math.cos(angle) * 2.5, gy + Math.sin(angle) * 1.5);
    g.stroke({ width: 0.7, color: 0x9A8A5A, alpha: 0.25 });
  }

  // Pebbles
  const pebbles = 3 + variant % 3;
  for (let i = 0; i < pebbles; i++) {
    const h = varHash(variant * 80 + i, 44);
    const px = TILE_HALF_W + ((h % 22) - 11);
    const py = TILE_HALF_H + (((h >> 8) % 14) - 7);
    g.circle(px, py, 0.8 + (h >> 4) % 2 * 0.4);
    g.fill({ color: 0x7A6E4E, alpha: 0.5 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== UTILITY =====
function generateHighlightTile(renderer: Renderer, color: number, alpha: number): Texture {
  const g = new Graphics();
  drawTileDiamond(g);
  g.fill({ color, alpha });
  g.stroke({ width: 1.5, color, alpha: alpha + 0.2 });
  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

type ZonePattern = 'diag' | 'cross' | 'grid' | 'dots';

function generateZoneTile(renderer: Renderer, color: number, pattern: ZonePattern): Texture {
  const g = new Graphics();
  drawTileDiamond(g);
  g.fill({ color, alpha: 0.18 });
  g.stroke({ width: 1.2, color, alpha: 0.65 });

  g.poly([
    { x: TILE_HALF_W, y: 4 },
    { x: TILE_HALF_W * 2 - 7, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 - 4 },
    { x: 7, y: TILE_HALF_H },
  ]);
  g.stroke({ width: 1, color, alpha: 0.35 });

  if (pattern === 'diag' || pattern === 'cross') {
    for (let i = -2; i <= 2; i++) {
      const x0 = 6 + i * 8;
      g.moveTo(x0, TILE_HALF_H + 10);
      g.lineTo(x0 + 20, TILE_HALF_H - 10);
      g.stroke({ width: 0.8, color, alpha: 0.45 });
    }
  }
  if (pattern === 'cross') {
    for (let i = -2; i <= 2; i++) {
      const x0 = 6 + i * 8;
      g.moveTo(x0, TILE_HALF_H - 10);
      g.lineTo(x0 + 20, TILE_HALF_H + 10);
      g.stroke({ width: 0.8, color, alpha: 0.35 });
    }
  }
  if (pattern === 'grid') {
    for (let i = 0; i < 4; i++) {
      const oy = TILE_HALF_H - 8 + i * 5;
      g.moveTo(TILE_HALF_W - 10, oy);
      g.lineTo(TILE_HALF_W + 10, oy);
      g.stroke({ width: 0.8, color, alpha: 0.4 });
    }
    for (let i = 0; i < 4; i++) {
      const ox = TILE_HALF_W - 10 + i * 6;
      g.moveTo(ox, TILE_HALF_H - 8);
      g.lineTo(ox, TILE_HALF_H + 8);
      g.stroke({ width: 0.8, color, alpha: 0.3 });
    }
  }
  if (pattern === 'dots') {
    const dots = [
      { x: TILE_HALF_W - 8, y: TILE_HALF_H - 4 },
      { x: TILE_HALF_W + 2, y: TILE_HALF_H - 1 },
      { x: TILE_HALF_W - 1, y: TILE_HALF_H + 5 },
      { x: TILE_HALF_W + 8, y: TILE_HALF_H + 2 },
    ];
    for (const d of dots) {
      g.circle(d.x, d.y, 1.1);
      g.fill({ color, alpha: 0.65 });
    }
  }

  g.rect(TILE_HALF_W - 2, TILE_HALF_H - 2, 4, 4);
  g.fill({ color, alpha: 0.8 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateTerrainEdgeMask(renderer: Renderer, mask: number): Texture {
  const g = new Graphics();
  normalizeMaskBounds(g);
  if (mask === 0) {
    drawTileDiamond(g);
    g.fill({ color: 0x000000, alpha: 0 });
    const empty = renderer.generateTexture(g);
    g.destroy();
    return empty;
  }

  // Ragged organic blend toward the higher-priority neighbor: a soft shade
  // band plus dithered specks, without the old hard 1px boundary line.
  const drawEdge = (
    x1: number, y1: number, x2: number, y2: number,
    nx: number, ny: number, edgeSalt: number,
  ) => {
    // Soft shade band, deepest at the boundary, feathering inward.
    g.poly([
      { x: x1, y: y1 },
      { x: x2, y: y2 },
      { x: x2 + nx * 0.6, y: y2 + ny * 0.6 },
      { x: x1 + nx * 0.6, y: y1 + ny * 0.6 },
    ]);
    g.fill({ color: 0x000000, alpha: 0.12 });
    g.poly([
      { x: x1 + nx * 0.6, y: y1 + ny * 0.6 },
      { x: x2 + nx * 0.6, y: y2 + ny * 0.6 },
      { x: x2 + nx * 1.4, y: y2 + ny * 1.4 },
      { x: x1 + nx * 1.4, y: y1 + ny * 1.4 },
    ]);
    g.fill({ color: 0x000000, alpha: 0.05 });

    // Dithered specks scatter the boundary so it reads ragged, not ruled.
    for (let i = 0; i < 7; i++) {
      const h = varHash(mask * 131 + i * 29, edgeSalt);
      const t = 0.08 + (h % 84) / 100;
      const depth = 0.3 + ((h >> 8) % 90) / 100; // 0.3..1.2 band depths
      const px = x1 + (x2 - x1) * t + nx * depth;
      const py = y1 + (y2 - y1) * t + ny * depth;
      g.circle(px, py, 0.6 + ((h >> 4) % 2) * 0.4);
      g.fill({ color: 0x000000, alpha: 0.10 + ((h >> 6) % 3) * 0.03 });
    }
  };

  if (mask & 1) drawEdge(TILE_HALF_W, 0, TILE_HALF_W * 2, TILE_HALF_H, -4, 4, 11);
  if (mask & 2) drawEdge(TILE_HALF_W * 2, TILE_HALF_H, TILE_HALF_W, TILE_HALF_H * 2, -4, -4, 23);
  if (mask & 4) drawEdge(TILE_HALF_W, TILE_HALF_H * 2, 0, TILE_HALF_H, 4, -4, 47);
  if (mask & 8) drawEdge(0, TILE_HALF_H, TILE_HALF_W, 0, 4, 4, 83);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

/**
 * Shoreline drawn on the WATER side of a water/land boundary: a sand-toned
 * bank lip plus a foam line, or shore-fast ice in winter. `mask` bits match
 * the edge-mask convention (1=N, 2=E, 4=S, 8=W in grid space).
 */
function generateShorelineMask(renderer: Renderer, mask: number, winter: boolean): Texture {
  const g = new Graphics();
  normalizeMaskBounds(g);
  if (mask === 0) {
    drawTileDiamond(g);
    g.fill({ color: 0x000000, alpha: 0 });
    const empty = renderer.generateTexture(g);
    g.destroy();
    return empty;
  }

  const drawShore = (
    x1: number, y1: number, x2: number, y2: number,
    nx: number, ny: number, edgeSalt: number,
  ) => {
    if (winter) {
      // Shore-fast ice: a brighter frozen collar against the bank.
      g.poly([
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        { x: x2 + nx * 1.1, y: y2 + ny * 1.1 },
        { x: x1 + nx * 1.1, y: y1 + ny * 1.1 },
      ]);
      g.fill({ color: 0xE2EAF0, alpha: 0.55 });
      // Ridge line where sheet ice meets shore-fast ice
      g.moveTo(x1 + nx * 1.1, y1 + ny * 1.1);
      g.lineTo(x2 + nx * 1.1, y2 + ny * 1.1);
      g.stroke({ width: 0.6, color: 0x8FA0B0, alpha: 0.5 });
      return;
    }

    // Submerged bank: shallow water warms toward the shore.
    g.poly([
      { x: x1, y: y1 },
      { x: x2, y: y2 },
      { x: x2 + nx * 1.3, y: y2 + ny * 1.3 },
      { x: x1 + nx * 1.3, y: y1 + ny * 1.3 },
    ]);
    g.fill({ color: 0x5E7D82, alpha: 0.45 });

    // Foam line hugging the boundary, broken into segments.
    for (let seg = 0; seg < 3; seg++) {
      const h = varHash(mask * 57 + seg * 41, edgeSalt);
      const t0 = seg * 0.34 + (h % 8) / 100;
      const t1 = t0 + 0.16 + ((h >> 4) % 12) / 100;
      const fx0 = x1 + (x2 - x1) * t0 + nx * 0.35;
      const fy0 = y1 + (y2 - y1) * t0 + ny * 0.35;
      const fx1 = x1 + (x2 - x1) * Math.min(t1, 0.97) + nx * 0.35;
      const fy1 = y1 + (y2 - y1) * Math.min(t1, 0.97) + ny * 0.35;
      g.moveTo(fx0, fy0);
      g.lineTo(fx1, fy1);
      g.stroke({ width: 1, color: PALETTE.WATER_FOAM, alpha: 0.55 });
    }
    // Foam flecks
    for (let i = 0; i < 4; i++) {
      const h = varHash(mask * 91 + i * 17, edgeSalt + 5);
      const t = 0.1 + (h % 80) / 100;
      const px = x1 + (x2 - x1) * t + nx * (0.5 + ((h >> 8) % 40) / 100);
      const py = y1 + (y2 - y1) * t + ny * (0.5 + ((h >> 8) % 40) / 100);
      g.circle(px, py, 0.5 + ((h >> 4) % 2) * 0.3);
      g.fill({ color: PALETTE.WATER_FOAM, alpha: 0.4 });
    }
  };

  if (mask & 1) drawShore(TILE_HALF_W, 0, TILE_HALF_W * 2, TILE_HALF_H, -4, 4, 13);
  if (mask & 2) drawShore(TILE_HALF_W * 2, TILE_HALF_H, TILE_HALF_W, TILE_HALF_H * 2, -4, -4, 29);
  if (mask & 4) drawShore(TILE_HALF_W, TILE_HALF_H * 2, 0, TILE_HALF_H, 4, -4, 53);
  if (mask & 8) drawShore(0, TILE_HALF_H, TILE_HALF_W, 0, 4, 4, 97);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

/**
 * Far-zoom forest canopy: massed crown blobs instead of individual trees, so
 * distant forests read as continuous woodland rather than aliasing speckle.
 */
function generateFarForestTile(renderer: Renderer, variant: number, season: TerrainSeason | null): Texture {
  const g = new Graphics();
  normalizeTileBounds(g);
  const base = season === 'winter' ? 0xC9CFCB
    : season === 'autumn' ? 0x6E5C36
    : season === 'spring' ? 0x477E33
    : PALETTE.FOREST_GREEN;
  const crown = season === 'winter' ? 0x3E5A34
    : season === 'autumn' ? 0x8A6A2A
    : season === 'spring' ? 0x568F3A
    : PALETTE.GREEN_DARK;
  const crownLight = season === 'winter' ? 0xEDF2EE
    : season === 'autumn' ? 0xB08432
    : season === 'spring' ? 0x6FA84C
    : 0x477E33;

  drawTileDiamond(g);
  g.fill(base);

  // Overlapping crown blobs spanning the tile, offset per variant.
  const blobSets = [
    [
      { x: -8, y: -3, rx: 12, ry: 6 },
      { x: 7, y: 2, rx: 11, ry: 6 },
      { x: -2, y: 5, rx: 9, ry: 5 },
    ],
    [
      { x: -10, y: 1, rx: 10, ry: 5 },
      { x: 3, y: -4, rx: 12, ry: 6 },
      { x: 9, y: 4, rx: 8, ry: 4 },
    ],
    [
      { x: -4, y: -5, rx: 11, ry: 5 },
      { x: -9, y: 4, rx: 9, ry: 5 },
      { x: 8, y: -1, rx: 10, ry: 6 },
    ],
  ];
  for (const b of blobSets[variant]) {
    g.ellipse(TILE_HALF_W + b.x, TILE_HALF_H + b.y, b.rx, b.ry);
    g.fill({ color: crown, alpha: season === 'winter' ? 0.85 : 1 });
  }
  // Lit crown tops (top-left sun)
  for (const b of blobSets[variant]) {
    g.ellipse(TILE_HALF_W + b.x - 2, TILE_HALF_H + b.y - 2, b.rx * 0.5, b.ry * 0.5);
    g.fill({ color: crownLight, alpha: 0.5 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateEmptyOverlay(renderer: Renderer): Texture {
  const g = new Graphics();
  drawTileDiamond(g);
  g.fill({ color: 0x000000, alpha: 0 });
  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateTerrainDecal(renderer: Renderer, variant: number): Texture {
  const g = new Graphics();
  drawTileDiamond(g);
  g.fill({ color: 0x000000, alpha: 0 });

  const sets = [
    [
      { x: TILE_HALF_W - 10, y: TILE_HALF_H + 4, r: 1.2 },
      { x: TILE_HALF_W + 8, y: TILE_HALF_H - 2, r: 1.1 },
      { x: TILE_HALF_W + 1, y: TILE_HALF_H + 8, r: 0.9 },
    ],
    [
      { x: TILE_HALF_W - 6, y: TILE_HALF_H - 4, r: 1.1 },
      { x: TILE_HALF_W + 6, y: TILE_HALF_H + 5, r: 1.3 },
      { x: TILE_HALF_W - 2, y: TILE_HALF_H + 2, r: 1.0 },
      { x: TILE_HALF_W + 11, y: TILE_HALF_H, r: 0.8 },
    ],
    [
      { x: TILE_HALF_W - 7, y: TILE_HALF_H + 6, r: 1.1 },
      { x: TILE_HALF_W + 3, y: TILE_HALF_H - 6, r: 1.0 },
      { x: TILE_HALF_W + 9, y: TILE_HALF_H + 3, r: 1.0 },
    ],
  ];

  for (const p of sets[variant]) {
    g.circle(p.x, p.y, p.r);
    g.fill({ color: 0x4A4230, alpha: 0.12 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

/**
 * Warm ground pool cast by a street lamp at night. Rendered above the night
 * ambience veil, faded in with night intensity.
 */
function generateLampPoolTexture(renderer: Renderer): Texture {
  const g = new Graphics();
  const cx = 16;
  const cy = 8;
  g.rect(0, 0, 32, 16);
  g.fill({ color: 0x000000, alpha: 0 });
  g.ellipse(cx, cy, 15, 7.5);
  g.fill({ color: 0xFFD9A0, alpha: 0.10 });
  g.ellipse(cx, cy, 10, 5);
  g.fill({ color: 0xFFDFAC, alpha: 0.14 });
  g.ellipse(cx, cy, 5.5, 2.8);
  g.fill({ color: 0xFFE9C4, alpha: 0.20 });
  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

/**
 * Soft diamond contact shadow under buildings. BuildingRenderer scales it to
 * the footprint's base diamond; layered fills give a feathered edge.
 */
function generateBuildingShadowTexture(renderer: Renderer): Texture {
  const g = new Graphics();
  normalizeMaskBounds(g);
  const cx = TILE_HALF_W;
  const cy = TILE_HALF_H;
  const diamond = (scale: number): { x: number; y: number }[] => [
    { x: cx, y: cy - TILE_HALF_H * scale },
    { x: cx + TILE_HALF_W * scale, y: cy },
    { x: cx, y: cy + TILE_HALF_H * scale },
    { x: cx - TILE_HALF_W * scale, y: cy },
  ];
  g.poly(diamond(1));
  g.fill({ color: 0x000000, alpha: 0.08 });
  g.poly(diamond(0.8));
  g.fill({ color: 0x000000, alpha: 0.08 });
  g.poly(diamond(0.6));
  g.fill({ color: 0x000000, alpha: 0.08 });
  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

type PropType = 'lamp' | 'fence' | 'kiosk' | 'courtyard' | 'pole' | 'bus_stop'
  | 'statue' | 'bench' | 'flowerbed' | 'flagpole';

function generatePropTexture(renderer: Renderer, type: PropType): Texture {
  const g = new Graphics();
  g.rect(0, 0, TILE_HALF_W * 2, TILE_HALF_H * 2);
  g.fill({ color: 0x000000, alpha: 0 });

  const cx = TILE_HALF_W;
  const cy = TILE_HALF_H + 7;

  if (type === 'lamp') {
    // Enhanced lamp with proper post and glow
    g.rect(cx - 1, cy - 15, 2, 15);
    g.fill(0x444444);
    // Lamp arm
    g.moveTo(cx, cy - 14);
    g.lineTo(cx + 4, cy - 16);
    g.stroke({ width: 1, color: 0x555555 });
    g.circle(cx + 4, cy - 16, 2.3);
    g.fill(0xE8D48A);
    g.circle(cx + 4, cy - 16, 5);
    g.fill({ color: PALETTE.LAMP_GLOW, alpha: 0.18 });
  } else if (type === 'fence') {
    for (let i = -1; i <= 2; i++) {
      const x = cx - 10 + i * 6;
      g.rect(x, cy - 6 - i, 2, 7);
      g.fill(0x5A5A5A);
    }
    g.rect(cx - 12, cy - 3, 26, 2);
    g.fill(0x7A7A7A);
  } else if (type === 'kiosk') {
    // Enhanced kiosk with counter + awning
    g.rect(cx - 9, cy - 11, 18, 11);
    g.fill(0xA26040);
    // Awning
    g.poly([
      { x: cx - 11, y: cy - 13 },
      { x: cx + 11, y: cy - 13 },
      { x: cx + 13, y: cy - 10 },
      { x: cx - 13, y: cy - 10 },
    ]);
    g.fill(PALETTE.RED_DARK);
    // Awning stripes
    for (let i = 0; i < 4; i++) {
      g.moveTo(cx - 10 + i * 6, cy - 13);
      g.lineTo(cx - 10 + i * 6 + 1, cy - 10);
      g.stroke({ width: 0.6, color: 0xFFFFFF, alpha: 0.3 });
    }
    // Windows
    g.rect(cx - 5, cy - 8, 4, 4);
    g.fill(0x87CEEB);
    g.rect(cx + 1, cy - 8, 4, 4);
    g.fill(0x87CEEB);
    // Counter shelf
    g.rect(cx - 8, cy - 2, 16, 2);
    g.fill(0x8B5030);
  } else if (type === 'courtyard') {
    // Enhanced courtyard with bench + path
    // Gravel path
    g.ellipse(cx, cy - 2, 10, 4);
    g.fill({ color: 0x9A8A6A, alpha: 0.3 });
    // Greenery
    g.circle(cx - 5, cy - 6, 5);
    g.fill(0x3F6F2D);
    g.circle(cx + 4, cy - 5, 4);
    g.fill(0x467A31);
    // Bench
    g.rect(cx - 3, cy - 1, 8, 2);
    g.fill(0x6B4A30);
    g.rect(cx - 3, cy - 3, 1, 3);
    g.fill(0x5A3A20);
    g.rect(cx + 4, cy - 3, 1, 3);
    g.fill(0x5A3A20);
  } else if (type === 'pole') {
    g.rect(cx - 1, cy - 16, 2, 16);
    g.fill(0x696969);
    g.rect(cx - 9, cy - 12, 18, 2);
    g.fill(0x777777);
    g.rect(cx - 9, cy - 11, 1, 4);
    g.fill(0x4A4A4A);
    g.rect(cx + 8, cy - 11, 1, 4);
    g.fill(0x4A4A4A);
  } else if (type === 'bus_stop') {
    // Enhanced bus stop with bench + route sign
    g.rect(cx - 10, cy - 11, 20, 10);
    g.fill({ color: 0x5B5B5B, alpha: 0.68 });
    g.rect(cx - 11, cy - 13, 22, 3);
    g.fill(PALETTE.RED_DARK);
    g.rect(cx - 6, cy - 9, 5, 5);
    g.fill(0x87CEEB);
    g.rect(cx + 2, cy - 9, 5, 5);
    g.fill(0x87CEEB);
    // Support post
    g.rect(cx + 10, cy - 15, 2, 16);
    g.fill(0x505050);
    // Route sign
    g.rect(cx + 9, cy - 17, 4, 3);
    g.fill(0xFFFFFF);
    g.rect(cx + 10, cy - 16, 2, 1);
    g.fill(PALETTE.RED);
    // Bench
    g.rect(cx - 8, cy - 2, 10, 2);
    g.fill(0x6B4A30);
  } else if (type === 'statue') {
    // Lenin bust on pedestal
    // Pedestal base
    g.rect(cx - 6, cy - 3, 12, 3);
    g.fill(0x888888);
    // Pedestal column
    g.rect(cx - 4, cy - 12, 8, 10);
    g.fill(0x999999);
    // Bust (head shape)
    g.ellipse(cx, cy - 16, 4, 5);
    g.fill(0x777777);
    // Shoulders
    g.rect(cx - 5, cy - 13, 10, 3);
    g.fill(0x777777);
    // Plaque
    g.rect(cx - 3, cy - 5, 6, 2);
    g.fill(PALETTE.GOLD);
  } else if (type === 'bench') {
    // Park bench
    g.rect(cx - 8, cy - 2, 16, 2);
    g.fill(0x6B4A30);
    // Back rest
    g.rect(cx - 8, cy - 5, 16, 2);
    g.fill(0x7B5A40);
    // Legs
    g.rect(cx - 7, cy, 2, 3);
    g.fill(0x4A4A4A);
    g.rect(cx + 5, cy, 2, 3);
    g.fill(0x4A4A4A);
  } else if (type === 'flowerbed') {
    // Circular flowerbed
    g.ellipse(cx, cy - 3, 9, 5);
    g.fill(PALETTE.DIRT_BROWN);
    // Flower dots in concentric arrangement
    const flowerColors = [0xFF4444, 0xFFAA33, 0xFFFF44, 0xFF66AA, 0xAA44FF];
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI * 2 / 8;
      const fx = cx + Math.cos(angle) * 6;
      const fy = cy - 3 + Math.sin(angle) * 3;
      g.circle(fx, fy, 1.2);
      g.fill(flowerColors[i % flowerColors.length]);
    }
    // Center flowers
    g.circle(cx, cy - 3, 1.5);
    g.fill(0xFF3333);
    g.circle(cx + 2, cy - 2, 1.2);
    g.fill(0xFFAA33);
    // Leaves
    g.ellipse(cx, cy - 3, 8, 4);
    g.fill({ color: PALETTE.GREEN, alpha: 0.3 });
  } else if (type === 'flagpole') {
    // Flagpole with red flag
    g.rect(cx - 1, cy - 22, 2, 22);
    g.fill(0x696969);
    // Flag (red, waving)
    g.poly([
      { x: cx + 1, y: cy - 22 },
      { x: cx + 14, y: cy - 20 },
      { x: cx + 12, y: cy - 15 },
      { x: cx + 1, y: cy - 14 },
    ]);
    g.fill(PALETTE.RED);
    // Flag highlight
    g.poly([
      { x: cx + 3, y: cy - 21 },
      { x: cx + 10, y: cy - 20 },
      { x: cx + 9, y: cy - 18 },
      { x: cx + 3, y: cy - 18 },
    ]);
    g.fill({ color: PALETTE.RED_LIGHT, alpha: 0.4 });
    // Gold finial
    g.circle(cx, cy - 23, 1.5);
    g.fill(PALETTE.GOLD);
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== SEASONAL VARIANTS =====

function generateSeasonalGround(renderer: Renderer, variant: number, season: TerrainSeason): Texture {
  const g = new Graphics();
  normalizeTileBounds(g);
  drawTileDiamond(g);

  if (season === 'winter') {
    g.fill(0xE8E8E8);
    const patches = 3 + variant % 3;
    for (let i = 0; i < patches; i++) {
      const h = varHash(variant * 100 + i, 42);
      const px = TILE_HALF_W + ((h % 30) - 15);
      const py = TILE_HALF_H + (((h >> 8) % 16) - 8);
      g.ellipse(px, py, 4 + (h >> 4) % 3, 2);
      g.fill({ color: 0x8A7A60, alpha: 0.2 + variant * 0.02 });
    }
    for (let i = 0; i < 3; i++) {
      const h = varHash(variant * 50 + i, 77);
      const px = TILE_HALF_W + ((h % 24) - 12);
      const py = TILE_HALF_H + (((h >> 8) % 14) - 7);
      g.moveTo(px, py);
      g.lineTo(px + 3, py + 1);
      g.stroke({ width: 0.6, color: 0xD0D0D0, alpha: 0.3 });
    }
  } else if (season === 'autumn') {
    g.fill(0x9A8A5A + variant * 0x020101);
    const tufts = 6 + variant % 3;
    for (let i = 0; i < tufts; i++) {
      const h = varHash(variant * 100 + i, 42);
      const px = TILE_HALF_W + ((h % 36) - 18);
      const py = TILE_HALF_H + (((h >> 8) % 20) - 10);
      g.moveTo(px, py);
      g.lineTo(px + 2, py + 1);
      g.stroke({ width: 0.7, color: 0x7A6A30, alpha: 0.2 });
    }
  } else {
    g.fill(0x7AAA58 + variant * 0x020302);
    const flowers = 3 + variant % 4;
    const flowerColors = [0xFFFF66, 0xFF8888, 0xFFAAFF, 0xFFFFFF];
    for (let i = 0; i < flowers; i++) {
      const h = varHash(variant * 100 + i, 42);
      const px = TILE_HALF_W + ((h % 30) - 15);
      const py = TILE_HALF_H + (((h >> 8) % 16) - 8);
      g.circle(px, py, 1);
      g.fill({ color: flowerColors[i % flowerColors.length], alpha: 0.5 });
    }
    for (let i = 0; i < 5; i++) {
      const h = varHash(variant * 80 + i, 55);
      const px = TILE_HALF_W + ((h % 32) - 16);
      const py = TILE_HALF_H + (((h >> 8) % 18) - 9);
      g.moveTo(px, py);
      g.lineTo(px + 2, py + 0.5);
      g.stroke({ width: 0.7, color: 0x3A8A1A, alpha: 0.25 });
    }
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateSeasonalForest(renderer: Renderer, variant: number, season: TerrainSeason): Texture {
  const g = new Graphics();
  normalizeTileBounds(g);
  drawTileDiamond(g);

  // Use variant-based tree positions for diversity (matches summer forest)
  const treeLayouts = [
    [
      { x: -8, y: -5, type: 'c', h: 12 },
      { x: 6, y: -1, type: 'c', h: 10 },
      { x: -1, y: 5, type: 'b', h: 11 },
      { x: -12, y: 2, type: 'c', h: 9 },
    ],
    [
      { x: -10, y: -2, type: 'b', h: 11 },
      { x: 4, y: -6, type: 'c', h: 13 },
      { x: 7, y: 4, type: 'c', h: 10 },
      { x: -4, y: 6, type: 'b', h: 9 },
      { x: -7, y: -7, type: 'c', h: 8 },
    ],
    [
      { x: -6, y: -6, type: 'c', h: 14 },
      { x: 3, y: 1, type: 'b', h: 10 },
      { x: -10, y: 3, type: 'c', h: 11 },
      { x: 8, y: -3, type: 'c', h: 9 },
    ],
    [
      { x: -3, y: -4, type: 'c', h: 16 },
      { x: 8, y: 2, type: 'b', h: 10 },
      { x: -9, y: 1, type: 'b', h: 12 },
      { x: 4, y: -7, type: 'c', h: 9 },
      { x: -5, y: 6, type: 'c', h: 8 },
    ],
    [
      { x: -11, y: -3, type: 'c', h: 11 },
      { x: 2, y: -5, type: 'b', h: 13 },
      { x: 9, y: 1, type: 'c', h: 10 },
      { x: -2, y: 4, type: 'c', h: 12 },
      { x: 6, y: -1, type: 'b', h: 8 },
    ],
  ];
  const trees = treeLayouts[variant];

  if (season === 'winter') {
    g.fill(0xDCDCDC);
    for (const t of trees) {
      const tx = TILE_HALF_W + t.x;
      const ty = TILE_HALF_H + t.y;
      if (t.type === 'b') {
        // Bare birch trunks in winter (no canopy, just branches)
        g.rect(tx - 1, ty - 4, 2, 6);
        g.fill(PALETTE.BIRCH_TRUNK);
        g.rect(tx - 1, ty - 3, 2, 1);
        g.fill({ color: 0x444444, alpha: 0.3 });
        // Bare branch stubs
        g.moveTo(tx, ty - 4);
        g.lineTo(tx - 3, ty - 6);
        g.moveTo(tx, ty - 3);
        g.lineTo(tx + 2, ty - 5);
        g.stroke({ width: 0.5, color: PALETTE.BIRCH_TRUNK, alpha: 0.6 });
      } else {
        // Evergreen conifers stay dark green with snow caps
        g.rect(tx - 1, ty - 2, 2, 4);
        g.fill(PALETTE.TREE_TRUNK);
        g.poly([
          { x: tx, y: ty - t.h }, { x: tx - 5, y: ty - 2 }, { x: tx + 5, y: ty - 2 },
        ]);
        g.fill(PALETTE.GREEN_DARK);
        // Snow cap on top
        g.poly([
          { x: tx, y: ty - t.h - 1 }, { x: tx - 3, y: ty - t.h + 3 }, { x: tx + 3, y: ty - t.h + 3 },
        ]);
        g.fill({ color: 0xF0F0F0, alpha: 0.7 });
      }
    }
  } else if (season === 'autumn') {
    g.fill(0x6A5A3A);
    const autumnColors = [0xCC6622, 0xDD4422, 0x558B2F, 0xBB8822, 0xAA3311];
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      const tx = TILE_HALF_W + t.x;
      const ty = TILE_HALF_H + t.y;
      g.rect(tx - 1, ty - 2, 2, 4);
      g.fill(PALETTE.TREE_TRUNK);
      if (t.type === 'c') {
        // Conifers stay green in autumn
        g.poly([
          { x: tx, y: ty - t.h }, { x: tx - 5, y: ty - 2 }, { x: tx + 5, y: ty - 2 },
        ]);
        g.fill(PALETTE.GREEN_DARK);
      } else {
        // Deciduous trees get autumn colors
        g.poly([
          { x: tx, y: ty - t.h }, { x: tx - 5, y: ty - 2 }, { x: tx + 5, y: ty - 2 },
        ]);
        g.fill(autumnColors[(i + variant) % autumnColors.length]);
      }
    }
    // Fallen leaves
    for (let i = 0; i < 4; i++) {
      const h = varHash(variant * 60 + i, 33);
      const lx = TILE_HALF_W + ((h % 24) - 12);
      const ly = TILE_HALF_H + (((h >> 8) % 14) - 7);
      g.ellipse(lx, ly, 1.5, 1);
      g.fill({ color: autumnColors[(i + variant) % autumnColors.length], alpha: 0.4 });
    }
  } else {
    // Spring
    g.fill(0x4A8A30);
    for (const t of trees) {
      const tx = TILE_HALF_W + t.x;
      const ty = TILE_HALF_H + t.y;
      g.ellipse(tx + 1, ty + 2, 4, 2);
      g.fill({ color: 0x1A1A1A, alpha: 0.1 });
      if (t.type === 'b') {
        drawBirch(g, tx, ty, t.h);
      } else {
        drawConifer(g, tx, ty, t.h);
      }
    }
    // Spring wildflowers
    for (let i = 0; i < 3; i++) {
      const h = varHash(variant * 70 + i, 44);
      const fx = TILE_HALF_W + ((h % 20) - 10);
      const fy = TILE_HALF_H + (((h >> 8) % 12) - 6);
      g.circle(fx, fy, 0.8);
      g.fill({ color: 0xFFFF88, alpha: 0.5 });
    }
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateSeasonalWater(renderer: Renderer, variant: number, season: TerrainSeason): Texture {
  const g = new Graphics();
  normalizeTileBounds(g);
  drawTileDiamond(g);

  if (season === 'winter') {
    // Frozen sheet: clearly ice, not dark water. Matte pale blue-grey with
    // long pressure cracks and drifted snow patches.
    g.fill(0x9FAEBD + variant * 0x020202);
    // Long pressure cracks crossing much of the tile
    for (let i = 0; i < 2 + variant % 2; i++) {
      const h = varHash(variant * 40 + i, 55);
      const sx = TILE_HALF_W - 12 + (h % 8);
      const sy = TILE_HALF_H - 5 + ((h >> 8) % 10);
      const mx = sx + 8 + (h >> 4) % 6;
      const my = sy + ((h >> 6) % 5) - 2;
      const ex = sx + 18 + (h >> 5) % 6;
      const ey = sy + ((h >> 7) % 7) - 3;
      g.moveTo(sx, sy);
      g.lineTo(mx, my);
      g.lineTo(ex, ey);
      g.stroke({ width: 0.6, color: 0x7A8A9A, alpha: 0.55 });
      // Short branch off the main crack
      g.moveTo(mx, my);
      g.lineTo(mx + 3, my - 3);
      g.stroke({ width: 0.4, color: 0x7A8A9A, alpha: 0.4 });
    }
    // Drifted snow patches on the ice
    for (let i = 0; i < 2 + variant % 2; i++) {
      const h = varHash(variant * 90 + i, 23);
      const px = TILE_HALF_W + ((h % 26) - 13);
      const py = TILE_HALF_H + (((h >> 8) % 14) - 7);
      g.ellipse(px, py, 5 + (h >> 4) % 4, 2.5);
      g.fill({ color: 0xE6EDF2, alpha: 0.5 });
    }
    // Faint frozen sheen
    g.ellipse(TILE_HALF_W, TILE_HALF_H, 10, 5);
    g.fill({ color: 0xDDEEFF, alpha: 0.10 });
  } else if (season === 'autumn') {
    g.fill(0x3E5A6A);
    for (let i = 0; i < 3; i++) {
      const yOff = TILE_HALF_H - 4 + i * 4;
      g.moveTo(TILE_HALF_W - 10, yOff);
      g.bezierCurveTo(TILE_HALF_W - 5, yOff - 2, TILE_HALF_W + 5, yOff + 2, TILE_HALF_W + 10, yOff);
      g.stroke({ width: 0.8, color: 0x5A7A8A, alpha: 0.3 });
    }
  } else {
    g.fill(0x4A7A90);
    for (let i = 0; i < 3; i++) {
      const yOff = TILE_HALF_H - 5 + i * 4;
      g.moveTo(TILE_HALF_W - 10, yOff);
      g.bezierCurveTo(TILE_HALF_W - 4, yOff - 1, TILE_HALF_W + 4, yOff + 1, TILE_HALF_W + 10, yOff);
      g.stroke({ width: 0.7, color: PALETTE.WATER_LIGHT, alpha: 0.35 });
    }
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateSeasonalDirt(renderer: Renderer, variant: number, season: TerrainSeason): Texture {
  const g = new Graphics();
  normalizeTileBounds(g);
  drawTileDiamond(g);

  if (season === 'winter') {
    g.fill(0x7A7060);
    for (let i = 0; i < 3; i++) {
      const h = varHash(variant * 50 + i, 66);
      const px = TILE_HALF_W + ((h % 22) - 11);
      const py = TILE_HALF_H + (((h >> 8) % 14) - 7);
      g.ellipse(px, py, 4, 2);
      g.fill({ color: 0xDDDDDD, alpha: 0.25 });
    }
  } else if (season === 'autumn') {
    g.fill(0x6A5A3A);
    for (let i = 0; i < 2; i++) {
      const h = varHash(variant * 40 + i, 77);
      const px = TILE_HALF_W + ((h % 18) - 9);
      const py = TILE_HALF_H + (((h >> 8) % 12) - 6);
      g.ellipse(px, py, 5, 2.5);
      g.fill({ color: PALETTE.DIRT_WET, alpha: 0.3 });
    }
  } else {
    g.fill(0x7A6C48);
    for (let i = 0; i < 4; i++) {
      const h = varHash(variant * 60 + i, 88);
      const px = TILE_HALF_W + ((h % 24) - 12);
      const py = TILE_HALF_H + (((h >> 8) % 16) - 8);
      g.moveTo(px, py);
      g.lineTo(px + 2, py - 1);
      g.stroke({ width: 0.6, color: 0x4A8A2A, alpha: 0.3 });
    }
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateSeasonalHill(renderer: Renderer, variant: number, season: TerrainSeason): Texture {
  const g = new Graphics();
  normalizeTileBounds(g);
  drawTileDiamond(g);

  if (season === 'winter') {
    g.fill(0xC8C8C0);
    for (let i = 0; i < 2; i++) {
      const h = varHash(variant * 30 + i, 44);
      const px = TILE_HALF_W + ((h % 16) - 8);
      const py = TILE_HALF_H + (((h >> 8) % 10) - 5);
      g.poly([
        { x: px - 3, y: py }, { x: px + 2, y: py - 3 },
        { x: px + 5, y: py + 1 }, { x: px, y: py + 3 },
      ]);
      g.fill({ color: PALETTE.HILL_ROCK, alpha: 0.5 });
    }
  } else if (season === 'autumn') {
    g.fill(0x8A8A70);
    g.poly([
      { x: TILE_HALF_W - 6, y: TILE_HALF_H - 2 },
      { x: TILE_HALF_W + 2, y: TILE_HALF_H - 6 },
      { x: TILE_HALF_W + 8, y: TILE_HALF_H + 1 },
      { x: TILE_HALF_W, y: TILE_HALF_H + 3 },
    ]);
    g.fill(PALETTE.HILL_ROCK);
  } else {
    g.fill(0x7A8A68);
    g.poly([
      { x: TILE_HALF_W - 6, y: TILE_HALF_H - 2 },
      { x: TILE_HALF_W + 2, y: TILE_HALF_H - 6 },
      { x: TILE_HALF_W + 8, y: TILE_HALF_H + 1 },
      { x: TILE_HALF_W, y: TILE_HALF_H + 3 },
    ]);
    g.fill(PALETTE.HILL_ROCK);
    g.ellipse(TILE_HALF_W - 3, TILE_HALF_H + 2, 3, 1.5);
    g.fill({ color: PALETTE.LICHEN, alpha: 0.35 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}
