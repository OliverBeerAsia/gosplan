import { Graphics, Renderer, Texture } from 'pixi.js';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { PALETTE } from './SovietPalette';

export function generateTerrainTextures(renderer: Renderer): Map<string, Texture> {
  const textures = new Map<string, Texture>();

  for (let v = 0; v < 3; v++) {
    textures.set(`ground_${v}`, generateGroundTile(renderer, v));
    textures.set(`dirt_${v}`, generateDirtTile(renderer, v));
    textures.set(`forest_${v}`, generateForestTile(renderer, v));
  }
  for (let v = 0; v < 2; v++) {
    textures.set(`water_${v}`, generateWaterTile(renderer, v));
    textures.set(`hill_${v}`, generateHillTile(renderer, v));
  }

  textures.set('ground', textures.get('ground_0')!);
  textures.set('dirt', textures.get('dirt_0')!);
  textures.set('forest', textures.get('forest_0')!);
  textures.set('water', textures.get('water_0')!);
  textures.set('hill', textures.get('hill_0')!);

  textures.set('ground_highlight', generateHighlightTile(renderer, 0x00FF00, 0.3));
  textures.set('ground_invalid', generateHighlightTile(renderer, 0xFF0000, 0.3));
  textures.set('power_overlay', generateHighlightTile(renderer, 0xFFFF00, 0.25));
  textures.set('service_overlay', generateHighlightTile(renderer, 0x00C8FF, 0.25));

  for (let mask = 0; mask < 16; mask++) {
    textures.set(`terrain_edge_${mask}`, generateTerrainEdgeMask(renderer, mask));
  }

  textures.set('terrain_decal_0', generateEmptyOverlay(renderer));
  textures.set('terrain_decal_1', generateTerrainDecal(renderer, 0));
  textures.set('terrain_decal_2', generateTerrainDecal(renderer, 1));
  textures.set('terrain_decal_3', generateTerrainDecal(renderer, 2));

  textures.set('zone_housing', generateZoneTile(renderer, 0x4CAF50, 'diag'));
  textures.set('zone_industry', generateZoneTile(renderer, 0xFF9800, 'cross'));
  textures.set('zone_civic', generateZoneTile(renderer, 0x03A9F4, 'grid'));
  textures.set('zone_green', generateZoneTile(renderer, 0x8BC34A, 'dots'));

  textures.set('prop_none', generateEmptyOverlay(renderer));
  textures.set('prop_lamp', generatePropTexture(renderer, 'lamp'));
  textures.set('prop_fence', generatePropTexture(renderer, 'fence'));
  textures.set('prop_kiosk', generatePropTexture(renderer, 'kiosk'));
  textures.set('prop_courtyard', generatePropTexture(renderer, 'courtyard'));
  textures.set('prop_pole', generatePropTexture(renderer, 'pole'));
  textures.set('prop_bus_stop', generatePropTexture(renderer, 'bus_stop'));

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

function generateGroundTile(renderer: Renderer, variant: number): Texture {
  const g = new Graphics();
  drawTileDiamond(g);
  g.fill(PALETTE.GROUND + variant * 0x030303);

  // Subtle tile-edge seam (no 3D height illusion)
  drawTileDiamond(g);
  g.stroke({ width: 0.5, color: PALETTE.GROUND_EDGE, alpha: 0.15 });

  // Patchy brush marks to reduce visual repetition.
  const patchAlpha = 0.12 + variant * 0.04;
  for (let i = 0; i < 4; i++) {
    const px = TILE_HALF_W + (i - 1.5) * 6;
    const py = TILE_HALF_H + ((i % 2) * 2 - 1) * 3;
    g.ellipse(px, py, 5, 2);
    g.fill({ color: PALETTE.GROUND_EDGE, alpha: patchAlpha });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateWaterTile(renderer: Renderer, variant: number): Texture {
  const g = new Graphics();
  drawTileDiamond(g);
  g.fill(variant === 0 ? PALETTE.WATER : 0x466578);

  const waveY = TILE_HALF_H + (variant === 0 ? 0 : 1);
  g.moveTo(TILE_HALF_W - 10, waveY - 3);
  g.lineTo(TILE_HALF_W + 10, waveY - 3);
  g.stroke({ width: 1, color: PALETTE.WATER_LIGHT, alpha: 0.45 });
  g.moveTo(TILE_HALF_W - 7, waveY + 4);
  g.lineTo(TILE_HALF_W + 7, waveY + 4);
  g.stroke({ width: 1, color: PALETTE.WATER_LIGHT, alpha: 0.35 });

  drawTileDiamond(g);
  g.stroke({ width: 0.5, color: 0x2A4353, alpha: 0.45 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateForestTile(renderer: Renderer, variant: number): Texture {
  const g = new Graphics();
  drawTileDiamond(g);
  g.fill(variant === 0 ? PALETTE.FOREST_GREEN : variant === 1 ? 0x3A6A2C : 0x336026);

  drawTileDiamond(g);
  g.stroke({ width: 0.5, color: PALETTE.FOREST_DARK, alpha: 0.45 });

  const treePatterns = [
    [
      { x: TILE_HALF_W - 8, y: TILE_HALF_H - 5 },
      { x: TILE_HALF_W + 6, y: TILE_HALF_H - 1 },
      { x: TILE_HALF_W - 1, y: TILE_HALF_H + 5 },
    ],
    [
      { x: TILE_HALF_W - 10, y: TILE_HALF_H - 2 },
      { x: TILE_HALF_W + 4, y: TILE_HALF_H - 6 },
      { x: TILE_HALF_W + 7, y: TILE_HALF_H + 4 },
    ],
    [
      { x: TILE_HALF_W - 6, y: TILE_HALF_H - 6 },
      { x: TILE_HALF_W + 3, y: TILE_HALF_H + 1 },
      { x: TILE_HALF_W - 10, y: TILE_HALF_H + 3 },
    ],
  ];

  for (const tp of treePatterns[variant]) {
    g.rect(tp.x - 1, tp.y - 2, 2, 4);
    g.fill(PALETTE.TREE_TRUNK);
    g.poly([
      { x: tp.x, y: tp.y - 10 },
      { x: tp.x - 5, y: tp.y - 2 },
      { x: tp.x + 5, y: tp.y - 2 },
    ]);
    g.fill(PALETTE.GREEN_DARK);
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

function generateHillTile(renderer: Renderer, variant: number): Texture {
  const g = new Graphics();
  drawTileDiamond(g);
  g.fill(variant === 0 ? PALETTE.HILL_GREY : 0x838372);

  g.poly([
    { x: TILE_HALF_W - 7, y: TILE_HALF_H - 2 },
    { x: TILE_HALF_W + 1, y: TILE_HALF_H - 7 },
    { x: TILE_HALF_W + 9, y: TILE_HALF_H + 1 },
    { x: TILE_HALF_W - 1, y: TILE_HALF_H + 3 },
  ]);
  g.fill(PALETTE.HILL_ROCK);

  // Subtle rock striations
  for (let i = 0; i < 3; i++) {
    const y0 = TILE_HALF_H - 4 + i * 5;
    g.moveTo(TILE_HALF_W - 8 + i * 3, y0);
    g.lineTo(TILE_HALF_W - 3 + i * 3, y0 + 2);
    g.stroke({ width: 0.5, color: PALETTE.CONCRETE_DARK, alpha: 0.25 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateDirtTile(renderer: Renderer, variant: number): Texture {
  const g = new Graphics();
  drawTileDiamond(g);
  g.fill(variant === 0 ? PALETTE.DIRT_BROWN : variant === 1 ? 0x7D6F4E : 0x8E7C58);

  drawTileDiamond(g);
  g.stroke({ width: 0.5, color: 0x6B5D3A, alpha: 0.4 });

  const pebbleSets = [
    [
      { x: TILE_HALF_W - 6, y: TILE_HALF_H - 3 },
      { x: TILE_HALF_W + 5, y: TILE_HALF_H + 1 },
      { x: TILE_HALF_W - 2, y: TILE_HALF_H + 5 },
      { x: TILE_HALF_W + 9, y: TILE_HALF_H - 2 },
      { x: TILE_HALF_W - 10, y: TILE_HALF_H + 1 },
    ],
    [
      { x: TILE_HALF_W - 8, y: TILE_HALF_H - 1 },
      { x: TILE_HALF_W + 1, y: TILE_HALF_H - 4 },
      { x: TILE_HALF_W + 8, y: TILE_HALF_H + 4 },
      { x: TILE_HALF_W - 3, y: TILE_HALF_H + 6 },
    ],
    [
      { x: TILE_HALF_W - 5, y: TILE_HALF_H + 1 },
      { x: TILE_HALF_W + 6, y: TILE_HALF_H - 5 },
      { x: TILE_HALF_W + 10, y: TILE_HALF_H + 2 },
      { x: TILE_HALF_W - 9, y: TILE_HALF_H - 2 },
    ],
  ];

  for (const p of pebbleSets[variant]) {
    g.circle(p.x, p.y, 1.2);
    g.fill({ color: 0x7A6E4E, alpha: 0.55 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

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

  // Inset frame gives planning-map readability over dense terrain.
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

  // Small center glyph to separate zone types quickly.
  g.rect(TILE_HALF_W - 2, TILE_HALF_H - 2, 4, 4);
  g.fill({ color, alpha: 0.8 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function generateTerrainEdgeMask(renderer: Renderer, mask: number): Texture {
  const g = new Graphics();
  if (mask === 0) {
    drawTileDiamond(g);
    g.fill({ color: 0x000000, alpha: 0 });
    const empty = renderer.generateTexture(g);
    g.destroy();
    return empty;
  }

  const drawEdge = (x1: number, y1: number, x2: number, y2: number, nx: number, ny: number) => {
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke({ width: 1, color: 0x1B1B1B, alpha: 0.15 });

    g.poly([
      { x: x1, y: y1 },
      { x: x2, y: y2 },
      { x: x2 + nx, y: y2 + ny },
      { x: x1 + nx, y: y1 + ny },
    ]);
    g.fill({ color: 0x000000, alpha: 0.05 });
  };

  if (mask & 1) drawEdge(TILE_HALF_W, 0, TILE_HALF_W * 2, TILE_HALF_H, -4, 4); // N
  if (mask & 2) drawEdge(TILE_HALF_W * 2, TILE_HALF_H, TILE_HALF_W, TILE_HALF_H * 2, -4, -4); // E
  if (mask & 4) drawEdge(TILE_HALF_W, TILE_HALF_H * 2, 0, TILE_HALF_H, 4, -4); // S
  if (mask & 8) drawEdge(0, TILE_HALF_H, TILE_HALF_W, 0, 4, 4); // W

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
    g.fill({ color: 0x4A4230, alpha: 0.25 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

type PropType = 'lamp' | 'fence' | 'kiosk' | 'courtyard' | 'pole' | 'bus_stop';

function generatePropTexture(renderer: Renderer, type: PropType): Texture {
  const g = new Graphics();
  g.rect(0, 0, TILE_HALF_W * 2, TILE_HALF_H * 2);
  g.fill({ color: 0x000000, alpha: 0 });

  const cx = TILE_HALF_W;
  const cy = TILE_HALF_H + 7;

  if (type === 'lamp') {
    g.rect(cx - 1, cy - 15, 2, 15);
    g.fill(0x444444);
    g.circle(cx, cy - 16, 2.3);
    g.fill(0xE8D48A);
    g.circle(cx, cy - 16, 4);
    g.fill({ color: 0xE8D48A, alpha: 0.22 });
  } else if (type === 'fence') {
    for (let i = -1; i <= 2; i++) {
      const x = cx - 10 + i * 6;
      g.rect(x, cy - 6 - i, 2, 7);
      g.fill(0x5A5A5A);
    }
    g.rect(cx - 12, cy - 3, 26, 2);
    g.fill(0x7A7A7A);
  } else if (type === 'kiosk') {
    g.rect(cx - 9, cy - 11, 18, 11);
    g.fill(0xA26040);
    g.rect(cx - 10, cy - 13, 20, 3);
    g.fill(0xB71C1C);
    g.rect(cx - 5, cy - 8, 4, 4);
    g.fill(0x87CEEB);
    g.rect(cx + 1, cy - 8, 4, 4);
    g.fill(0x87CEEB);
  } else if (type === 'courtyard') {
    g.circle(cx - 3, cy - 6, 6);
    g.fill(0x3F6F2D);
    g.circle(cx + 3, cy - 5, 5);
    g.fill(0x467A31);
    g.rect(cx - 1, cy - 2, 2, 5);
    g.fill(0x5D4037);
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
    g.rect(cx - 10, cy - 11, 20, 10);
    g.fill({ color: 0x5B5B5B, alpha: 0.68 });
    g.rect(cx - 11, cy - 13, 22, 3);
    g.fill(0xB71C1C);
    g.rect(cx - 6, cy - 9, 5, 5);
    g.fill(0x87CEEB);
    g.rect(cx + 2, cy - 9, 5, 5);
    g.fill(0x87CEEB);
    g.rect(cx + 10, cy - 15, 2, 16);
    g.fill(0x505050);
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}
