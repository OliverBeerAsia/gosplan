import { Grid } from './Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { PlacedBuilding } from '../buildings/BuildingTypes';
import { EventBus } from '../core/EventBus';

let nextBuildingId = 1;

export class BuildingPlacer {
  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private events: EventBus
  ) {}

  canPlace(buildingId: string, gx: number, gy: number): boolean {
    const def = this.registry.get(buildingId);
    if (!def) return false;
    return this.grid.canPlace(gx, gy, def.width, def.height);
  }

  place(buildingId: string, gx: number, gy: number): PlacedBuilding | null {
    const def = this.registry.get(buildingId);
    if (!def) return null;
    if (!this.grid.canPlace(gx, gy, def.width, def.height)) return null;

    const building: PlacedBuilding = {
      defId: buildingId,
      gx,
      gy,
      powered: false,
      id: nextBuildingId++,
    };

    this.grid.placeBuilding(building, def.width, def.height);
    this.events.emit('building:placed', { buildingId, gx, gy });
    return building;
  }

  demolish(gx: number, gy: number): boolean {
    const building = this.grid.removeBuilding(gx, gy);
    if (building) {
      this.events.emit('building:demolished', { gx: building.gx, gy: building.gy });
      return true;
    }
    return false;
  }

  setNextId(id: number): void {
    nextBuildingId = id;
  }

  getNextId(): number {
    return nextBuildingId;
  }
}
