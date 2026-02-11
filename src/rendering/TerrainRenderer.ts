import { Container, Sprite } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { TextureFactory } from '../graphics/TextureFactory';
import { gridToWorld } from './IsometricRenderer';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';

export class TerrainRenderer {
  readonly container: Container;
  private sprites: Sprite[][] = [];

  constructor(
    private grid: Grid,
    private textures: TextureFactory
  ) {
    this.container = new Container();
    this.buildTerrain();
  }

  private buildTerrain(): void {
    const size = this.grid.size;
    for (let gx = 0; gx < size; gx++) {
      this.sprites[gx] = [];
      for (let gy = 0; gy < size; gy++) {
        const cell = this.grid.getCell(gx, gy)!;
        const texKey = cell.terrain === 'water' ? 'water' : 'ground';
        const sprite = new Sprite(this.textures.get(texKey));
        const pos = gridToWorld(gx, gy, cell.elevation);
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
    const texKey = cell.terrain === 'water' ? 'water' : 'ground';
    sprite.texture = this.textures.get(texKey);
  }
}
