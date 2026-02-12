import { Graphics, Renderer, Texture } from 'pixi.js';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { PALETTE } from './SovietPalette';

// Helper: draw an isometric box (left face, right face, top face)
function isoBox(
  g: Graphics,
  ox: number, oy: number,
  w: number, h: number, depth: number,
  topColor: number, leftColor: number, rightColor: number
) {
  // Top face
  g.poly([
    { x: ox, y: oy },
    { x: ox + w, y: oy + w / 2 },
    { x: ox, y: oy + w },
    { x: ox - w, y: oy + w / 2 },
  ]);
  g.fill(topColor);

  // Left face
  g.poly([
    { x: ox - w, y: oy + w / 2 },
    { x: ox, y: oy + w },
    { x: ox, y: oy + w + depth },
    { x: ox - w, y: oy + w / 2 + depth },
  ]);
  g.fill(leftColor);

  // Right face
  g.poly([
    { x: ox, y: oy + w },
    { x: ox + w, y: oy + w / 2 },
    { x: ox + w, y: oy + w / 2 + depth },
    { x: ox, y: oy + w + depth },
  ]);
  g.fill(rightColor);
}

// Helper: draw window grid on left face
function windowGridLeft(
  g: Graphics,
  ox: number, oy: number,
  faceW: number, faceH: number,
  rows: number, cols: number,
  color: number
) {
  const winW = faceW / (cols + 1);
  const winH = faceH / (rows + 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = ox - faceW + winW * (c + 0.5);
      const wy = oy + faceH * 0.15 + winH * r + winW * (c + 0.5) / 2;
      g.rect(wx + 1, wy + 1, winW * 0.5, winH * 0.6);
      g.fill(color);
    }
  }
}

// Helper: draw window grid on right face
function windowGridRight(
  g: Graphics,
  ox: number, oy: number,
  faceW: number, faceH: number,
  rows: number, cols: number,
  color: number
) {
  const winW = faceW / (cols + 1);
  const winH = faceH / (rows + 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = ox + winW * (c + 0.5);
      const wy = oy + faceH * 0.15 + winH * r - winW * (c + 0.5) / 2;
      g.rect(wx + 1, wy + 1, winW * 0.5, winH * 0.6);
      g.fill(color);
    }
  }
}

// Building drawing dimensions: each tile = TILE_WIDTH x TILE_HEIGHT in iso
// Multi-tile buildings span multiple tiles
// Building pixel dimensions are relative to tile footprint

function calcFootprint(tilesW: number, tilesH: number) {
  // footprint in pixel space
  const footW = (tilesW + tilesH) * TILE_HALF_W;
  const footH = (tilesW + tilesH) * TILE_HALF_H;
  const centerX = (tilesW - tilesH) * TILE_HALF_W;
  return { footW, footH, centerX };
}

export function generateBuildingTextures(renderer: Renderer): Map<string, Texture> {
  const textures = new Map<string, Texture>();

  textures.set('khrushchyovka', drawKhrushchyovka(renderer));
  textures.set('stalinka', drawStalinka(renderer));
  textures.set('kommunalka', drawKommunalka(renderer));
  textures.set('factory', drawFactory(renderer));
  textures.set('coal_power_plant', drawCoalPowerPlant(renderer));
  textures.set('party_hq', drawPartyHQ(renderer));
  textures.set('hospital', drawHospital(renderer));
  textures.set('school', drawSchool(renderer));
  for (let mask = 0; mask < 16; mask++) {
    textures.set(`road_${mask}`, drawRoad(renderer, mask));
    textures.set(`power_line_${mask}`, drawPowerLine(renderer, mask));
  }
  // Backward-compatible defaults used by hover ghosts and fallbacks.
  textures.set('road', textures.get('road_5')!);
  textures.set('power_line', textures.get('power_line_5')!);
  textures.set('park', drawPark(renderer));
  textures.set('monument', drawMonument(renderer));

  // New buildings
  textures.set('panelak', drawPanelak(renderer));
  textures.set('warehouse', drawWarehouse(renderer));
  textures.set('cinema', drawCinema(renderer));
  textures.set('radio_tower', drawRadioTower(renderer));
  textures.set('metro_station', drawMetroStation(renderer));
  textures.set('plaza', drawPlaza(renderer));
  textures.set('fountain', drawFountain(renderer));
  textures.set('sports_complex', drawSportsComplex(renderer));

  return textures;
}

// ===== RESIDENTIAL =====

