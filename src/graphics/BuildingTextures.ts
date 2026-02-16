import { Graphics, Renderer, Texture } from 'pixi.js';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { PALETTE } from './SovietPalette';

// Helper: draw an isometric box (left face, right face, top face)
function isoBox(
  g: Graphics,
  ox: number, oy: number,
  w: number, h: number, depth: number,
  topColor: number, leftColor: number, rightColor: number,
  outline = true
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

  // Edge outlines for definition
  if (outline) {
    const edgeStyle = { width: 0.8, color: 0x000000, alpha: 0.18 };
    // Top diamond
    g.poly([
      { x: ox, y: oy },
      { x: ox + w, y: oy + w / 2 },
      { x: ox, y: oy + w },
      { x: ox - w, y: oy + w / 2 },
    ]);
    g.stroke(edgeStyle);
    // Front vertical edge
    g.moveTo(ox, oy + w);
    g.lineTo(ox, oy + w + depth);
    g.stroke(edgeStyle);
    // Left vertical edge
    g.moveTo(ox - w, oy + w / 2);
    g.lineTo(ox - w, oy + w / 2 + depth);
    g.stroke(edgeStyle);
    // Right vertical edge
    g.moveTo(ox + w, oy + w / 2);
    g.lineTo(ox + w, oy + w / 2 + depth);
    g.stroke(edgeStyle);
    // Bottom edges
    g.moveTo(ox - w, oy + w / 2 + depth);
    g.lineTo(ox, oy + w + depth);
    g.stroke(edgeStyle);
    g.moveTo(ox, oy + w + depth);
    g.lineTo(ox + w, oy + w / 2 + depth);
    g.stroke(edgeStyle);
  }
}

// Helper: draw an isometric parallelogram matching face perspective
function isoRect(g: Graphics, x: number, y: number, w: number, h: number, skewDir: 1 | -1) {
  const skew = w * 0.5 * skewDir;
  g.poly([
    { x: x, y: y },
    { x: x + w, y: y + skew },
    { x: x + w, y: y + skew + h },
    { x: x, y: y + h },
  ]);
}

function drawGroundShadow(
  g: Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  alpha = 0.24
) {
  g.poly([
    { x: cx, y: cy - h },
    { x: cx + w, y: cy },
    { x: cx, y: cy + h },
    { x: cx - w, y: cy },
  ]);
  g.fill({ color: 0x101010, alpha });
}

function drawFacadeBands(
  g: Graphics,
  ox: number,
  topY: number,
  bw: number,
  roofDepth: number,
  rows: number,
  spacing: number,
  color: number,
  alpha = 0.2
) {
  for (let r = 1; r <= rows; r++) {
    const y = topY + roofDepth + r * spacing;
    g.moveTo(ox - bw + 3, y + 1);
    g.lineTo(ox - 2, y + (bw - 5) / 2);
    g.stroke({ width: 0.8, color, alpha });

    g.moveTo(ox + 2, y + (bw - 5) / 2);
    g.lineTo(ox + bw - 3, y + 1);
    g.stroke({ width: 0.8, color, alpha });
  }
}

function drawLeftWindowGrid(
  g: Graphics,
  ox: number,
  topY: number,
  bw: number,
  roofDepth: number,
  rows: number,
  cols: number,
  stepX: number,
  stepY: number,
  winW: number,
  winH: number,
  phase = 0
) {
  const baseX = ox - bw + 6;
  const baseY = topY + roofDepth + 6;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = baseX + c * stepX;
      const wy = baseY + r * stepY + c * (stepX * 0.5);
      isoRect(g, wx, wy, winW, winH, 1);
      g.fill(((r + c + phase) % 4) === 0 ? PALETTE.WINDOW_LIT : PALETTE.WINDOW);
      isoRect(g, wx + 1, wy + 0.5, Math.max(1, winW - 2), Math.max(1, winH - 2), 1);
      g.fill(((r + c + phase) % 3) === 0 ? PALETTE.WINDOW_DARK : PALETTE.WINDOW);
      // Window sill
      isoRect(g, wx - 0.5, wy + winH, winW + 1, 1.5, 1);
      g.fill({ color: PALETTE.WINDOW_SILL, alpha: 0.6 });
    }
  }
}

function drawRightWindowGrid(
  g: Graphics,
  ox: number,
  topY: number,
  bw: number,
  roofDepth: number,
  rows: number,
  cols: number,
  stepX: number,
  stepY: number,
  winW: number,
  winH: number,
  phase = 1
) {
  const baseX = ox + 4;
  const baseY = topY + roofDepth + 8;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = baseX + c * stepX;
      const wy = baseY + r * stepY - c * (stepX * 0.5);
      isoRect(g, wx, wy, winW, winH, -1);
      g.fill(((r + c + phase) % 4) === 0 ? PALETTE.WINDOW_LIT : PALETTE.WINDOW);
      isoRect(g, wx + 1, wy + 0.5, Math.max(1, winW - 2), Math.max(1, winH - 2), -1);
      g.fill(((r + c + phase) % 3) === 0 ? PALETTE.WINDOW_DARK : PALETTE.WINDOW);
      // Window sill
      isoRect(g, wx - 0.5, wy + winH, winW + 1, 1.5, -1);
      g.fill({ color: PALETTE.WINDOW_SILL, alpha: 0.6 });
    }
  }
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
  textures.set('queue_citizen', drawQueueCitizen(renderer));

  return textures;
}

