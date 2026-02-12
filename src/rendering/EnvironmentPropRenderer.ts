import { Container, Sprite } from 'pixi.js';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { GraphicsQuality } from '../core/GameState';
import { Grid } from '../grid/Grid';
import { gridToWorld, depthKey } from './IsometricRenderer';
import { TILE_HALF_H, TILE_HALF_W } from '../constants';
import { TextureFactory } from '../graphics/TextureFactory';

type PropTextureKey =
  | 'prop_none'
  | 'prop_lamp'
  | 'prop_fence'
  | 'prop_kiosk'
  | 'prop_courtyard'
  | 'prop_pole'
  | 'prop_bus_stop';

export class EnvironmentPropRenderer {
  readonly container: Container;
  private sprites: Sprite[][] = [];
  private quality: GraphicsQuality = 'high';

  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private textures: TextureFactory,
    private events: EventBus
  ) {
    this.container = new Container();
    this.container.sortableChildren = true;
    this.buildSprites();

    events.on('building:placed', ({ gx, gy }) => this.updateAround(gx, gy, 2));
    events.on('building:demolished', ({ gx, gy }) => this.updateAround(gx, gy, 2));
    events.on('zone:changed', ({ gx, gy }) => this.updateAround(gx, gy, 2));
    events.on('terrain:changed', ({ gx, gy }) => this.updateAround(gx, gy, 1));
    events.on('game:loaded', () => this.updateAll());
    events.on('graphics:quality:changed', ({ quality }) => this.setQuality(quality));
  }

  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    this.container.visible = quality !== 'low';
    this.updateAll();
  }

  private tileHash(gx: number, gy: number): number {
    let v = gx * 374761393 + gy * 668265263;
    v = (v ^ (v >>> 13)) * 1274126177;
    return Math.abs(v);
  }

  private buildSprites(): void {
    for (let gx = 0; gx < this.grid.size; gx++) {
      this.sprites[gx] = [];
      for (let gy = 0; gy < this.grid.size; gy++) {
        const pos = gridToWorld(gx, gy, 0);
        const sprite = new Sprite(this.textures.get('prop_none'));
        sprite.anchor.set(0.5, 1);
        sprite.x = pos.x;
        sprite.y = pos.y + TILE_HALF_H;
        sprite.zIndex = depthKey(gx, gy) + 1;
        sprite.visible = false;
        this.sprites[gx][gy] = sprite;
        this.container.addChild(sprite);
      }
    }

    this.updateAll();
  }

  private updateAround(gx: number, gy: number, radius: number): void {
    for (let x = gx - radius; x <= gx + radius; x++) {
      for (let y = gy - radius; y <= gy + radius; y++) {
        this.updateCell(x, y);
      }
    }
  }

  updateAll(): void {
    for (let gx = 0; gx < this.grid.size; gx++) {
      for (let gy = 0; gy < this.grid.size; gy++) {
        this.updateCell(gx, gy);
      }
    }
  }

  private updateCell(gx: number, gy: number): void {
    if (!this.grid.inBounds(gx, gy)) return;
    const sprite = this.sprites[gx]?.[gy];
    const cell = this.grid.getCell(gx, gy);
    if (!sprite || !cell) return;

    const propKey = this.pickPropForCell(gx, gy);
    sprite.texture = this.textures.get(propKey);

    if (propKey === 'prop_none') {
      sprite.visible = false;
      return;
    }

    const jitter = (this.tileHash(gx + 11, gy - 7) % 5) - 2;
    sprite.x = gridToWorld(gx, gy, 0).x + jitter * 0.8;
    sprite.y = gridToWorld(gx, gy, 0).y + TILE_HALF_H + ((this.tileHash(gx, gy) % 3) - 1) * 0.5;
    sprite.alpha = this.quality === 'high' ? 0.96 : 0.84;
    sprite.scale.set(this.quality === 'high' ? 1 : 0.94);
    sprite.visible = true;
  }

  private pickPropForCell(gx: number, gy: number): PropTextureKey {
    if (this.quality === 'low') return 'prop_none';

    const cell = this.grid.getCell(gx, gy);
    if (!cell) return 'prop_none';
    if (!this.grid.isBuildable(cell.terrain)) return 'prop_none';
    if (cell.building) return 'prop_none';

    const hash = this.tileHash(gx, gy);
    const roll = hash % 100;
    const density = this.quality === 'high' ? 1 : 0.66;

    let roadCount = 0;
    let industrialCount = 0;
    let residentialCount = 0;
    let civicCount = 0;

    for (let nx = gx - 1; nx <= gx + 1; nx++) {
      for (let ny = gy - 1; ny <= gy + 1; ny++) {
        if (nx === gx && ny === gy) continue;
        const building = this.grid.getMasterBuilding(nx, ny);
        if (!building) continue;
        const def = this.registry.get(building.defId);
        if (!def) continue;
        if (def.isRoad) roadCount++;
        if (def.category === 'industrial') industrialCount++;
        if (def.category === 'residential') residentialCount++;
        if (def.category === 'government' || def.id === 'metro_station') civicCount++;
      }
    }

    if (roadCount > 0 && (cell.zone === 'civic' || civicCount > 0)) {
      if (roll < 28 * density) return hash % 2 === 0 ? 'prop_bus_stop' : 'prop_kiosk';
    }

    if (cell.zone === 'industry' || industrialCount > 0) {
      if (roll < 36 * density) return hash % 2 === 0 ? 'prop_pole' : 'prop_fence';
    }

    if (cell.zone === 'housing' || residentialCount > 0) {
      if (roll < 30 * density) return hash % 3 === 0 ? 'prop_courtyard' : 'prop_fence';
    }

    if (cell.zone === 'green') {
      if (roll < 40 * density) return 'prop_courtyard';
    }

    if (roadCount > 0 && roll < 16 * density) return 'prop_lamp';
    if (roll < 7 * density) return 'prop_fence';

    return 'prop_none';
  }
}
