import { Container, Sprite } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { TextureFactory } from '../graphics/TextureFactory';
import { PlacedBuilding } from '../buildings/BuildingTypes';
import { gridToWorld, depthKey } from './IsometricRenderer';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { EventBus } from '../core/EventBus';

export class BuildingRenderer {
  readonly container: Container;
  private spriteMap: Map<number, Sprite> = new Map();

  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private textures: TextureFactory,
    private events: EventBus
  ) {
    this.container = new Container();

    events.on('building:placed', () => this.rebuild());
    events.on('building:demolished', () => this.rebuild());
  }

  rebuild(): void {
    // Clear
    this.container.removeChildren();
    this.spriteMap.clear();

    const buildings = this.grid.getAllBuildings();

    // Sort by depth (diagonal sweep: gx + gy ascending)
    buildings.sort((a, b) => {
      const da = depthKey(a.gx, a.gy);
      const db = depthKey(b.gx, b.gy);
      if (da !== db) return da - db;
      return a.gy - b.gy;
    });

    for (const building of buildings) {
      this.addBuildingSprite(building);
    }
  }

  private addBuildingSprite(building: PlacedBuilding): void {
    const def = this.registry.get(building.defId);
    if (!def) return;

    if (!this.textures.has(building.defId)) return;
    const texture = this.textures.get(building.defId);

    const sprite = new Sprite(texture);

    // Position: anchor at the front-most tile of the multi-tile footprint
    // For an NxM building at (gx,gy), the front-most visible point
    // is approximately at grid center of the footprint
    const centerGx = building.gx + def.width / 2;
    const centerGy = building.gy + def.height / 2;
    const pos = gridToWorld(centerGx, centerGy, 0);

    // Center the sprite texture horizontally on the footprint center
    sprite.anchor.set(0.5, 1);
    sprite.x = pos.x;
    sprite.y = pos.y + TILE_HALF_H;

    this.spriteMap.set(building.id, sprite);
    this.container.addChild(sprite);
  }

  getBuildingSpriteAt(buildingId: number): Sprite | undefined {
    return this.spriteMap.get(buildingId);
  }
}
