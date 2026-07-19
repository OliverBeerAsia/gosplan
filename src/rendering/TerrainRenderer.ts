import { Container, Graphics, Sprite } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { TextureFactory } from '../graphics/TextureFactory';
import { EventBus } from '../core/EventBus';
import {
  CliffDirection,
  getCliffFaceBandGeometry,
  getCliffFaceGeometry,
  gridToWorld,
} from './IsometricRenderer';
import {
  tileDepth,
  WorldDepthPhase,
  type WorldDepthLayer,
} from './WorldDepth';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { GraphicsQuality } from '../core/GameState';
import { TerrainType } from '../grid/Cell';
import { TerrainSeason, TILE_TEXTURE_OVERHEAD } from '../graphics/TerrainTextures';

const TERRAIN_VARIANTS: Record<TerrainType, number> = {
  ground: 3,
  dirt: 3,
  forest: 3,
  water: 3,
  hill: 3,
};

const TERRAIN_PRIORITY: Record<TerrainType, number> = {
  ground: 0,
  dirt: 1,
  forest: 2,
  hill: 3,
  water: 4,
};

const CLIFF_FACE_COLORS: Record<TerrainType, Record<CliffDirection, number>> = {
  ground: { gx: 0x735F42, gy: 0x625139 },
  dirt: { gx: 0x756445, gy: 0x65543A },
  forest: { gx: 0x5D5037, gy: 0x4F432F },
  hill: { gx: 0x727265, gy: 0x606055 },
  water: { gx: 0x466875, gy: 0x3B5966 },
};

interface CliffMaterialColors {
  lip: number;
  band: number;
  grain: number;
  shadow: number;
}

const CLIFF_MATERIAL_COLORS: Record<TerrainType, CliffMaterialColors> = {
  ground: { lip: 0x879064, band: 0x967957, grain: 0x514434, shadow: 0x40372C },
  dirt: { lip: 0x97835D, band: 0x8B744F, grain: 0x58452F, shadow: 0x493B2B },
  forest: { lip: 0x4F6D40, band: 0x756247, grain: 0x40362A, shadow: 0x352E26 },
  hill: { lip: 0x9A9A8E, band: 0x858579, grain: 0x55554D, shadow: 0x45453F },
  water: { lip: 0x678997, band: 0x587887, grain: 0x344E59, shadow: 0x2F4650 },
};

export class TerrainRenderer {
  readonly container: Container;
  private cliffContainer: Container;
  private groundContainer: Container;
  private edgeContainer: Container;
  private decalContainer: Container;

  private baseSprites: Sprite[][] = [];
  private edgeSprites: Sprite[][] = [];
  private decalSprites: Sprite[][] = [];
  private cliffFaces: Graphics[] = [];
  private quality: GraphicsQuality = 'high';

  // Water shimmer tracking
  private waterTiles: { gx: number; gy: number; hash: number }[] = [];
  private currentSeason: TerrainSeason | null = null; // null = summer (default)
  // Far-zoom LOD state with hysteresis (enter below 0.45, leave above 0.55)
  private farZoom = false;
  // Pre-cached shimmer colors (updated on season change)
  private shimmerBaseR = 0x4A; private shimmerBaseG = 0x6B; private shimmerBaseB = 0x7C;
  private shimmerLightR = 0x5D; private shimmerLightG = 0x8A; private shimmerLightB = 0x9C;

  constructor(
    private grid: Grid,
    private textures: TextureFactory,
    private worldDepth: WorldDepthLayer,
    private events?: EventBus
  ) {
    this.container = new Container();
    this.cliffContainer = new Container();
    this.groundContainer = new Container();
    this.edgeContainer = new Container();
    this.decalContainer = new Container();
    this.cliffContainer.sortableChildren = true;
    this.groundContainer.sortableChildren = true;
    this.edgeContainer.sortableChildren = true;
    this.decalContainer.sortableChildren = true;
    // Faces are intentionally below every tile top. This closes the raised
    // geometry while allowing lower neighbors to mask the face bottoms.
    this.container.addChild(this.cliffContainer);
    this.container.addChild(this.groundContainer);
    this.container.addChild(this.edgeContainer);
    this.container.addChild(this.decalContainer);

    this.buildTerrain();
    this.rebuildCliffs();

    if (events) {
      events.on('terrain:changed', ({ gx, gy }) => {
        this.updateAround(gx, gy);
        this.rebuildCliffs();
      });
      events.on('game:loaded', () => this.rebuildCliffs());
      events.on('graphics:quality:changed', ({ quality }) => this.setQuality(quality));
      events.on('camera:moved', ({ zoom }) => this.updateZoomLod(zoom));
    }
  }