// ===== RESIDENTIAL =====

function drawKhrushchyovka(renderer: Renderer): Texture {
  // 2x1 tile, slab block inspired by late 60s prefab estates
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.48;
  const bh = 76;
  const roofDepth = bw * 0.62;
  const ox = TILE_HALF_W * 2;
  const oy = bh + 8;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 4, bw * 0.92, 8, 0.2);

  isoBox(
    g,
    ox,
    topY,
    bw,
    roofDepth,
    bh,
    0x9A9A97,
    0x7D7E7D,
    0x676A69
  );

  // Panel seams and floor bands for a prefab look.
  drawFacadeBands(g, ox, topY, bw, roofDepth, 5, 12, 0x4E4F4E, 0.32);
  for (let c = 0; c < 4; c++) {
    const x = ox - bw + 4 + c * 8;
    g.moveTo(x, topY + roofDepth + 4 + c * 4);
    g.lineTo(x, oy - 4 + c * 4);
    g.stroke({ width: 0.8, color: 0x5A5A59, alpha: 0.35 });
  }

  drawLeftWindowGrid(g, ox, topY, bw, roofDepth, 6, 4, 8, 11, 5, 7, 1);
  drawRightWindowGrid(g, ox, topY, bw, roofDepth, 6, 3, 8, 11, 5, 7, 2);
  drawCornice(g, ox, topY, bw, roofDepth);
  drawBaseBand(g, ox, oy, bw, roofDepth);

  // Stairwell strip.
  g.poly([
    { x: ox - 3, y: topY + roofDepth + 2 },
    { x: ox + 6, y: topY + roofDepth + 6 },
    { x: ox + 6, y: oy + 2 },
    { x: ox - 3, y: oy - 2 },
  ]);
  g.fill({ color: 0x5C5E61, alpha: 0.45 });

  // Roof detail and parapet.
  drawRoofDetail(g, ox, topY, bw);
  drawRoofParapet(g, ox, topY, bw, roofDepth);

  // Roof machinery and TV antenna.
  isoBox(g, ox + 7, topY - 7, bw * 0.32, bw * 0.22, 11, 0x7F817F, 0x666866, 0x555755, false);
  g.rect(ox - 11, topY + 8, 10, 3);
  g.fill(0x6B6D6B);
  g.moveTo(ox - 8, topY - 1);
  g.lineTo(ox - 8, topY - 15);
  g.stroke({ width: 1, color: PALETTE.IRON });
  g.moveTo(ox - 12, topY - 11);
  g.lineTo(ox - 4, topY - 11);
  g.stroke({ width: 0.8, color: PALETTE.IRON });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawStalinka(renderer: Renderer): Texture {
  // 2x2 tile, monumental pre-war masonry block
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.82;
  const bh = 102;
  const roofDepth = bw * 0.82;
  const ox = TILE_HALF_W * 2;
  const oy = bh + 10;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 5, bw * 0.96, 9, 0.22);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0xBDAE8B, 0xA89066, 0x927850);
  isoBox(g, ox, topY - 4, bw + 3, roofDepth + 2, 7, 0xD0BE94, 0xB69763, 0x9D7F4F, false);

  // Vertical pilasters.
  for (let i = 0; i < 4; i++) {
    const x = ox - bw + 7 + i * 11;
    const y = topY + roofDepth + 6 + i * 5;
    g.rect(x, y, 2.5, bh - 16);
    g.fill({ color: 0xD7C294, alpha: 0.55 });
  }

  drawFacadeBands(g, ox, topY, bw, roofDepth, 6, 13, 0x7C6643, 0.26);
  drawLeftWindowGrid(g, ox, topY, bw, roofDepth, 7, 4, 10, 11, 5, 8, 0);
  drawRightWindowGrid(g, ox, topY, bw, roofDepth, 7, 4, 10, 11, 5, 8, 1);
  drawCornice(g, ox, topY, bw, roofDepth, PALETTE.GOLD, 0.45);
  drawBaseBand(g, ox, oy, bw, roofDepth);

  // Decorative frieze and parade flag.
  g.rect(ox - bw + 5, topY + roofDepth + 8, bw - 10, 3);
  g.fill(PALETTE.GOLD);
  g.poly([
    { x: ox - bw + 8, y: oy - 18 },
    { x: ox - 1, y: oy - 14 },
    { x: ox - bw + 8, y: oy - 10 },
  ]);
  g.fill(PALETTE.RED);

  // Ornate cornice base.
  g.rect(ox - bw + 6, oy - 6, bw - 12, 6);
  g.fill(0x5F4C3B);

  // Grand central arch.
  g.poly([
    { x: ox - 6, y: oy - 22 },
    { x: ox + 5, y: oy - 17 },
    { x: ox + 5, y: oy + 2 },
    { x: ox - 6, y: oy - 3 },
  ]);
  g.fill(0x6A5538);
  g.arc(ox, oy - 21, 5.5, Math.PI, 0);
  g.fill(0x6A5538);

  // Setback tower and star crest.
  isoBox(g, ox, topY - 15, bw * 0.28, bw * 0.2, 18, 0xC8B489, 0xA48A5F, 0x8E744D, false);
  drawStar(g, ox, topY - 18, 5, PALETTE.RED);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawKommunalka(renderer: Renderer): Texture {
  // 1x1 tile, compact shared apartment block with worn brickwork
  const g = new Graphics();
  const bw = TILE_HALF_W * 0.86;
  const bh = 44;
  const roofDepth = bw * 0.68;
  const ox = TILE_HALF_W;
  const oy = bh + 5;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 2, bw * 0.9, 7, 0.2);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0xA26A4E, 0x91543B, 0x6F3F2B);
  isoBox(g, ox, topY - 2, bw + 1, roofDepth + 1, 4, 0x7B4A35, 0x6A3D2B, 0x553123, false);

  // Brick courses and windows.
  drawFacadeBands(g, ox, topY, bw, roofDepth, 3, 11, 0x593628, 0.34);
  drawLeftWindowGrid(g, ox, topY, bw, roofDepth, 3, 2, 9, 11, 5, 7, 2);
  drawRightWindowGrid(g, ox, topY, bw, roofDepth, 3, 1, 9, 11, 5, 7, 1);
  drawBaseBand(g, ox, oy, bw, roofDepth);

  // Entry and rooftop chimney.
  g.poly([
    { x: ox - 4, y: oy - 12 },
    { x: ox + 1, y: oy - 10 },
    { x: ox + 1, y: oy + 1 },
    { x: ox - 4, y: oy - 1 },
  ]);
  g.fill(0x4F2E1F);
  drawChimney(g, ox + bw * 0.22, topY - 1, 4, 16);

  // Laundry line detail.
  g.moveTo(ox - bw + 4, oy - 16);
  g.lineTo(ox - 4, oy - 13);
  g.stroke({ width: 0.7, color: 0xD7D0BE, alpha: 0.7 });
  g.rect(ox - bw + 9, oy - 17, 3, 2);
  g.fill(0x9E3A3A);
  g.rect(ox - bw + 14, oy - 15, 3, 2);
  g.fill(0x657A8F);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== INDUSTRIAL =====

