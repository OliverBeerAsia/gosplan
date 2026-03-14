import { Container, Sprite } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { TextureFactory } from '../graphics/TextureFactory';
import { EventBus } from '../core/EventBus';
import { gridToWorld } from './IsometricRenderer';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { GraphicsQuality } from '../core/GameState';
import { TerrainType } from '../grid/Cell';
import { TerrainSeason } from '../graphics/TerrainTextures';

const TERRAIN_VARIANTS: Record<TerrainType, number> = {
  ground: 5,
  dirt: 5,
  forest: 5,
  water: 5,
  hill: 5,
};

const TERRAIN_PRIORITY: Record<TerrainType, number> = {
  ground: 0,
  dirt: 1,
  forest: 2,
  hill: 3,
  water: 4,
};

export class TerrainRenderer {
  readonly container: Container;
  private groundContainer: Container;
  private edgeContainer: Container;
  private decalContainer: Container;

  private baseSprites: Sprite[][] = [];
  private edgeSprites: Sprite[][] = [];
  private decalSprites: Sprite[][] = [];
  private quality: GraphicsQuality = 'high';

  // Water shimmer tracking
  private waterTiles: { gx: number; gy: number; hash: number }[] = [];
  private currentSeason: TerrainSeason | null = null; // null = summer (default)

  constructor(
    private grid: Grid,
    private textures: TextureFactory,
    private events?: EventBus
  ) {
    this.container = new Container();
    this.groundContainer = new Container();
    this.edgeContainer = new Container();
    this.decalContainer = new Container();
    this.container.addChild(this.groundContainer);
    this.container.addChild(this.edgeContainer);
    this.container.addChild(this.decalContainer);

    this.buildTerrain();

    if (events) {
      events.on('terrain:changed', ({ gx, gy }) => this.updateAround(gx, gy));
      events.on('graphics:quality:changed', ({ quality }) => this.setQuality(quality));
    }
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

    // Try seasonal texture first
    const s = season ?? this.currentSeason;
    if (s) {
      const seasonalKey = `${terrain}_${s}_${variant}`;
      if (this.textures.has(seasonalKey)) return seasonalKey;
    }

    const key = `${terrain}_${variant}`;
    return this.textures.has(key) ? key : terrain;
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
        const pos = gridToWorld(gx, gy, 0);

        const baseSprite = new Sprite(this.textures.get(this.getTerrainVariantKey(cell.terrain, gx, gy)));
        baseSprite.x = pos.x - TILE_HALF_W;
        baseSprite.y = pos.y - TILE_HALF_H;
        this.baseSprites[gx][gy] = baseSprite;
        this.groundContainer.addChild(baseSprite);

        const edgeMask = this.getEdgeMask(gx, gy);
        const edgeSprite = new Sprite(this.textures.get(`terrain_edge_${edgeMask}`));
        edgeSprite.x = pos.x - TILE_HALF_W;
        edgeSprite.y = pos.y - TILE_HALF_H;
        edgeSprite.alpha = edgeMask === 0 ? 0 : 1;
        this.edgeSprites[gx][gy] = edgeSprite;
        this.edgeContainer.addChild(edgeSprite);

        const decalKey = this.getDecalKey(cell.terrain, gx, gy);
        const decalSprite = new Sprite(this.textures.get(decalKey));
        decalSprite.x = pos.x - TILE_HALF_W;
        decalSprite.y = pos.y - TILE_HALF_H;
        decalSprite.alpha = decalKey === 'terrain_decal_0' ? 0 : 0.8;
        this.decalSprites[gx][gy] = decalSprite;
        this.decalContainer.addChild(decalSprite);

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

    base.texture = this.textures.get(this.getTerrainVariantKey(cell.terrain, gx, gy));

    const edgeMask = this.getEdgeMask(gx, gy);
    edge.texture = this.textures.get(`terrain_edge_${edgeMask}`);
    edge.alpha = edgeMask === 0 ? 0 : 1;

    const decalKey = this.getDecalKey(cell.terrain, gx, gy);
    decal.texture = this.textures.get(decalKey);
    decal.alpha = decalKey === 'terrain_decal_0' ? 0 : 0.8;
  }

  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    this.edgeContainer.visible = quality !== 'low';
    this.decalContainer.visible = quality === 'high';
  }

  /** Animate water tile tints with a gentle shimmer. Call from the game loop. */
  updateWaterShimmer(now: number): void {
    if (this.quality === 'low') return;

    // Season-aware water colors
    let baseR: number, baseG: number, baseB: number;
    let lightR: number, lightG: number, lightB: number;
    if (this.currentSeason === 'winter') {
      // Icy blue-gray
      baseR = 0x6A; baseG = 0x7A; baseB = 0x8A;
      lightR = 0x7A; lightG = 0x8E; lightB = 0x9E;
    } else if (this.currentSeason === 'autumn') {
      // Darker, muted water
      baseR = 0x3E; baseG = 0x5A; baseB = 0x6A;
      lightR = 0x50; lightG = 0x70; lightB = 0x80;
    } else if (this.currentSeason === 'spring') {
      // Slightly brighter
      baseR = 0x4A; baseG = 0x7A; baseB = 0x90;
      lightR = 0x5A; lightG = 0x8E; lightB = 0xA4;
    } else {
      // Summer default (PALETTE.WATER / PALETTE.WATER_LIGHT)
      baseR = 0x4A; baseG = 0x6B; baseB = 0x7C;
      lightR = 0x5D; lightG = 0x8A; lightB = 0x9C;
    }

    for (const wt of this.waterTiles) {
      const sprite = this.baseSprites[wt.gx]?.[wt.gy];
      if (!sprite) continue;

      const phase = now * 0.001 + wt.hash * 0.1;
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
        }
        if (decal) {
          decal.tint = terrainSeason ? 0xFFFFFF : baseTint;
        }
      }
    }
  }
}