  /**
   * Far-zoom level of detail: below ~0.45x individual trees and decal specks
   * alias into noise, so forests swap to massed canopy tiles and decals hide.
   * Hysteresis prevents thrashing at the boundary.
   */
  private updateZoomLod(zoom: number): void {
    const wantFar = this.farZoom ? zoom < 0.55 : zoom < 0.45;
    if (wantFar === this.farZoom) return;
    this.farZoom = wantFar;

    this.decalContainer.visible = !wantFar && this.quality === 'high';

    for (let gx = 0; gx < this.grid.size; gx++) {
      for (let gy = 0; gy < this.grid.size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell || cell.terrain !== 'forest') continue;
        const base = this.baseSprites[gx]?.[gy];
        if (!base) continue;
        base.texture = this.textures.get(this.getTerrainVariantKey('forest', gx, gy));
      }
    }
  }

  private rebuildCliffs(): void {
    for (const face of this.cliffFaces) {
      this.cliffContainer.removeChild(face);
      face.destroy();
    }
    this.cliffFaces = [];

    for (let gx = 0; gx < this.grid.size; gx++) {
      for (let gy = 0; gy < this.grid.size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell) continue;
        const elevation = this.grid.getElevation(gx, gy);
        if (elevation <= 0) continue;

        this.addCliffFaces(gx, gy, elevation, 'gx', gx + 1, gy, cell.terrain);
        this.addCliffFaces(gx, gy, elevation, 'gy', gx, gy + 1, cell.terrain);
      }
    }
  }

  private addCliffFaces(
    gx: number,
    gy: number,
    elevation: number,
    direction: CliffDirection,
    neighborGx: number,
    neighborGy: number,
    terrain: TerrainType
  ): void {
    const neighborElevation = this.grid.inBounds(neighborGx, neighborGy)
      ? this.grid.getElevation(neighborGx, neighborGy)
      : 0;
    const geometry = getCliffFaceGeometry(gx, gy, elevation, neighborElevation, direction);
    if (geometry.length === 0) return;

    const style = this.getCliffStyle(terrain, direction);
    for (const tier of geometry) {
      const face = new Graphics();
      face.poly(tier.points).fill({
        color: this.offsetColor(style.base, tier.step % 2 === 0 ? 0 : -4),
        alpha: 1,
      });

      // A directional middle band prevents a large face from reading as a
      // single empty polygon while staying quieter than a universal outline.
      face.poly(getCliffFaceBandGeometry(tier.points, 0.40, 0.57)).fill({
        color: style.band,
        alpha: direction === 'gx' ? 0.20 : 0.15,
      });

      // Only the lowest exposed tier receives a grounded contact shadow. The
      // lower tile top is drawn later and masks its outer edge.
      if (tier.step === geometry.length - 1) {
        face.poly(getCliffFaceBandGeometry(tier.points, 0.82, 1)).fill({
          color: style.shadow,
          alpha: 0.24,
        });
      }

      // Horizontal strata: sedimentary banding makes tall faces read as
      // earth and rock instead of extruded polygons.
      const strataCount = 2 + (this.tileHash(gx * 5 + tier.step, gy * 3) % 2);
      for (let s = 0; s < strataCount; s++) {
        const v = 0.18 + (s + 1) * (0.62 / (strataCount + 1))
          + ((this.tileHash(gx + s * 11, gy + tier.step * 7) % 8) - 4) / 100;
        const band = getCliffFaceBandGeometry(tier.points, v, v + 0.045);
        face.poly(band).fill({
          color: s % 2 === 0 ? style.grain : style.band,
          alpha: s % 2 === 0 ? 0.16 : 0.20,
        });
      }
      // Occasional embedded stones along a stratum
      for (let stone = 0; stone < 2; stone++) {
        const h = this.tileHash(gx * 23 + stone * 13 + tier.step, gy * 31 + (direction === 'gx' ? 3 : 7));
        if (h % 5 !== 0) continue;
        const p = this.getCliffFacePoint(tier.points, 0.15 + (h % 70) / 100, 0.3 + ((h >>> 8) % 45) / 100);
        face.ellipse(Math.round(p.x), Math.round(p.y), 1.6, 1);
        face.fill({ color: style.grain, alpha: 0.4 });
      }

      this.drawCliffTexture(face, tier.points, gx, gy, tier.step, direction, style.grain);

      // Material-aware top lip: vegetation, dirt, rock, or a winter snow cap.
      // Inset it slightly so the subsequently drawn terrain top does not erase
      // the full stroke at their shared edge.
      const lipEdge = getCliffFaceBandGeometry(tier.points, 0.035, 0.035);
      face.moveTo(lipEdge[0].x, lipEdge[0].y);
      face.lineTo(lipEdge[1].x, lipEdge[1].y);
      face.stroke({ color: style.lip, width: 1.25, alpha: 0.82 });

      face.zIndex = tileDepth(
        gx,
        gy,
        WorldDepthPhase.CLIFF,
        tier.step * 2 + (direction === 'gx' ? 0 : 1)
      );
      this.cliffContainer.addChild(face);
      this.worldDepth.attach(face);
      this.cliffFaces.push(face);
    }
  }

  private getCliffStyle(
    terrain: TerrainType,
    direction: CliffDirection
  ): CliffMaterialColors & { base: number } {
    const material = CLIFF_MATERIAL_COLORS[terrain];
    let base = CLIFF_FACE_COLORS[terrain][direction];
    let lip = material.lip;
    let band = material.band;
    let grain = material.grain;
    let shadow = material.shadow;

    if (this.currentSeason === 'winter') {
      const coldStone = 0x7D858E;
      base = this.mixColor(base, coldStone, 0.28);
      band = this.mixColor(band, 0x929BA4, 0.32);
      grain = this.mixColor(grain, 0x68717A, 0.24);
      shadow = this.mixColor(shadow, 0x4D5661, 0.30);
      lip = terrain === 'water' ? 0xAFC3CF : 0xD6DCE2;
    } else if (this.currentSeason === 'autumn') {
      lip = this.mixColor(lip, 0xB38C55, 0.18);
    } else if (this.currentSeason === 'spring') {
      lip = this.mixColor(lip, 0xA6BC7A, 0.16);
    }

    return { base, lip, band, grain, shadow };
  }

  private drawCliffTexture(
    face: Graphics,
    points: Array<{ x: number; y: number }>,
    gx: number,
    gy: number,
    step: number,
    direction: CliffDirection,
    color: number
  ): void {
    const directionSalt = direction === 'gx' ? 37 : 71;
    for (let mark = 0; mark < 2; mark++) {
      const hash = this.tileHash(
        gx * 13 + step * 7 + mark * 31,
        gy * 17 + directionSalt + mark * 19
      );
      const vertical = 0.22 + (hash % 48) / 100;
      const horizontal = 0.12 + ((hash >>> 8) % 58) / 100;
      const length = 0.08 + ((hash >>> 16) % 10) / 100;
      const from = this.getCliffFacePoint(points, horizontal, vertical);
      const to = this.getCliffFacePoint(points, Math.min(0.88, horizontal + length), vertical);
      face.moveTo(Math.round(from.x), Math.round(from.y));
      face.lineTo(Math.round(to.x), Math.round(to.y));
      face.stroke({ color, width: 1, alpha: 0.34 });
    }
  }

  private getCliffFacePoint(
    points: Array<{ x: number; y: number }>,
    horizontal: number,
    vertical: number
  ): { x: number; y: number } {
    const left = {
      x: points[0].x + (points[3].x - points[0].x) * vertical,
      y: points[0].y + (points[3].y - points[0].y) * vertical,
    };
    const right = {
      x: points[1].x + (points[2].x - points[1].x) * vertical,
      y: points[1].y + (points[2].y - points[1].y) * vertical,
    };
    return {
      x: left.x + (right.x - left.x) * horizontal,
      y: left.y + (right.y - left.y) * horizontal,
    };
  }

  private mixColor(from: number, to: number, amount: number): number {
    const fromR = (from >> 16) & 0xFF;
    const fromG = (from >> 8) & 0xFF;
    const fromB = from & 0xFF;
    const toR = (to >> 16) & 0xFF;
    const toG = (to >> 8) & 0xFF;
    const toB = to & 0xFF;
    const r = Math.round(fromR + (toR - fromR) * amount);
    const g = Math.round(fromG + (toG - fromG) * amount);
    const b = Math.round(fromB + (toB - fromB) * amount);
    return (r << 16) | (g << 8) | b;
  }

  private offsetColor(color: number, amount: number): number {
    const r = Math.max(0, Math.min(255, ((color >> 16) & 0xFF) + amount));
    const g = Math.max(0, Math.min(255, ((color >> 8) & 0xFF) + amount));
    const b = Math.max(0, Math.min(255, (color & 0xFF) + amount));
    return (r << 16) | (g << 8) | b;
  }

  private tileHash(gx: number, gy: number): number {
    let v = gx * 374761393 + gy * 668265263;
    v = (v ^ (v >>> 13)) * 1274126177;
    return Math.abs(v);
  }

  private getTerrainVariantKey(terrain: TerrainType, gx: number, gy: number, season?: TerrainSeason | null): string {
    const count = TERRAIN_VARIANTS[terrain] ?? 1;
    if (count <= 1) return terrain;
    const variant = this.tileHash(gx, gy) % count;
    const s = season ?? this.currentSeason;

    // Far-zoom canopy LOD for forests
    if (terrain === 'forest' && this.farZoom) {
      const farKey = s ? `forest_${s}_far_${variant}` : `forest_far_${variant}`;
      if (this.textures.has(farKey)) return farKey;
    }

    // Try seasonal texture first
    if (s) {
      const seasonalKey = `${terrain}_${s}_${variant}`;
      if (this.textures.has(seasonalKey)) return seasonalKey;
    }

    const key = `${terrain}_${variant}`;
    return this.textures.has(key) ? key : terrain;
  }

  /**
   * Water tiles use the edge-sprite slot for shorelines: foam and submerged
   * bank against land neighbors, shore-fast ice in winter.
   */
  private getShorelineMask(gx: number, gy: number): number {
    const neighbors = [
      { bit: 1, x: gx, y: gy - 1 },
      { bit: 2, x: gx + 1, y: gy },
      { bit: 4, x: gx, y: gy + 1 },
      { bit: 8, x: gx - 1, y: gy },
    ];
    let mask = 0;
    for (const n of neighbors) {
      const neighbor = this.grid.getCell(n.x, n.y);
      if (!neighbor) continue;
      if (neighbor.terrain !== 'water') mask |= n.bit;
    }
    return mask;
  }

  private getEdgeTextureKey(gx: number, gy: number): { key: string; mask: number } {
    const cell = this.grid.getCell(gx, gy);
    if (cell?.terrain === 'water') {
      const mask = this.getShorelineMask(gx, gy);
      const prefix = this.currentSeason === 'winter' ? 'shore_winter_' : 'shore_';
      return { key: `${prefix}${mask}`, mask };
    }
    const mask = this.getEdgeMask(gx, gy);
    return { key: `terrain_edge_${mask}`, mask };
  }

  private getDecalKey(terrain: TerrainType, gx: number, gy: number): string {
    if (terrain !== 'ground' && terrain !== 'dirt') return 'terrain_decal_0';

    const roll = this.tileHash(gx + 37, gy - 19) % 100;
    if (roll < 62) return 'terrain_decal_0';
    return `terrain_decal_${1 + (roll % 3)}`;
  }

  private getEdgeMask(gx: number, gy: number): number {
    const cell = this.grid.getCell(gx, gy);
    if (!cell) return 0;

    const currentPriority = TERRAIN_PRIORITY[cell.terrain] ?? 0;
    const neighbors = [
      { bit: 1, x: gx, y: gy - 1 },
      { bit: 2, x: gx + 1, y: gy },
      { bit: 4, x: gx, y: gy + 1 },
      { bit: 8, x: gx - 1, y: gy },
    ];

    let mask = 0;
    for (const n of neighbors) {
      const neighbor = this.grid.getCell(n.x, n.y);
      if (!neighbor) continue;
      if (neighbor.terrain === cell.terrain) continue;
      const np = TERRAIN_PRIORITY[neighbor.terrain] ?? 0;
      if (np > currentPriority) {
        mask |= n.bit;
      }
    }

    return mask;
  }

  private buildTerrain(): void {
    const size = this.grid.size;
    this.waterTiles = [];

    for (let gx = 0; gx < size; gx++) {
      this.baseSprites[gx] = [];
      this.edgeSprites[gx] = [];
      this.decalSprites[gx] = [];

      for (let gy = 0; gy < size; gy++) {
        const cell = this.grid.getCell(gx, gy)!;
        const elevation = this.grid.getElevation(gx, gy);
        const pos = gridToWorld(gx, gy, elevation);
        const baseDepth = tileDepth(gx, gy, WorldDepthPhase.TERRAIN);

        const baseSprite = new Sprite(this.textures.get(this.getTerrainVariantKey(cell.terrain, gx, gy)));
        baseSprite.x = pos.x - TILE_HALF_W;
        // Base tile textures carry fixed overhead space for tall details
        baseSprite.y = pos.y - TILE_HALF_H - TILE_TEXTURE_OVERHEAD;
        baseSprite.zIndex = baseDepth;
        this.baseSprites[gx][gy] = baseSprite;
        this.groundContainer.addChild(baseSprite);
        this.worldDepth.attach(baseSprite);

        const edge = this.getEdgeTextureKey(gx, gy);
        const edgeSprite = new Sprite(this.textures.get(edge.key));
        edgeSprite.x = pos.x - TILE_HALF_W;
        edgeSprite.y = pos.y - TILE_HALF_H;
        edgeSprite.zIndex = tileDepth(gx, gy, WorldDepthPhase.TERRAIN_EDGE);
        edgeSprite.alpha = edge.mask === 0 ? 0 : 1;
        this.edgeSprites[gx][gy] = edgeSprite;
        this.edgeContainer.addChild(edgeSprite);
        this.worldDepth.attach(edgeSprite);

        const decalKey = this.getDecalKey(cell.terrain, gx, gy);
        const decalSprite = new Sprite(this.textures.get(decalKey));
        decalSprite.x = pos.x - TILE_HALF_W;
        decalSprite.y = pos.y - TILE_HALF_H;
        decalSprite.zIndex = tileDepth(gx, gy, WorldDepthPhase.TERRAIN_DECAL);
        decalSprite.alpha = decalKey === 'terrain_decal_0' ? 0 : 0.8;
        this.decalSprites[gx][gy] = decalSprite;
        this.decalContainer.addChild(decalSprite);
        this.worldDepth.attach(decalSprite);

        if (cell.terrain === 'water') {
          this.waterTiles.push({ gx, gy, hash: this.tileHash(gx, gy) });
        }
      }
    }
  }

  private updateAround(gx: number, gy: number): void {
    for (let x = gx - 1; x <= gx + 1; x++) {
      for (let y = gy - 1; y <= gy + 1; y++) {
        this.updateCell(x, y);
      }
    }
  }

  updateCell(gx: number, gy: number): void {
    const cell = this.grid.getCell(gx, gy);
    if (!cell) return;

    const base = this.baseSprites[gx]?.[gy];
    const edge = this.edgeSprites[gx]?.[gy];
    const decal = this.decalSprites[gx]?.[gy];
    if (!base || !edge || !decal) return;

    const elevation = this.grid.getElevation(gx, gy);
    const pos = gridToWorld(gx, gy, elevation);
    for (const sprite of [base, edge, decal]) {
      sprite.x = pos.x - TILE_HALF_W;
      sprite.y = pos.y - TILE_HALF_H;
    }
    // Base tile textures carry fixed overhead space for tall details
    base.y = pos.y - TILE_HALF_H - TILE_TEXTURE_OVERHEAD;
    base.zIndex = tileDepth(gx, gy, WorldDepthPhase.TERRAIN);
    edge.zIndex = tileDepth(gx, gy, WorldDepthPhase.TERRAIN_EDGE);
    decal.zIndex = tileDepth(gx, gy, WorldDepthPhase.TERRAIN_DECAL);

    base.texture = this.textures.get(this.getTerrainVariantKey(cell.terrain, gx, gy));

    const edgeInfo = this.getEdgeTextureKey(gx, gy);
    edge.texture = this.textures.get(edgeInfo.key);
    edge.alpha = edgeInfo.mask === 0 ? 0 : 1;

    const decalKey = this.getDecalKey(cell.terrain, gx, gy);
    decal.texture = this.textures.get(decalKey);
    decal.alpha = decalKey === 'terrain_decal_0' ? 0 : 0.8;
  }

  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    this.edgeContainer.visible = quality !== 'low';
    this.decalContainer.visible = quality === 'high' && !this.farZoom;
  }

  private shimmerFrame = 0;

  /** Animate water tile tints with a gentle shimmer. Call from the game loop. */
  updateWaterShimmer(now: number): void {
    if (this.quality === 'low') return;
    // Frozen water is matte: no shimmer in winter, and none at far zoom
    // where per-tile tint churn is invisible anyway.
    if (this.currentSeason === 'winter' || this.farZoom) return;
    // Throttle to every 3rd frame — shimmer is smooth enough at ~20fps
    if (++this.shimmerFrame % 3 !== 0) return;

    // Use pre-cached season colors (updated in updateSeason)
    const baseR = this.shimmerBaseR, baseG = this.shimmerBaseG, baseB = this.shimmerBaseB;
    const lightR = this.shimmerLightR, lightG = this.shimmerLightG, lightB = this.shimmerLightB;

    for (const wt of this.waterTiles) {
      const sprite = this.baseSprites[wt.gx]?.[wt.gy];
      if (!sprite) continue;

      const phase = now * 0.001 + wt.hash * 0.01;
      const t = (Math.sin(phase) + 1) * 0.5; // 0..1

      const r = Math.round(baseR + (lightR - baseR) * t * 0.3);
      const g = Math.round(baseG + (lightG - baseG) * t * 0.3);
      const b = Math.round(baseB + (lightB - baseB) * t * 0.3);

      sprite.tint = (r << 16) | (g << 8) | b;
    }
  }

  updateSeason(tint: number | null, season?: string): void {
    // Map season string to TerrainSeason (null = summer)
    const terrainSeason: TerrainSeason | null =
      season === 'winter' || season === 'autumn' || season === 'spring'
        ? season
        : null;

    this.currentSeason = terrainSeason;

    // Update cached shimmer colors for new season
    if (terrainSeason === 'winter') {
      this.shimmerBaseR = 0x6A; this.shimmerBaseG = 0x7A; this.shimmerBaseB = 0x8A;
      this.shimmerLightR = 0x7A; this.shimmerLightG = 0x8E; this.shimmerLightB = 0x9E;
    } else if (terrainSeason === 'autumn') {
      this.shimmerBaseR = 0x3E; this.shimmerBaseG = 0x5A; this.shimmerBaseB = 0x6A;
      this.shimmerLightR = 0x50; this.shimmerLightG = 0x70; this.shimmerLightB = 0x80;
    } else if (terrainSeason === 'spring') {
      this.shimmerBaseR = 0x4A; this.shimmerBaseG = 0x7A; this.shimmerBaseB = 0x90;
      this.shimmerLightR = 0x5A; this.shimmerLightG = 0x8E; this.shimmerLightB = 0xA4;
    } else {
      this.shimmerBaseR = 0x4A; this.shimmerBaseG = 0x6B; this.shimmerBaseB = 0x7C;
      this.shimmerLightR = 0x5D; this.shimmerLightG = 0x8A; this.shimmerLightB = 0x9C;
    }

    const size = this.grid.size;
    const baseTint = tint ?? 0xFFFFFF;

    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        const base = this.baseSprites[gx]?.[gy];
        const decal = this.decalSprites[gx]?.[gy];
        if (!cell || !base) continue;

        // Swap to seasonal texture if available
        const key = this.getTerrainVariantKey(cell.terrain, gx, gy, terrainSeason);
        base.texture = this.textures.get(key);

        // Water uses shimmer, others get tint for any remaining color correction
        if (cell.terrain !== 'water') {
          // Only apply tint if we're using a non-seasonal (summer) texture
          base.tint = terrainSeason ? 0xFFFFFF : baseTint;
        } else {
          // Frozen sheets are matte; clear any residual shimmer tint
          if (terrainSeason === 'winter') base.tint = 0xFFFFFF;
          // Shorelines swap between foam and shore-fast ice
          const edge = this.edgeSprites[gx]?.[gy];
          if (edge) {
            const edgeInfo = this.getEdgeTextureKey(gx, gy);
            edge.texture = this.textures.get(edgeInfo.key);
            edge.alpha = edgeInfo.mask === 0 ? 0 : 1;
          }
        }
        if (decal) {
          decal.tint = terrainSeason ? 0xFFFFFF : baseTint;
        }
      }
    }
    this.rebuildCliffs();
  }
}