function drawFactory(renderer: Renderer): Texture {
  // 3x2 tile, heavy-industrial hall with sawtooth sheds and gantry details
  const g = new Graphics();
  const bw = TILE_HALF_W * 2.24;
  const bh = 62;
  const roofDepth = bw * 0.58;
  const ox = TILE_HALF_W * 2.5;
  const oy = bh + 22;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 8, bw * 0.98, 10, 0.24);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0x667481, 0x54606A, 0x3D474F);
  isoBox(g, ox - bw * 0.36, topY + 10, bw * 0.46, roofDepth * 0.45, 34, 0x747E86, 0x596169, 0x464D55);

  // Saw-tooth roof with skylight highlights.
  for (let i = 0; i < 4; i++) {
    const rx = ox - bw * 0.7 + i * bw * 0.38;
    const ry = topY - 4 + i * 1.2;
    g.poly([
      { x: rx, y: ry },
      { x: rx + bw * 0.16, y: ry - 12 },
      { x: rx + bw * 0.34, y: ry - 1 },
      { x: rx + bw * 0.2, y: ry + 2 },
    ]);
    g.fill(0x2F363D);
    g.poly([
      { x: rx + bw * 0.16, y: ry - 12 },
      { x: rx + bw * 0.28, y: ry - 5 },
      { x: rx + bw * 0.34, y: ry - 1 },
      { x: rx + bw * 0.22, y: ry - 8 },
    ]);
    g.fill(0x8CA6B7);
  }

  drawChimney(g, ox - bw * 0.37, topY - 2, 7, 36);
  drawChimney(g, ox + bw * 0.08, topY - 4, 7, 30);

  // Pipe bridge and ducting.
  g.moveTo(ox - bw * 0.31, topY - 8);
  g.lineTo(ox + bw * 0.08, topY - 11);
  g.stroke({ width: 4, color: 0x5A5F63 });
  g.moveTo(ox - bw * 0.55, oy - 18);
  g.lineTo(ox - 4, oy - 24);
  g.stroke({ width: 3, color: 0x4A5258 });
  g.moveTo(ox - bw * 0.55, oy - 10);
  g.lineTo(ox - 4, oy - 18);
  g.stroke({ width: 3, color: 0x4A5258 });

  // Elevated gantry catwalk.
  g.moveTo(ox - bw * 0.45, topY + 10);
  g.lineTo(ox + bw * 0.2, topY + 6);
  g.stroke({ width: 2.5, color: 0x2C2F33 });
  g.moveTo(ox - bw * 0.45, topY + 10);
  g.lineTo(ox - bw * 0.45, oy - 2);
  g.stroke({ width: 1.2, color: 0x2C2F33 });
  g.moveTo(ox + bw * 0.2, topY + 6);
  g.lineTo(ox + bw * 0.2, oy - 4);
  g.stroke({ width: 1.2, color: 0x2C2F33 });

  // Safety railing.
  g.moveTo(ox - bw * 0.45, topY + 12);
  g.lineTo(ox + bw * 0.2, topY + 8);
  g.stroke({ width: 0.8, color: 0xB9B9B2, alpha: 0.6 });
  g.moveTo(ox - bw * 0.35, topY + 10);
  g.lineTo(ox - bw * 0.35, oy - 2);
  g.stroke({ width: 0.8, color: 0xB9B9B2, alpha: 0.55 });

  // Loading docks and hazard striping.
  for (let i = 0; i < 3; i++) {
    const dx = ox - bw + 8 + i * 16;
    const dy = oy - 18 + i * 8;
    g.rect(dx, dy, 12, 14);
    g.fill(0x32383D);
    g.rect(dx, dy + 11, 12, 2);
    g.fill(0xB36A2B);
  }

  drawLeftWindowGrid(g, ox, topY, bw, roofDepth, 2, 4, 12, 13, 7, 10, 3);
  drawRightWindowGrid(g, ox, topY, bw, roofDepth, 2, 4, 12, 13, 7, 10, 0);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawCoalPowerPlant(renderer: Renderer): Texture {
  // 3x3 tile, turbine hall + cooling towers + tall striped stack
  const g = new Graphics();
  const bw = TILE_HALF_W * 2.6;
  const bh = 56;
  const roofDepth = bw * 0.7;
  const ox = TILE_HALF_W * 3;
  const oy = bh + 34;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 8, bw, 12, 0.26);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0x888883, 0x6E6E67, 0x575752);
  isoBox(g, ox - bw * 0.42, topY + 14, bw * 0.52, roofDepth * 0.5, 34, 0x74756F, 0x64645E, 0x4D4D49);

  drawCoolingTower(g, ox - bw * 0.43, topY + 2, 20, 48);
  drawCoolingTower(g, ox + bw * 0.02, topY, 18, 44);
  drawChimney(g, ox + bw * 0.22, topY - 2, 10, 66);

  // Conveyor and steam pipes.
  g.moveTo(ox - bw * 0.58, topY + 20);
  g.lineTo(ox + bw * 0.05, topY + 12);
  g.stroke({ width: 5, color: 0x4D4E50 });
  g.moveTo(ox - bw * 0.7, oy - 22);
  g.lineTo(ox - bw * 0.14, oy - 30);
  g.stroke({ width: 3, color: 0x5C5D60 });
  g.moveTo(ox - bw * 0.7, oy - 10);
  g.lineTo(ox - bw * 0.14, oy - 18);
  g.stroke({ width: 3, color: 0x5C5D60 });

  // Turbine hall vents.
  for (let i = 0; i < 4; i++) {
    const vx = ox - bw * 0.12 + i * 12;
    const vy = topY + roofDepth * 0.38 + i * 6;
    g.rect(vx, vy, 9, 4);
    g.fill(0x64686B);
  }

  // Power emblem.
  g.moveTo(ox + bw * 0.34, oy - 36);
  g.lineTo(ox + bw * 0.4, oy - 22);
  g.lineTo(ox + bw * 0.35, oy - 22);
  g.lineTo(ox + bw * 0.43, oy - 8);
  g.stroke({ width: 2, color: PALETTE.GOLD });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== GOVERNMENT / SERVICES =====

