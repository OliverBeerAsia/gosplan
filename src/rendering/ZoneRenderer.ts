import { Container, Sprite } from 'pixi.js';
import { EventBus } from '../core/EventBus';
import { TextureFactory } from '../graphics/TextureFactory';
import { Grid } from '../grid/Grid';
import { ZoneType } from '../grid/Cell';
import { gridToWorld } from './IsometricRenderer';
import { TILE_HALF_H, TILE_HALF_W } from '../constants';
import { GraphicsQuality } from '../core/GameState';

export class ZoneRenderer {
  readonly container: Container;
  private sprites: Sprite[][] = [];
  private quality: GraphicsQuality = 'high';

  constructor(
    private grid: Grid,
    private textures: TextureFactory,
    private events: EventBus
  ) {
    this.container = new Container();
    this.container.zIndex = 2;
    this.buildSprites();

    events.on('zone:changed', ({ gx, gy }) => this.updateCell(gx, gy));
    events.on('building:placed', () => this.updateAll());
    events.on('building:demolished', () => this.updateAll());
    events.on('terrain:changed', ({ gx, gy }) => this.updateCell(gx, gy));
    events.on('game:loaded', () => this.updateAll());
    events.on('graphics:quality:changed', ({ quality }) => this.setQuality(quality));
  }

  private buildSprites(): void {
    const size = this.grid.size;
    for (let gx = 0; gx < size; gx++) {
      this.sprites[gx] = [];
      for (let gy = 0; gy < size; gy++) {
        const sprite = new Sprite(this.textures.get('zone_housing'));
        const pos = gridToWorld(gx, gy, 0);
        sprite.x = pos.x - TILE_HALF_W;
        sprite.y = pos.y - TILE_HALF_H;
        sprite.alpha = 1;
        sprite.visible = false;
        this.sprites[gx][gy] = sprite;
        this.container.addChild(sprite);
      }
    }

    this.updateAll();
  }

  private getZoneTextureKey(zone: ZoneType): string {
    switch (zone) {
      case 'housing': return 'zone_housing';
      case 'industry': return 'zone_industry';
      case 'civic': return 'zone_civic';
      case 'green': return 'zone_green';
      default: return 'zone_housing';
    }
  }

  updateCell(gx: number, gy: number): void {
    const sprite = this.sprites[gx]?.[gy];
    if (!sprite) return;

    const cell = this.grid.getCell(gx, gy);
    if (!cell) {
      sprite.visible = false;
      return;
    }

    const canShow =
      cell.zone !== 'none' &&
      !cell.building &&
      this.grid.isBuildable(cell.terrain);

    if (!canShow) {
      sprite.visible = false;
      return;
    }

    sprite.texture = this.textures.get(this.getZoneTextureKey(cell.zone));
    sprite.visible = true;
  }

  updateAll(): void {
    const size = this.grid.size;
    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        this.updateCell(gx, gy);
      }
    }
  }

  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    this.container.alpha = quality === 'low' ? 0.78 : quality === 'medium' ? 0.9 : 1;
  }
}
