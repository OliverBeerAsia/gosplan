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
    this.container.sortableChildren = true;

    events.on('building:placed', ({ building, gx, gy }) => {
      this.addBuildingSprite(building);
      this.refreshNetworkAround(gx, gy);
    });

    events.on('building:demolished', ({ building, gx, gy }) => {
      this.removeBuildingSprite(building.id);
      const def = this.registry.get(building.defId);
      if (def) {
        this.refreshNetworkAround(gx, gy, Math.max(def.width, def.height) + 1);
      } else {
        this.refreshNetworkAround(gx, gy);
      }
    });

    events.on('power:updated', () => this.refreshPowerStates());
  }

  rebuild(): void {
    for (const sprite of this.spriteMap.values()) {
      this.container.removeChild(sprite);
      sprite.destroy();
    }
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

    // Ensure network variants are up to date after all sprites exist.
    for (const building of buildings) {
      const def = this.registry.get(building.defId);
      if (!def) continue;
      if (def.id === 'road' || def.id === 'power_line') {
        this.refreshSingleBuildingTexture(building);
      }
    }
  }

  private addBuildingSprite(building: PlacedBuilding): void {
    // Replace any stale sprite for this id.
    this.removeBuildingSprite(building.id);

    const def = this.registry.get(building.defId);
    if (!def) return;

    const texKey = this.getTextureKey(building);
    if (!this.textures.has(texKey)) return;

    const sprite = new Sprite(this.textures.get(texKey));

    const centerGx = building.gx + def.width / 2;
    const centerGy = building.gy + def.height / 2;
    const pos = gridToWorld(centerGx, centerGy, 0);

    sprite.anchor.set(0.5, 1);
    sprite.x = pos.x;
    sprite.y = pos.y + TILE_HALF_H;
    sprite.zIndex = depthKey(building.gx + def.width - 1, building.gy + def.height - 1);

    this.spriteMap.set(building.id, sprite);
    this.container.addChild(sprite);
  }

  private removeBuildingSprite(buildingId: number): void {
    const sprite = this.spriteMap.get(buildingId);
    if (!sprite) return;

    this.container.removeChild(sprite);
    sprite.destroy();
    this.spriteMap.delete(buildingId);
  }

  private getTextureKey(building: PlacedBuilding): string {
    const def = this.registry.get(building.defId);
    if (!def) return building.defId;

    if (def.id === 'road') {
      return `road_${this.getConnectionMask(building.gx, building.gy, 'road')}`;
    }

    if (def.id === 'power_line') {
      return `power_line_${this.getConnectionMask(building.gx, building.gy, 'power_line')}`;
    }

    // Use unpowered variant for buildings that need power but don't have it.
    if (def.powerConsumption && !building.powered) {
      const unpoweredKey = `${building.defId}_unpowered`;
      if (this.textures.has(unpoweredKey)) {
        return unpoweredKey;
      }
    }

    return building.defId;
  }

  private getConnectionMask(gx: number, gy: number, defId: 'road' | 'power_line'): number {
    let mask = 0;

    const neighbors = [
      { bit: 1, x: gx, y: gy - 1 },
      { bit: 2, x: gx + 1, y: gy },
      { bit: 4, x: gx, y: gy + 1 },
      { bit: 8, x: gx - 1, y: gy },
    ];

    for (const n of neighbors) {
      const building = this.grid.getMasterBuilding(n.x, n.y);
      if (!building) continue;
      if (building.defId === defId) {
        mask |= n.bit;
      }
    }

    return mask;
  }

  private refreshNetworkAround(gx: number, gy: number, radius: number = 2): void {
    const seen = new Set<number>();

    for (let x = gx - radius; x <= gx + radius; x++) {
      for (let y = gy - radius; y <= gy + radius; y++) {
        const building = this.grid.getMasterBuilding(x, y);
        if (!building || seen.has(building.id)) continue;
        seen.add(building.id);

        const def = this.registry.get(building.defId);
        if (!def) continue;

        if (def.id === 'road' || def.id === 'power_line') {
          this.refreshSingleBuildingTexture(building);
        }
      }
    }
  }

  private refreshSingleBuildingTexture(building: PlacedBuilding): void {
    const sprite = this.spriteMap.get(building.id);
    if (!sprite) return;

    const texKey = this.getTextureKey(building);
    if (this.textures.has(texKey)) {
      sprite.texture = this.textures.get(texKey);
    }
  }

  private refreshPowerStates(): void {
    const buildings = this.grid.getAllBuildings();
    for (const building of buildings) {
      this.refreshSingleBuildingTexture(building);
    }
  }

  getBuildingSpriteAt(buildingId: number): Sprite | undefined {
    return this.spriteMap.get(buildingId);
  }
}
