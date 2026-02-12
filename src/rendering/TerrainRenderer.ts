import { Container, Sprite } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { TextureFactory } from '../graphics/TextureFactory';
import { EventBus } from '../core/EventBus';
import { gridToWorld } from './IsometricRenderer';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';

export class TerrainRenderer {
  readonly container: Container;
  private sprites: Sprite[][] = [];

  constructor(
    private grid: Grid,
    private textures: TextureFactory,
    private events?: EventBus
  ) {
    this.container = new Container();
    this.buildTerrain();

    if (events) {
      events.on('terrain:changed', ({ gx, gy }) => {
        this.updateCell(gx, gy);
      });
    }
  }

  private getTerrainTexKey(terrain: string): string {
    switch (terrain) {
      case 'water': return 'water';
      case 'forest': return 'forest';
      case 'hill': return 'hill';
      case 'dirt': return 'dirt';
      default: return 'ground';
    }
  }

  private buildTerrain(): void {
    const size = this.grid.size;
    for (let gx = 0; gx < size; gx++) {
      this.sprites[gx] = [];
      for (let gy = 0; gy < size; gy++) {
        const cell = this.grid.getCell(gx, gy)!;
        const texKey = this.getTerrainTexKey(cell.terrain);
        const sprite = new Sprite(this.textures.get(texKey));
        const pos = gridToWorld(gx, gy, 0);
        sprite.x = pos.x - TILE_HALF_W;
        sprite.y = pos.y - TILE_HALF_H;
        this.sprites[gx][gy] = sprite;
        this.container.addChild(sprite);
      }
    }
  }

  updateCell(gx: number, gy: number): void {
    const cell = this.grid.getCell(gx, gy);
    if (!cell) return;
    const sprite = this.sprites[gx]?.[gy];
    if (!sprite) return;
    const texKey = this.getTerrainTexKey(cell.terrain);
    sprite.texture = this.textures.get(texKey);
  }

  updateSeason(tint: number | null): void {
    const size = this.grid.size;
    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        const sprite = this.sprites[gx]?.[gy];
        if (sprite) {
          sprite.tint = tint ?? 0xFFFFFF;
        }
      }
    }
  }
}