function drawKhrushchyovka(renderer: Renderer): Texture {
  // 2x1 tile, 5-story grey prefab
  const g = new Graphics();
  const pad = 4;
  const bw = TILE_HALF_W * 1.4;
  const bh = 70; // tall building
  const ox = TILE_HALF_W * 2;
  const oy = bh + pad;

  // Main body
  isoBox(g, ox, oy - bh, bw, bw * 0.6, bh,
    PALETTE.CONCRETE_LIGHT, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK);

  // Windows on left face (5 rows x 4 cols)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) {
      const wx = ox - bw + 4 + c * 8;
      const wy = oy - bh + bw * 0.6 + 6 + r * 13 + c * 4;
      g.rect(wx, wy, 5, 8);
      g.fill(r % 2 === 0 ? PALETTE.WINDOW : PALETTE.WINDOW_DARK);
    }
  }

  // Windows on right face
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const wx = ox + 4 + c * 8;
      const wy = oy - bh + bw * 0.6 + 8 + r * 13 - c * 4;
      g.rect(wx, wy, 5, 8);
      g.fill(r % 2 === 1 ? PALETTE.WINDOW : PALETTE.WINDOW_DARK);
    }
  }

  // Rooftop antenna
  g.moveTo(ox - 5, oy - bh - 2);
  g.lineTo(ox - 5, oy - bh - 15);
  g.stroke({ width: 1, color: PALETTE.IRON });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawStalinka(renderer: Renderer): Texture {
  // 2x2 tile, 7-story ornate residential
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.8;
  const bh = 95;
  const ox = TILE_HALF_W * 2;
  const oy = bh + 8;

  // Main body
  isoBox(g, ox, oy - bh, bw, bw * 0.8, bh,
    PALETTE.CONCRETE_LIGHT, PALETTE.YELLOW_BUILDING, 0xB8943A);

  // Decorative cornice at top
  isoBox(g, ox, oy - bh - 3, bw + 3, (bw + 3) * 0.8, 5,
    0xC8A84E, 0xB8943A, 0xA07830);

  // Windows (7 rows)
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 5; c++) {
      const wx = ox - bw + 5 + c * 10;
      const wy = oy - bh + bw * 0.8 + 8 + r * 12 + c * 5;
      g.rect(wx, wy, 6, 8);
      g.fill(r % 3 === 0 ? PALETTE.WINDOW_LIT : PALETTE.WINDOW);
    }
  }

  // Right face windows
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 4; c++) {
      const wx = ox + 5 + c * 10;
      const wy = oy - bh + bw * 0.8 + 10 + r * 12 - c * 5;
      g.rect(wx, wy, 6, 8);
      g.fill(r % 3 === 1 ? PALETTE.WINDOW_LIT : PALETTE.WINDOW);
    }
  }

  // Red star on top
  drawStar(g, ox, oy - bh - 12, 5, PALETTE.RED);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawKommunalka(renderer: Renderer): Texture {
  // 1x1 tile, 3-story brick communal housing
  const g = new Graphics();
  const bw = TILE_HALF_W * 0.8;
  const bh = 40;
  const ox = TILE_HALF_W;
  const oy = bh + 4;

  // Main body - brick colored
  isoBox(g, ox, oy - bh, bw, bw * 0.7, bh,
    PALETTE.BRICK, PALETTE.BRICK, PALETTE.BRICK_DARK);

  // Windows (3 rows x 2 cols)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const wx = ox - bw + 4 + c * 10;
      const wy = oy - bh + bw * 0.7 + 5 + r * 12 + c * 5;
      g.rect(wx, wy, 5, 7);
      g.fill(PALETTE.WINDOW);
    }
  }

  // Door
  g.rect(ox - 3, oy - 10, 6, 10);
  g.fill(PALETTE.RUST);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== INDUSTRIAL =====