function drawPartyHQ(renderer: Renderer): Texture {
  // 2x2 tile, civic-brutalist headquarters with banners and ceremonial stair
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.9;
  const bh = 82;
  const roofDepth = bw * 0.82;
  const ox = TILE_HALF_W * 2;
  const oy = bh + 9;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 5, bw * 0.94, 9, 0.23);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0xA9A9A4, 0x8D8D88, 0x71716D);
  isoBox(g, ox, topY - 5, bw * 0.56, roofDepth * 0.54, 18, 0xB8B8B3, 0x969691, 0x7B7B77);

  // Colonnade and stair plinth.
  for (let i = 0; i < 4; i++) {
    const cx = ox - bw + 8 + i * 11;
    const cy = oy - 34 + i * 5.5;
    g.rect(cx, cy, 3.2, 31);
    g.fill(0xD6D3C8);
  }
  for (let i = 0; i < 3; i++) {
    g.poly([
      { x: ox - 16 + i * 6, y: oy + i * 2 },
      { x: ox + 7 + i * 6, y: oy + 10 + i * 2 },
      { x: ox + 7 + i * 6, y: oy + 12 + i * 2 },
      { x: ox - 16 + i * 6, y: oy + 2 + i * 2 },
    ]);
    g.fill({ color: 0x5B5B58, alpha: 0.45 });
  }

  drawLeftWindowGrid(g, ox, topY, bw, roofDepth, 4, 3, 10, 13, 6, 8, 1);
  drawRightWindowGrid(g, ox, topY, bw, roofDepth, 4, 3, 10, 13, 6, 8, 0);
  drawCornice(g, ox, topY, bw, roofDepth);
  drawBaseBand(g, ox, oy, bw, roofDepth);

  // Red banners and crest.
  g.poly([
    { x: ox - bw + 5, y: topY + roofDepth + 2 },
    { x: ox - 3, y: topY + roofDepth + bw / 2 - 1 },
    { x: ox - 3, y: topY + roofDepth + bw / 2 + 17 },
    { x: ox - bw + 5, y: topY + roofDepth + 19 },
  ]);
  g.fill(PALETTE.RED_DARK);
  g.poly([
    { x: ox + 6, y: topY + roofDepth + bw / 2 - 3 },
    { x: ox + bw - 7, y: topY + roofDepth + 2 },
    { x: ox + bw - 7, y: topY + roofDepth + 19 },
    { x: ox + 6, y: topY + roofDepth + bw / 2 + 14 },
  ]);
  g.fill(PALETTE.RED_DARK);

  drawStar(g, ox, topY - 18, 8, PALETTE.RED);
  g.moveTo(ox - bw + 2, topY + roofDepth / 2);
  g.lineTo(ox, topY - 1);
  g.lineTo(ox + bw - 2, topY + roofDepth / 2);
  g.stroke({ width: 2, color: PALETTE.GOLD, alpha: 0.85 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawHospital(renderer: Renderer): Texture {
  // 2x2 tile, modernist medical block with emergency bay
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.68;
  const bh = 66;
  const roofDepth = bw * 0.8;
  const ox = TILE_HALF_W * 2;
  const oy = bh + 9;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 4, bw * 0.9, 9, 0.2);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0xE5E5E2, 0xC9CBCB, 0xAEB2B5);
  isoBox(g, ox - bw * 0.34, topY + 9, bw * 0.45, roofDepth * 0.5, 32, 0xDBDEDE, 0xC4C7C7, 0xA8ADAE);

  drawFacadeBands(g, ox, topY, bw, roofDepth, 4, 13, 0x8A8F94, 0.22);
  drawLeftWindowGrid(g, ox, topY, bw, roofDepth, 4, 3, 11, 13, 6, 8, 1);
  drawRightWindowGrid(g, ox, topY, bw, roofDepth, 4, 2, 11, 13, 6, 8, 0);

  // Emergency entrance.
  g.poly([
    { x: ox - bw + 8, y: oy - 16 },
    { x: ox - 6, y: oy - 9 },
    { x: ox - 6, y: oy + 3 },
    { x: ox - bw + 8, y: oy - 4 },
  ]);
  g.fill(0x7B828A);
  g.rect(ox - bw + 7, oy - 18, 17, 2);
  g.fill(PALETTE.RED);

  // Roof HVAC and med emblems.
  g.rect(ox - 10, topY + 7, 8, 4);
  g.fill(0xAEB4B6);
  g.rect(ox + 2, topY + 10, 10, 4);
  g.fill(0x9BA1A3);

  const crossX = ox - bw * 0.48;
  const crossY = topY + roofDepth + 14;
  g.rect(crossX - 2, crossY - 6, 5, 13);
  g.fill(PALETTE.RED);
  g.rect(crossX - 6, crossY - 2, 13, 5);
  g.fill(PALETTE.RED);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawSchool(renderer: Renderer): Texture {
  // 2x1 tile, civic school block with gym annex and parade flag
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.34;
  const bh = 50;
  const roofDepth = bw * 0.7;
  const ox = TILE_HALF_W * 1.5;
  const oy = bh + 5;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 2, bw * 0.88, 8, 0.2);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0xD0AB56, 0xB88F3D, 0x9B7731);
  isoBox(g, ox + bw * 0.38, topY + 14, bw * 0.34, roofDepth * 0.3, 24, 0xC79F4D, 0xA98139, 0x8F6D2D);

  drawFacadeBands(g, ox, topY, bw, roofDepth, 3, 12, 0x7E5D28, 0.25);
  drawLeftWindowGrid(g, ox, topY, bw, roofDepth, 3, 3, 8, 12, 5, 7, 2);
  drawRightWindowGrid(g, ox, topY, bw, roofDepth, 3, 2, 8, 12, 5, 7, 0);

  // Main entry and mural panel.
  g.poly([
    { x: ox - bw + 11, y: oy - 13 },
    { x: ox - 1, y: oy - 7 },
    { x: ox - 1, y: oy + 2 },
    { x: ox - bw + 11, y: oy - 4 },
  ]);
  g.fill(0x6C4A1F);
  g.rect(ox + 6, oy - 23, 10, 6);
  g.fill(0xC5463E);

  g.moveTo(ox + bw * 0.32, topY - 2);
  g.lineTo(ox + bw * 0.32, topY - 22);
  g.stroke({ width: 1, color: PALETTE.IRON });
  g.poly([
    { x: ox + bw * 0.32, y: topY - 22 },
    { x: ox + bw * 0.32 + 9, y: topY - 19 },
    { x: ox + bw * 0.32, y: topY - 15 },
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
    PALETTE.PEDESTAL, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK, false);

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
  // 2x2 tile, very tall panel tower with stair-core spine and roof clutter
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.86;
  const bh = 118;
  const roofDepth = bw * 0.82;
  const ox = TILE_HALF_W * 2;
  const oy = bh + 10;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 4, bw * 0.94, 10, 0.22);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0xA4A7A8, 0x84888B, 0x6A6F72);
  drawFacadeBands(g, ox, topY, bw, roofDepth, 8, 11, 0x505356, 0.3);

  // Vertical panel joints.
  for (let i = 0; i < 5; i++) {
    const x = ox - bw + 6 + i * 8.5;
    g.moveTo(x, topY + roofDepth + 4 + i * 4);
    g.lineTo(x, oy + 2 + i * 4);
    g.stroke({ width: 0.8, color: 0x5E6368, alpha: 0.38 });
  }

  drawLeftWindowGrid(g, ox, topY, bw, roofDepth, 9, 5, 8.5, 10.5, 4.6, 6.5, 1);
  drawRightWindowGrid(g, ox, topY, bw, roofDepth, 9, 4, 8.5, 10.5, 4.6, 6.5, 0);
  drawCornice(g, ox, topY, bw, roofDepth);
  drawBaseBand(g, ox, oy, bw, roofDepth);

  // Stair core stripe.
  g.poly([
    { x: ox - 5, y: topY + roofDepth + 2 },
    { x: ox + 8, y: topY + roofDepth + 8 },
    { x: ox + 8, y: oy + 6 },
    { x: ox - 5, y: oy },
  ]);
  g.fill({ color: 0x5C6065, alpha: 0.52 });

  // Roof detail and parapet.
  drawRoofDetail(g, ox, topY, bw);
  drawRoofParapet(g, ox, topY, bw, roofDepth);

  // Roof technical floor.
  isoBox(g, ox + 6, topY - 8, bw * 0.28, roofDepth * 0.22, 14, 0x808588, 0x696D71, 0x585C60, false);
  g.rect(ox - 14, topY + 10, 9, 4);
  g.fill(0x70757A);
  g.rect(ox - 2, topY + 14, 11, 4);
  g.fill(0x6A6F75);

  // Twin antennas.
  g.moveTo(ox - 10, topY - 1);
  g.lineTo(ox - 10, topY - 21);
  g.stroke({ width: 1, color: PALETTE.IRON });
  g.moveTo(ox - 14, topY - 17);
  g.lineTo(ox - 6, topY - 17);
  g.stroke({ width: 0.8, color: PALETTE.IRON });
  g.moveTo(ox + 7, topY - 2);
  g.lineTo(ox + 7, topY - 18);
  g.stroke({ width: 1, color: PALETTE.IRON });
  g.moveTo(ox + 4, topY - 14);
  g.lineTo(ox + 10, topY - 14);
  g.stroke({ width: 0.8, color: PALETTE.IRON });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawWarehouse(renderer: Renderer): Texture {
  // 2x2 tile, logistics depot with corrugated roof and freight bays
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.84;
  const bh = 44;
  const roofDepth = bw * 0.8;
  const ox = TILE_HALF_W * 2;
  const oy = bh + 9;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 3, bw * 0.9, 9, 0.22);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0x778996, 0x5A6873, 0x465059);
  isoBox(g, ox + bw * 0.36, topY + 10, bw * 0.36, roofDepth * 0.36, 24, 0x7E8F9B, 0x63727D, 0x4A545C);
  drawRoofDetail(g, ox, topY, bw, 2);

  // Corrugation and skylight strip.
  for (let i = 0; i < 6; i++) {
    const rx = ox - bw * 0.8 + i * bw * 0.32;
    g.moveTo(rx, topY + roofDepth * 0.26 + i * 2);
    g.lineTo(rx + bw * 0.22, topY + roofDepth * 0.34 + i * 2);
    g.stroke({ width: 1, color: 0xAABAC4, alpha: 0.42 });
  }
  g.moveTo(ox - bw * 0.55, topY + roofDepth * 0.28);
  g.lineTo(ox + bw * 0.24, topY + roofDepth * 0.63);
  g.stroke({ width: 2, color: 0xD6E1E8, alpha: 0.35 });

  // Loading doors.
  for (let i = 0; i < 2; i++) {
    const dx = ox - bw + 9 + i * 15;
    const dy = oy - 30 + i * 7;
    g.rect(dx, dy, 12, 24);
    g.fill(0x3A434A);
    for (let s = 1; s <= 3; s++) {
      g.moveTo(dx, dy + s * 6);
      g.lineTo(dx + 12, dy + s * 6);
      g.stroke({ width: 0.6, color: 0x5B6870, alpha: 0.65 });
    }
  }

  // Freight markings and socialist badge.
  g.rect(ox - bw + 7, oy - 2, 24, 2.5);
  g.fill(0xB16A2E);
  drawStar(g, ox + bw * 0.35, oy - 26, 5, PALETTE.RED);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawCinema(renderer: Renderer): Texture {
  // 2x1 tile, socialist modernist cinema with stepped tower and lit marquee
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.44;
  const bh = 60;
  const roofDepth = bw * 0.62;
  const ox = TILE_HALF_W * 1.5;
  const oy = bh + 5;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 2, bw * 0.9, 8, 0.2);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0xA8AAA9, 0x8A8D8C, 0x6F7271);
  isoBox(g, ox + bw * 0.2, topY - 6, bw * 0.62, roofDepth * 0.6, 11, 0xB3B5B4, 0x949796, 0x7D807F, false);
  isoBox(g, ox + bw * 0.24, topY - 14, bw * 0.34, roofDepth * 0.32, 8, 0xBCBEBC, 0x9B9D9B, 0x848684, false);

  // Marquee and title lights.
  g.poly([
    { x: ox - bw + 4, y: topY + roofDepth + 2 },
    { x: ox - 1, y: topY + roofDepth + bw / 2 - 2 },
    { x: ox - 1, y: topY + roofDepth + bw / 2 + 16 },
    { x: ox - bw + 4, y: topY + roofDepth + 20 },
  ]);
  g.fill(PALETTE.RED_DARK);
  g.moveTo(ox - bw + 4, topY + roofDepth + 2);
  g.lineTo(ox - 1, topY + roofDepth + bw / 2 - 2);
  g.stroke({ width: 1.5, color: PALETTE.GOLD });

  for (let i = 0; i < 5; i++) {
    const lx = ox - bw + 7 + i * 5.2;
    const ly = topY + roofDepth + 7 + i * 2.6;
    g.rect(lx, ly, 2, 2);
    g.fill({ color: PALETTE.WINDOW_LIT, alpha: 0.9 });
  }

  // Entry arch and poster niches.
  g.rect(ox - bw + 10, oy - 18, 12, 18);
  g.fill(0x4D4D4D);
  g.arc(ox - bw + 16, oy - 18, 6, Math.PI, 0);
  g.fill(0x4D4D4D);
  g.rect(ox + 5, oy - 26, 7, 10);
  g.fill(0x8E2323);

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
    PALETTE.CONCRETE_LIGHT, PALETTE.CONCRETE_MID, PALETTE.CONCRETE_DARK, false);

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
  // 2x1 tile, ornate metro vestibule inspired by Moscow palace stations
  const g = new Graphics();
  const bw = TILE_HALF_W * 1.42;
  const bh = 40;
  const roofDepth = bw * 0.62;
  const ox = TILE_HALF_W * 1.5;
  const oy = bh + 5;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 2, bw * 0.88, 8, 0.2);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0xB0B0AD, 0x91918E, 0x767673);
  isoBox(g, ox - bw * 0.33, topY + 8, bw * 0.44, roofDepth * 0.38, 22, 0xBEBDBA, 0x9D9C99, 0x848380, false);

  // Portico and steps.
  g.rect(ox - bw + 10, oy - 24, 16, 22);
  g.fill(0x5B5B58);
  g.arc(ox - bw + 18, oy - 24, 8, Math.PI, 0);
  g.fill(0x5B5B58);
  g.rect(ox - bw + 8, oy - 28, 3, 26);
  g.fill(0xD9D8D2);
  g.rect(ox - bw + 25, oy - 19, 3, 17);
  g.fill(0xD9D8D2);
  for (let i = 0; i < 4; i++) {
    g.rect(ox + 2 + i * 5, oy - 8 + i * 2, 5, 2);
    g.fill(0x72726F);
  }

  // Red metro marker.
  const mX = ox - bw * 0.5;
  const mY = topY - 6;
  g.circle(mX, mY, 7);
  g.fill(PALETTE.RED);
  g.moveTo(mX - 4, mY + 3);
  g.lineTo(mX - 4, mY - 3);
  g.lineTo(mX, mY + 1);
  g.lineTo(mX + 4, mY - 3);
  g.lineTo(mX + 4, mY + 3);
  g.stroke({ width: 1.5, color: PALETTE.WHITE });

  // Ticket windows.
  g.rect(ox + 5, oy - 18, 7, 5);
  g.fill(PALETTE.WINDOW);
  g.rect(ox + 13, oy - 22, 7, 5);
  g.fill(PALETTE.WINDOW_DARK);

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
  // 3x2 tile, athletics palace with track deck and grandstand lights
  const g = new Graphics();
  const bw = TILE_HALF_W * 2.26;
  const bh = 50;
  const roofDepth = bw * 0.6;
  const ox = TILE_HALF_W * 2.5;
  const oy = bh + 22;
  const topY = oy - bh;

  drawGroundShadow(g, ox, oy + roofDepth + 7, bw * 0.97, 10, 0.24);

  isoBox(g, ox, topY, bw, roofDepth, bh, 0xB6B6B1, 0x969892, 0x797B75);
  isoBox(g, ox - bw * 0.24, topY + 10, bw * 0.38, roofDepth * 0.35, 28, 0xC0BFB8, 0x9F9D96, 0x84827C);

  const roofY = topY + roofDepth * 0.34;
  g.ellipse(ox, roofY, bw * 0.68, bw * 0.28);
  g.fill(0x8E2C2C);
  g.ellipse(ox, roofY, bw * 0.54, bw * 0.2);
  g.fill(0x4E7F3B);
  g.ellipse(ox, roofY, bw * 0.26, bw * 0.1);
  g.fill({ color: 0xA97A5A, alpha: 0.45 });

  // Stands and facade rhythm.
  for (let i = 0; i < 4; i++) {
    const ty = topY + roofDepth + 6 + i * 8;
    g.moveTo(ox + 4, ty - i * 2.5);
    g.lineTo(ox + bw - 4, ty - i * 2.5 - (bw - 8) / 2);
    g.stroke({ width: 2, color: 0xD2D2CD, alpha: 0.52 });
  }
  drawLeftWindowGrid(g, ox, topY, bw, roofDepth, 2, 4, 11, 12, 6, 8, 2);

  const lightPositions = [
    { x: ox - bw * 0.62, y: topY - 4 },
    { x: ox + bw * 0.62, y: topY - 4 },
    { x: ox - bw * 0.3, y: topY - 8 },
    { x: ox + bw * 0.3, y: topY - 8 },
  ];
  for (const lp of lightPositions) {
    g.moveTo(lp.x, topY + 2);
    g.lineTo(lp.x, lp.y - 16);
    g.stroke({ width: 1.5, color: PALETTE.IRON });
    g.rect(lp.x - 2.5, lp.y - 18, 5, 3);
    g.fill(PALETTE.YELLOW);
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

// ===== HELPER DRAWING FUNCTIONS =====

// Cornice: thin protruding highlight ledge where roof meets wall
function drawCornice(
  g: Graphics,
  ox: number, topY: number,
  bw: number, roofDepth: number,
  color = PALETTE.CORNICE_LIGHT,
  alpha = 0.55
) {
  const y = topY + roofDepth;
  // Left face cornice
  g.poly([
    { x: ox - bw + 2, y: y + 1 },
    { x: ox, y: y + bw / 2 - 1 },
    { x: ox, y: y + bw / 2 + 1.5 },
    { x: ox - bw + 2, y: y + 3.5 },
  ]);
  g.fill({ color, alpha });
  // Right face cornice
  g.poly([
    { x: ox + 2, y: y + bw / 2 - 1 },
    { x: ox + bw - 2, y: y + 1 },
    { x: ox + bw - 2, y: y + 3.5 },
    { x: ox + 2, y: y + bw / 2 + 1.5 },
  ]);
  g.fill({ color, alpha });
}

// Base band: darker plinth at ground level for grounding
// Note: isoBox uses `bw` for the top-diamond width (the `h` param is unused),
// so wall bottoms are at (ox-bw, oy+bw/2) and (ox, oy+bw).
function drawBaseBand(
  g: Graphics,
  ox: number, oy: number,
  bw: number, _roofDepth: number,
  color = PALETTE.CORNICE_DARK,
  alpha = 0.4
) {
  const bandH = 4;
  // Left face base — wall bottom runs from (ox-bw, oy+bw/2) to (ox, oy+bw)
  g.poly([
    { x: ox - bw + 1, y: oy + bw / 2 - bandH },
    { x: ox, y: oy + bw - bandH },
    { x: ox, y: oy + bw },
    { x: ox - bw + 1, y: oy + bw / 2 },
  ]);
  g.fill({ color, alpha });
  // Right face base — wall bottom runs from (ox, oy+bw) to (ox+bw, oy+bw/2)
  g.poly([
    { x: ox + 1, y: oy + bw - bandH },
    { x: ox + bw - 1, y: oy + bw / 2 - bandH },
    { x: ox + bw - 1, y: oy + bw / 2 },
    { x: ox + 1, y: oy + bw },
  ]);
  g.fill({ color, alpha });
}

// Roof detail: faint parallel lines across the top diamond to suggest material
function drawRoofDetail(
  g: Graphics,
  ox: number, topY: number,
  bw: number,
  lines = 3,
  color = 0x000000,
  alpha = 0.08
) {
  for (let i = 1; i <= lines; i++) {
    const t = i / (lines + 1);
    // Lines run parallel to the NE-SW axis of the diamond
    const startX = ox - bw + bw * 2 * t;
    const startY = topY + bw * t;
    const endX = ox + bw * (1 - t);
    const endY = topY + bw / 2 * (1 - t) + bw * t;
    g.moveTo(startX, startY);
    g.lineTo(endX, endY);
    g.stroke({ width: 0.7, color, alpha });
  }
}

// Roof parapet: thin isoBox border on top edge for brutalist flat roofs
function drawRoofParapet(
  g: Graphics,
  ox: number, topY: number,
  bw: number, roofDepth: number,
  topColor = 0x7A7D80,
  leftColor = 0x606366,
  rightColor = 0x505356
) {
  isoBox(g, ox, topY - 1.5, bw + 1, roofDepth + 1, 2,
    topColor, leftColor, rightColor, false
  );
}

function drawChimney(g: Graphics, x: number, y: number, radius: number, height: number) {
  // Industrial stack with side shading and hazard stripe.
  g.rect(x - radius / 2, y - height, radius, height);
  g.fill(PALETTE.CONCRETE_DARK);

  g.rect(x, y - height, radius / 2, height);
  g.fill({ color: 0x2F2F2F, alpha: 0.35 });

  g.rect(x - radius / 2 - 1, y - height - 2, radius + 2, 3);
  g.fill(PALETTE.CHIMNEY_TOP);

  g.rect(x - radius / 2, y - height * 0.68, radius, 4);
  g.fill(PALETTE.RED);
  g.rect(x - radius / 2, y - height * 0.52, radius, 2);
  g.fill({ color: PALETTE.WHITE, alpha: 0.7 });
}

function drawCoolingTower(g: Graphics, x: number, y: number, baseRadius: number, height: number) {
  // Hyperboloid tower with soft soot gradient.
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

  // Neck band and steam.
  g.moveTo(x - neckRadius + 1, neckY);
  g.lineTo(x + neckRadius - 1, neckY);
  g.stroke({ width: 1.2, color: 0x666666, alpha: 0.6 });
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

function drawQueueCitizen(renderer: Renderer): Texture {
  const g = new Graphics();

  // Body coat
  g.rect(3, 6, 6, 7);
  g.fill(PALETTE.RED_DARK);

  // Head
  g.circle(6, 4, 2);
  g.fill(0xD9B38C);

  // Ushanka cap
  g.rect(3, 1, 6, 2);
  g.fill(0x3B3B3B);

  // Legs
  g.rect(4, 13, 1.5, 2);
  g.fill(0x2A2A2A);
  g.rect(6.5, 13, 1.5, 2);
  g.fill(0x2A2A2A);

  const tex = renderer.generateTexture(g);
  g.destroy();
  return tex;
}
