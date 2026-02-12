import { Container, Sprite } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { TextureFactory } from '../graphics/TextureFactory';
import { EventBus } from '../core/EventBus';
import { gridToWorld } from './IsometricRenderer';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { GraphicsQuality } from '../core/GameState';
import { TerrainType } from '../grid/Cell';

const TERRAIN_VARIANTS: Record<TerrainType, number> = {
  ground: 3,
  dirt: 3,
  forest: 3,
  water: 2,
  hill: 2,
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

  private getTerrainVariantKey(terrain: TerrainType, gx: number, gy: number): string {
    const count = TERRAIN_VARIANTS[terrain] ?? 1;
    if (count <= 1) return terrain;
    const variant = this.tileHash(gx, gy) % count;
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

  updateSeason(tint: number | null): void {
    const size = this.grid.size;
    const baseTint = tint ?? 0xFFFFFF;

    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        const base = this.baseSprites[gx]?.[gy];
        const decal = this.decalSprites[gx]?.[gy];
        if (base) {
          base.tint = baseTint;
        }
        if (decal) {
          decal.tint = baseTint;
        }
      }
    }
  }
}