function drawFactory(renderer: Renderer): Texture {
  // 3x2 tile, smokestacks
  const g = new Graphics();
  const bw = TILE_HALF_W * 2.2;
  const bh = 55;
  const ox = TILE_HALF_W * 2.5;
  const oy = bh + 20;

  // Main building body
  isoBox(g, ox, oy - bh, bw, bw * 0.6, bh,
    PALETTE.STEEL_BLUE, PALETTE.STEEL_DARK, PALETTE.IRON);

  // Saw-tooth roof sections
  for (let i = 0; i < 3; i++) {
    const rx = ox - bw * 0.6 + i * bw * 0.4;
    const ry = oy - bh - 5;
    g.poly([
      { x: rx, y: ry },
      { x: rx + bw * 0.2, y: ry - 12 },
      { x: rx + bw * 0.4, y: ry },
    ]);
    g.fill(PALETTE.CONCRETE_DARK);
  }

  // Smokestacks
  drawChimney(g, ox - bw * 0.3, oy - bh - 5, 6, 30);
  drawChimney(g, ox + bw * 0.1, oy - bh - 5, 6, 25);

  // Loading dock (left face)
  g.rect(ox - bw + 5, oy - 15, 15, 15);
  g.fill(PALETTE.CONCRETE_SHADOW);

  // Industrial windows
  for (let c = 0; c < 4; c++) {
    const wx = ox - bw + 5 + c * 12;
    const wy = oy - bh + bw * 0.6 + 8 + c * 6;
    g.rect(wx, wy, 8, 12);
    g.fill({ color: PALETTE.WINDOW, alpha: 0.5 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawCoalPowerPlant(renderer: Renderer): Texture {
  // 3x3 tile, cooling towers + tall chimney
  const g = new Graphics();
  const bw = TILE_HALF_W * 2.5;
  const bh = 50;
  const ox = TILE_HALF_W * 3;
  const oy = bh + 30;

  // Main building
  isoBox(g, ox, oy - bh, bw, bw * 0.7, bh,
    PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK, PALETTE.CONCRETE_SHADOW);

  // Cooling tower 1 (left) - simplified as trapezoid
  drawCoolingTower(g, ox - bw * 0.4, oy - bh - 5, 18, 45);

  // Cooling tower 2 (right)
  drawCoolingTower(g, ox + bw * 0.1, oy - bh - 5, 16, 40);

  // Tall main chimney
  drawChimney(g, ox - bw * 0.1, oy - bh - 5, 8, 55);

  // Red stripe on chimney
  g.rect(ox - bw * 0.1 - 4, oy - bh - 45, 8, 8);
  g.fill(PALETTE.RED);

  // Pipe network on left face
  g.moveTo(ox - bw + 5, oy - bh * 0.6);
  g.lineTo(ox - 5, oy - bh * 0.6);
  g.stroke({ width: 2, color: PALETTE.IRON });

  g.moveTo(ox - bw + 5, oy - bh * 0.3);
  g.lineTo(ox - 5, oy - bh * 0.3);
  g.stroke({ width: 2, color: PALETTE.IRON });

  // Lightning bolt symbol
  g.moveTo(ox + bw * 0.3, oy - bh * 0.5);
  g.lineTo(ox + bw * 0.35, oy - bh * 0.35);
  g.lineTo(ox + bw * 0.3, oy - bh * 0.35);
  g.lineTo(ox + bw * 0.35, oy - bh * 0.2);
  g.stroke({ width: 2, color: PALETTE.GOLD });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== GOVERNMENT / SERVICES =====

function drawPartyHQ(renderer: Renderer): Texture {
  // 2x2 tile, red accents, Soviet star, columns
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.8;
  const bh = 75;
  const ox = TILE_HALF_W * 2;
  const oy = bh + 8;

  // Main building body - concrete with slight warmth
  isoBox(g, ox, oy - bh, bw, bw * 0.8, bh,
    PALETTE.CONCRETE_LIGHT, 0x909090, 0x707070);

  // Red banner across front
  g.poly([
    { x: ox - bw + 5, y: oy - bh + bw * 0.8 + 3 },
    { x: ox - 2, y: oy - bh + bw * 0.8 + 3 + bw / 2 - 3 },
    { x: ox - 2, y: oy - bh + bw * 0.8 + 18 + bw / 2 - 3 },
    { x: ox - bw + 5, y: oy - bh + bw * 0.8 + 18 },
  ]);
  g.fill(PALETTE.RED);

  // Columns on left face
  for (let c = 0; c < 3; c++) {
    const cx = ox - bw + 8 + c * 12;
    const cy = oy - 30 + c * 6;
    g.rect(cx, cy, 3, 28);
    g.fill(PALETTE.WHITE);
  }

  // Decorative top with Soviet star
  isoBox(g, ox, oy - bh - 5, bw * 0.3, bw * 0.3 * 0.8, 8,
    PALETTE.CONCRETE_LIGHT, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK);

  drawStar(g, ox, oy - bh - 16, 8, PALETTE.RED);

  // Gold trim line
  g.moveTo(ox - bw, oy - bh + bw * 0.8 / 2);
  g.lineTo(ox, oy - bh);
  g.lineTo(ox + bw, oy - bh + bw * 0.8 / 2);
  g.stroke({ width: 2, color: PALETTE.GOLD });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawHospital(renderer: Renderer): Texture {
  // 2x2 tile, white building with red cross
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.6;
  const bh = 60;
  const ox = TILE_HALF_W * 2;
  const oy = bh + 8;

  // Main body - white/light grey
  isoBox(g, ox, oy - bh, bw, bw * 0.8, bh,
    PALETTE.HOSPITAL_WHITE, 0xD0D0D0, 0xB8B8B8);

  // Red cross on left face
  const crossX = ox - bw * 0.5;
  const crossY = oy - bh * 0.5;
  g.rect(crossX - 2, crossY - 6, 5, 13);
  g.fill(PALETTE.RED);
  g.rect(crossX - 6, crossY - 2, 13, 5);
  g.fill(PALETTE.RED);

  // Windows
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const wx = ox - bw + 6 + c * 12;
      const wy = oy - bh + bw * 0.8 + 6 + r * 14 + c * 6;
      g.rect(wx, wy, 7, 9);
      g.fill(PALETTE.WINDOW);
    }
  }

  // Ambulance entrance
  g.rect(ox - bw + 8, oy - 14, 12, 14);
  g.fill(PALETTE.CONCRETE_SHADOW);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawSchool(renderer: Renderer): Texture {
  // 2x1 tile, yellow building
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.3;
  const bh = 45;
  const ox = TILE_HALF_W * 1.5;
  const oy = bh + 4;

  // Main body - yellow
  isoBox(g, ox, oy - bh, bw, bw * 0.7, bh,
    PALETTE.YELLOW_BUILDING, 0xC09838, 0xA08030);

  // Windows (3 rows)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const wx = ox - bw + 3 + c * 8;
      const wy = oy - bh + bw * 0.7 + 6 + r * 13 + c * 4;
      g.rect(wx, wy, 5, 8);
      g.fill(PALETTE.WINDOW);
    }
  }

  // Entrance
  g.rect(ox - bw + 10, oy - 12, 8, 12);
  g.fill(PALETTE.RUST);

  // Flag pole with red flag
  g.moveTo(ox + bw * 0.3, oy - bh);
  g.lineTo(ox + bw * 0.3, oy - bh - 18);
  g.stroke({ width: 1, color: PALETTE.IRON });

  // Flag
  g.poly([
    { x: ox + bw * 0.3, y: oy - bh - 18 },
    { x: ox + bw * 0.3 + 8, y: oy - bh - 15 },
    { x: ox + bw * 0.3, y: oy - bh - 12 },
  ]);
  g.fill(PALETTE.RED);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== INFRASTRUCTURE =====

function drawRoad(renderer: Renderer, mask: number): Texture {
  // 1x1 tile road with connection-aware markings
  const g = new Graphics();

  // Asphalt diamond
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill(PALETTE.ROAD_ASPHALT);

  const cx = TILE_HALF_W;
  const cy = TILE_HALF_H;
  const endpoints = [
    { bit: 1, x: TILE_HALF_W, y: 1 },                  // N
    { bit: 2, x: TILE_HALF_W * 2 - 1, y: TILE_HALF_H }, // E
    { bit: 4, x: TILE_HALF_W, y: TILE_HALF_H * 2 - 1 }, // S
    { bit: 8, x: 1, y: TILE_HALF_H },                  // W
  ];

  const hasLinks = (mask & 0xF) !== 0;

  for (const end of endpoints) {
    if ((mask & end.bit) === 0) continue;

    // Asphalt branch.
    g.moveTo(cx, cy);
    g.lineTo(end.x, end.y);
    g.stroke({ width: 9, color: PALETTE.ROAD_ASPHALT });

    // Central lane marking.
    g.moveTo(cx, cy);
    g.lineTo(end.x, end.y);
    g.stroke({ width: 1.5, color: PALETTE.ROAD_LINE, alpha: 0.45 });
  }

  if (!hasLinks) {
    g.circle(cx, cy, 5);
    g.fill(PALETTE.ROAD_ASPHALT);
    g.circle(cx, cy, 1.2);
    g.fill({ color: PALETTE.ROAD_LINE, alpha: 0.35 });
  }

  // Edge lines
  g.poly([
    { x: TILE_HALF_W, y: 1 },
    { x: TILE_HALF_W * 2 - 1, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 - 1 },
    { x: 1, y: TILE_HALF_H },
  ]);
  g.stroke({ width: 0.5, color: PALETTE.CONCRETE_DARK, alpha: 0.5 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawPowerLine(renderer: Renderer, mask: number): Texture {
  // 1x1 tile with connection-aware wire routing
  const g = new Graphics();

  // Base tile (subtle)
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill({ color: PALETTE.GROUND, alpha: 0.3 });

  // Pylon vertical post
  const px = TILE_HALF_W;
  const py = TILE_HALF_H;
  g.moveTo(px, py);
  g.lineTo(px, py - 35);
  g.stroke({ width: 2, color: PALETTE.POWER_LINE_METAL });

  // Cross arm
  g.moveTo(px - 10, py - 30);
  g.lineTo(px + 10, py - 30);
  g.stroke({ width: 2, color: PALETTE.POWER_LINE_METAL });

  // Upper cross arm (smaller)
  g.moveTo(px - 6, py - 35);
  g.lineTo(px + 6, py - 35);
  g.stroke({ width: 1.5, color: PALETTE.POWER_LINE_METAL });

  const endpoints = [
    { bit: 1, x: TILE_HALF_W, y: 1 },                    // N
    { bit: 2, x: TILE_HALF_W * 2 - 2, y: TILE_HALF_H }, // E
    { bit: 4, x: TILE_HALF_W, y: TILE_HALF_H * 2 - 2 }, // S
    { bit: 8, x: 2, y: TILE_HALF_H },                    // W
  ];

  for (const end of endpoints) {
    if ((mask & end.bit) === 0) continue;
    g.moveTo(px, py - 30);
    g.quadraticCurveTo(
      (px + end.x) / 2,
      Math.min(py - 10, end.y - 8),
      end.x,
      end.y
    );
    g.stroke({ width: 1, color: PALETTE.IRON, alpha: 0.85 });
  }

  // Base support struts
  g.moveTo(px, py);
  g.lineTo(px - 4, py - 8);
  g.lineTo(px, py - 8);
  g.moveTo(px, py);
  g.lineTo(px + 4, py - 8);
  g.lineTo(px, py - 8);
  g.stroke({ width: 1, color: PALETTE.POWER_LINE_METAL });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== DECORATION =====

function drawPark(renderer: Renderer): Texture {
  // 1x1 tile with trees
  const g = new Graphics();

  // Green ground
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill(PALETTE.GREEN);

  // Trees (simple triangle shapes)
  drawTree(g, TILE_HALF_W - 8, TILE_HALF_H - 6, 8);
  drawTree(g, TILE_HALF_W + 6, TILE_HALF_H - 2, 7);
  drawTree(g, TILE_HALF_W - 2, TILE_HALF_H + 4, 6);

  // Bench (small detail)
  g.rect(TILE_HALF_W + 10, TILE_HALF_H + 4, 6, 2);
  g.fill(PALETTE.RUST);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawMonument(renderer: Renderer): Texture {
  // 1x1 tile with red star obelisk
  const g = new Graphics();

  // Base tile
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill(PALETTE.GROUND);

  // Pedestal base
  const px = TILE_HALF_W;
  const py = TILE_HALF_H;
  isoBox(g, px, py - 4, 12, 8, 6,
    PALETTE.PEDESTAL, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK);

  // Obelisk
  g.poly([
    { x: px - 4, y: py - 10 },
    { x: px + 4, y: py - 10 },
    { x: px + 2, y: py - 45 },
    { x: px - 2, y: py - 45 },
  ]);
  g.fill(PALETTE.CONCRETE_MID);

  // Right face of obelisk
  g.poly([
    { x: px + 4, y: py - 10 },
    { x: px + 6, y: py - 8 },
    { x: px + 3, y: py - 43 },
    { x: px + 2, y: py - 45 },
  ]);
  g.fill(PALETTE.CONCRETE_DARK);

  // Red star at top
  drawStar(g, px, py - 50, 6, PALETTE.STAR_RED);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== NEW BUILDINGS =====

function drawPanelak(renderer: Renderer): Texture {
  // 2x2 tile, 9-story grey tower, dense window grid, two TV antennas
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.8;
  const bh = 110;
  const ox = TILE_HALF_W * 2;
  const oy = bh + 8;

  // Main body - concrete grey
  isoBox(g, ox, oy - bh, bw, bw * 0.8, bh,
    PALETTE.CONCRETE_LIGHT, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK);

  // Dense window grid - left face (9 rows x 5 cols)
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 5; c++) {
      const wx = ox - bw + 4 + c * 9;
      const wy = oy - bh + bw * 0.8 + 5 + r * 11 + c * 4.5;
      g.rect(wx, wy, 5, 7);
      g.fill(r % 2 === 0 ? PALETTE.WINDOW : PALETTE.WINDOW_DARK);
    }
  }

  // Right face windows (9 rows x 4 cols)
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 4; c++) {
      const wx = ox + 4 + c * 9;
      const wy = oy - bh + bw * 0.8 + 7 + r * 11 - c * 4.5;
      g.rect(wx, wy, 5, 7);
      g.fill(r % 2 === 1 ? PALETTE.WINDOW : PALETTE.WINDOW_DARK);
    }
  }

  // Two TV antennas
  g.moveTo(ox - 8, oy - bh - 2);
  g.lineTo(ox - 8, oy - bh - 18);
  g.stroke({ width: 1, color: PALETTE.IRON });
  g.moveTo(ox - 12, oy - bh - 14);
  g.lineTo(ox - 4, oy - bh - 14);
  g.stroke({ width: 0.8, color: PALETTE.IRON });

  g.moveTo(ox + 6, oy - bh - 2);
  g.lineTo(ox + 6, oy - bh - 15);
  g.stroke({ width: 1, color: PALETTE.IRON });
  g.moveTo(ox + 3, oy - bh - 12);
  g.lineTo(ox + 9, oy - bh - 12);
  g.stroke({ width: 0.8, color: PALETTE.IRON });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawWarehouse(renderer: Renderer): Texture {
  // 2x2 tile, squat corrugated-roof building, steel blue, rolling door
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.8;
  const bh = 40;
  const ox = TILE_HALF_W * 2;
  const oy = bh + 8;

  // Main body - steel blue
  isoBox(g, ox, oy - bh, bw, bw * 0.8, bh,
    PALETTE.STEEL_BLUE, PALETTE.STEEL_DARK, PALETTE.IRON);

  // Corrugated roof lines
  for (let i = 0; i < 5; i++) {
    const rx = ox - bw * 0.8 + i * bw * 0.4;
    g.moveTo(rx, oy - bh + bw * 0.3 + i * (bw * 0.1));
    g.lineTo(rx + bw * 0.2, oy - bh + bw * 0.3 + i * (bw * 0.1) + bw * 0.1);
    g.stroke({ width: 1, color: PALETTE.CONCRETE_LIGHT, alpha: 0.4 });
  }

  // Rolling door on left face
  g.rect(ox - bw + 8, oy - 28, 18, 26);
  g.fill(PALETTE.CONCRETE_SHADOW);
  // Door segments
  for (let i = 0; i < 4; i++) {
    g.moveTo(ox - bw + 8, oy - 28 + i * 7);
    g.lineTo(ox - bw + 26, oy - 28 + i * 7);
    g.stroke({ width: 0.5, color: PALETTE.IRON, alpha: 0.5 });
  }

  // Red badge/star
  drawStar(g, ox + bw * 0.3, oy - bh * 0.5, 5, PALETTE.RED);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawCinema(renderer: Renderer): Texture {
  // 2x1 tile, art deco stepped facade, red marquee
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.4;
  const bh = 55;
  const ox = TILE_HALF_W * 1.5;
  const oy = bh + 4;

  // Main body
  isoBox(g, ox, oy - bh, bw, bw * 0.6, bh,
    PALETTE.CONCRETE_LIGHT, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK);

  // Stepped facade top
  isoBox(g, ox, oy - bh - 5, bw * 0.7, bw * 0.7 * 0.6, 8,
    PALETTE.CONCRETE_LIGHT, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK);
  isoBox(g, ox, oy - bh - 12, bw * 0.4, bw * 0.4 * 0.6, 6,
    PALETTE.CONCRETE_LIGHT, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK);

  // Red marquee banner across front
  g.poly([
    { x: ox - bw + 3, y: oy - bh + bw * 0.6 + 2 },
    { x: ox - 1, y: oy - bh + bw * 0.6 + 2 + bw / 2 - 2 },
    { x: ox - 1, y: oy - bh + bw * 0.6 + 14 + bw / 2 - 2 },
    { x: ox - bw + 3, y: oy - bh + bw * 0.6 + 14 },
  ]);
  g.fill(PALETTE.RED);

  // Gold border on marquee
  g.moveTo(ox - bw + 3, oy - bh + bw * 0.6 + 2);
  g.lineTo(ox - 1, oy - bh + bw * 0.6 + 2 + bw / 2 - 2);
  g.stroke({ width: 1.5, color: PALETTE.GOLD });

  // Arched entrance
  g.rect(ox - bw + 10, oy - 18, 12, 18);
  g.fill(PALETTE.CONCRETE_SHADOW);
  // Arch top
  g.arc(ox - bw + 16, oy - 18, 6, Math.PI, 0);
  g.fill(PALETTE.CONCRETE_SHADOW);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawRadioTower(renderer: Renderer): Texture {
  // 1x1 tile, lattice tower with red warning light
  const g = new Graphics();
  const px = TILE_HALF_W;
  const py = TILE_HALF_H;

  // Base tile
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill({ color: PALETTE.GROUND, alpha: 0.3 });

  // Base platform
  isoBox(g, px, py - 4, 10, 7, 5,
    PALETTE.CONCRETE_LIGHT, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK);

  // Lattice tower - main vertical
  g.moveTo(px, py - 4);
  g.lineTo(px, py - 55);
  g.stroke({ width: 2, color: PALETTE.POWER_LINE_METAL });

  // Tapered sides
  g.moveTo(px - 8, py - 4);
  g.lineTo(px - 2, py - 55);
  g.stroke({ width: 1.5, color: PALETTE.POWER_LINE_METAL });
  g.moveTo(px + 8, py - 4);
  g.lineTo(px + 2, py - 55);
  g.stroke({ width: 1.5, color: PALETTE.POWER_LINE_METAL });

  // Cross bracing (diagonal lines)
  for (let i = 0; i < 5; i++) {
    const y1 = py - 8 - i * 9;
    const y2 = y1 - 9;
    const w1 = 7 - i * 1.1;
    const w2 = 7 - (i + 1) * 1.1;
    g.moveTo(px - w1, y1);
    g.lineTo(px + w2, y2);
    g.stroke({ width: 0.7, color: PALETTE.IRON });
    g.moveTo(px + w1, y1);
    g.lineTo(px - w2, y2);
    g.stroke({ width: 0.7, color: PALETTE.IRON });
  }

  // Red warning light at top
  g.circle(px, py - 57, 3);
  g.fill(PALETTE.RED);
  g.circle(px, py - 57, 2);
  g.fill(PALETTE.RED_LIGHT);

  // Guy-wires
  g.moveTo(px - 2, py - 50);
  g.lineTo(px - 18, py - 2);
  g.stroke({ width: 0.5, color: PALETTE.IRON, alpha: 0.5 });
  g.moveTo(px + 2, py - 50);
  g.lineTo(px + 18, py - 2);
  g.stroke({ width: 0.5, color: PALETTE.IRON, alpha: 0.5 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawMetroStation(renderer: Renderer): Texture {
  // 2x1 tile, low entrance with grand arch, Soviet "M" sign
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.4;
  const bh = 35;
  const ox = TILE_HALF_W * 1.5;
  const oy = bh + 4;

  // Main low building body
  isoBox(g, ox, oy - bh, bw, bw * 0.6, bh,
    PALETTE.CONCRETE_LIGHT, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK);

  // Grand arch entrance on left face
  g.rect(ox - bw + 10, oy - 24, 16, 22);
  g.fill(PALETTE.CONCRETE_SHADOW);
  g.arc(ox - bw + 18, oy - 24, 8, Math.PI, 0);
  g.fill(PALETTE.CONCRETE_SHADOW);

  // Columns flanking entrance
  g.rect(ox - bw + 8, oy - 28, 3, 26);
  g.fill(PALETTE.WHITE);
  g.rect(ox - bw + 25, oy - 28 + 9, 3, 17);
  g.fill(PALETTE.WHITE);

  // Soviet "M" sign in red circle
  const mX = ox - bw * 0.5;
  const mY = oy - bh - 5;
  g.circle(mX, mY, 7);
  g.fill(PALETTE.RED);
  // M letter (simplified as lines)
  g.moveTo(mX - 4, mY + 3);
  g.lineTo(mX - 4, mY - 3);
  g.lineTo(mX, mY + 1);
  g.lineTo(mX + 4, mY - 3);
  g.lineTo(mX + 4, mY + 3);
  g.stroke({ width: 1.5, color: PALETTE.WHITE });

  // Descending steps (right side detail)
  for (let i = 0; i < 3; i++) {
    g.rect(ox + 4 + i * 5, oy - 6 + i * 2, 5, 2);
    g.fill(PALETTE.CONCRETE_DARK);
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawPlaza(renderer: Renderer): Texture {
  // 2x2 tile, flat paved surface with concentric diamond pattern, central flagpole
  const g = new Graphics();
  const ox = TILE_HALF_W * 2;
  const oy = TILE_HALF_H * 2;

  // Paved base - full footprint
  const hw = TILE_HALF_W * 2;
  const hh = TILE_HALF_H * 2;
  g.poly([
    { x: ox, y: oy - hh },
    { x: ox + hw, y: oy },
    { x: ox, y: oy + hh },
    { x: ox - hw, y: oy },
  ]);
  g.fill(PALETTE.CONCRETE_MID);

  // Concentric diamond pattern
  for (let i = 1; i <= 3; i++) {
    const s = i * 0.25;
    g.poly([
      { x: ox, y: oy - hh * s },
      { x: ox + hw * s, y: oy },
      { x: ox, y: oy + hh * s },
      { x: ox - hw * s, y: oy },
    ]);
    g.stroke({ width: 1, color: PALETTE.CONCRETE_LIGHT, alpha: 0.5 });
  }

  // Central flagpole
  g.moveTo(ox, oy);
  g.lineTo(ox, oy - 40);
  g.stroke({ width: 2, color: PALETTE.IRON });

  // Red flag
  g.poly([
    { x: ox, y: oy - 40 },
    { x: ox + 12, y: oy - 36 },
    { x: ox, y: oy - 32 },
  ]);
  g.fill(PALETTE.RED);

  // Gold star on flag
  drawStar(g, ox + 5, oy - 36, 3, PALETTE.GOLD);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawFountain(renderer: Renderer): Texture {
  // 1x1 tile, circular basin, water fill, central pedestal, water jet
  const g = new Graphics();
  const px = TILE_HALF_W;
  const py = TILE_HALF_H;

  // Base tile
  g.poly([
    { x: TILE_HALF_W, y: 0 },
    { x: TILE_HALF_W * 2, y: TILE_HALF_H },
    { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
    { x: 0, y: TILE_HALF_H },
  ]);
  g.fill(PALETTE.GROUND);

  // Circular basin (ellipse for iso perspective)
  g.ellipse(px, py + 2, 14, 8);
  g.fill(PALETTE.CONCRETE_MID);
  g.ellipse(px, py, 12, 6);
  g.fill(PALETTE.WATER);
  g.ellipse(px, py, 12, 6);
  g.stroke({ width: 1, color: PALETTE.CONCRETE_DARK });

  // Central pedestal
  g.rect(px - 2, py - 12, 4, 12);
  g.fill(PALETTE.PEDESTAL);

  // Water jet lines
  g.moveTo(px, py - 12);
  g.lineTo(px, py - 22);
  g.stroke({ width: 1.5, color: PALETTE.WATER_LIGHT, alpha: 0.7 });
  g.moveTo(px, py - 20);
  g.lineTo(px - 5, py - 14);
  g.stroke({ width: 0.8, color: PALETTE.WATER_LIGHT, alpha: 0.5 });
  g.moveTo(px, py - 20);
  g.lineTo(px + 5, py - 14);
  g.stroke({ width: 0.8, color: PALETTE.WATER_LIGHT, alpha: 0.5 });

  // Water splash dots
  g.circle(px - 3, py - 16, 1);
  g.fill({ color: PALETTE.WATER_LIGHT, alpha: 0.5 });
  g.circle(px + 4, py - 15, 1);
  g.fill({ color: PALETTE.WATER_LIGHT, alpha: 0.5 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawSportsComplex(renderer: Renderer): Texture {
  // 3x2 tile, elongated building, red track oval on top, floodlight poles
  const g = new Graphics();
  const bw = TILE_HALF_W * 2.2;
  const bh = 45;
  const ox = TILE_HALF_W * 2.5;
  const oy = bh + 20;

  // Main building body
  isoBox(g, ox, oy - bh, bw, bw * 0.6, bh,
    PALETTE.CONCRETE_LIGHT, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK);

  // Red track oval on rooftop (ellipse)
  const roofY = oy - bh + bw * 0.3;
  g.ellipse(ox, roofY, bw * 0.7, bw * 0.3);
  g.fill(PALETTE.RED_DARK);
  // Green field inside track
  g.ellipse(ox, roofY, bw * 0.5, bw * 0.2);
  g.fill(PALETTE.GREEN);

  // Seating tiers on right face
  for (let i = 0; i < 3; i++) {
    const ty = oy - bh + bw * 0.6 + 5 + i * 10;
    g.moveTo(ox + 3, ty - i * 3);
    g.lineTo(ox + bw - 3, ty - i * 3 - (bw - 6) / 2);
    g.stroke({ width: 2, color: PALETTE.CONCRETE_LIGHT, alpha: 0.5 });
  }

  // Floodlight poles (4 corners)
  const lightPositions = [
    { x: ox - bw * 0.6, y: oy - bh - 5 },
    { x: ox + bw * 0.6, y: oy - bh - 5 },
    { x: ox - bw * 0.3, y: oy - bh - 8 },
    { x: ox + bw * 0.3, y: oy - bh - 8 },
  ];
  for (const lp of lightPositions) {
    g.moveTo(lp.x, oy - bh);
    g.lineTo(lp.x, lp.y - 15);
    g.stroke({ width: 1.5, color: PALETTE.IRON });
    // Light fixture
    g.rect(lp.x - 2, lp.y - 17, 4, 3);
    g.fill(PALETTE.YELLOW);
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== HELPER DRAWING FUNCTIONS =====

function drawChimney(g: Graphics, x: number, y: number, radius: number, height: number) {
  // Simple rectangle chimney
  g.rect(x - radius / 2, y - height, radius, height);
  g.fill(PALETTE.CONCRETE_DARK);

  // Top rim
  g.rect(x - radius / 2 - 1, y - height - 2, radius + 2, 3);
  g.fill(PALETTE.CHIMNEY_TOP);

  // Red stripe
  g.rect(x - radius / 2, y - height * 0.7, radius, 4);
  g.fill(PALETTE.RED);
}

function drawCoolingTower(g: Graphics, x: number, y: number, baseRadius: number, height: number) {
  // Hyperboloid shape approximated as trapezoid
  const topRadius = baseRadius * 0.7;
  const neckRadius = baseRadius * 0.55;
  const neckY = y - height * 0.65;

  g.poly([
    { x: x - baseRadius, y: y },
    { x: x - neckRadius, y: neckY },
    { x: x - topRadius, y: y - height },
    { x: x + topRadius, y: y - height },
    { x: x + neckRadius, y: neckY },
    { x: x + baseRadius, y: y },
  ]);
  g.fill(PALETTE.CONCRETE_MID);

  // Shadow on right side
  g.poly([
    { x: x, y: y },
    { x: x + neckRadius * 0.5, y: neckY },
    { x: x + topRadius, y: y - height },
    { x: x + baseRadius, y: y },
  ]);
  g.fill({ color: PALETTE.CONCRETE_DARK, alpha: 0.4 });

  // Steam from top
  g.circle(x - 2, y - height - 5, 4);
  g.fill({ color: PALETTE.SMOKE, alpha: 0.4 });
  g.circle(x + 3, y - height - 10, 3);
  g.fill({ color: PALETTE.SMOKE, alpha: 0.3 });
}

function drawTree(g: Graphics, x: number, y: number, size: number) {
  // Trunk
  g.rect(x - 1, y - size * 0.4, 2, size * 0.5);
  g.fill(PALETTE.TREE_TRUNK);

  // Canopy (triangle)
  g.poly([
    { x: x, y: y - size * 1.5 },
    { x: x - size * 0.7, y: y - size * 0.3 },
    { x: x + size * 0.7, y: y - size * 0.3 },
  ]);
  g.fill(PALETTE.GREEN);

  // Lighter triangle overlay
  g.poly([
    { x: x, y: y - size * 1.5 },
    { x: x - size * 0.3, y: y - size * 0.6 },
    { x: x + size * 0.2, y: y - size * 0.5 },
  ]);
  g.fill({ color: PALETTE.GREEN_LIGHT, alpha: 0.5 });
}

function drawStar(g: Graphics, cx: number, cy: number, r: number, color: number) {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 2) + (i * Math.PI / 5);
    const radius = i % 2 === 0 ? r : r * 0.4;
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy - Math.sin(angle) * radius,
    });
  }
  g.poly(points);
  g.fill(color);
}
