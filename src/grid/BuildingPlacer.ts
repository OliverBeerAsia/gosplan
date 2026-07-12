import { Grid } from './Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { PlacedBuilding } from '../buildings/BuildingTypes';
import { EventBus } from '../core/EventBus';

let nextBuildingId = 1;

export interface RestoreBuildingOptions {
  id?: number;
  emitEvent?: boolean;
}

export class BuildingPlacer {
  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private events: EventBus
  ) {}

  canPlace(buildingId: string, gx: number, gy: number): boolean {
    return this.getStructuralPlacementRejection(buildingId, gx, gy) === null;
  }

  getPlacementRejection(buildingId: string, gx: number, gy: number, budget: number): string | null {
    const def = this.registry.get(buildingId);
    if (!def) return 'Unknown building';
    if (budget < def.cost) return 'Insufficient rubles';
    return this.getStructuralPlacementRejection(buildingId, gx, gy);
  }

  place(buildingId: string, gx: number, gy: number): PlacedBuilding | null {
    const def = this.registry.get(buildingId);
    if (!def) return null;
    if (this.getStructuralPlacementRejection(buildingId, gx, gy)) return null;

    const building: PlacedBuilding = {
      defId: buildingId,
      gx,
      gy,
      powered: false,
      id: nextBuildingId++,
    };

    this.grid.placeBuilding(building, def.width, def.height);
    this.events.emit('building:placed', { building, defId: buildingId, gx, gy });
    return building;
  }

  /**
   * Compatibility-safe restoration for saves and undo. This intentionally
   * permits legacy uneven footprints, but still rejects blocked/invalid land.
   */
  restore(
    buildingId: string,
    gx: number,
    gy: number,
    options: RestoreBuildingOptions = {}
  ): PlacedBuilding | null {
    const def = this.registry.get(buildingId);
    if (!def) return null;
    if (!this.grid.canRestoreFootprint(gx, gy, def.width, def.height)) return null;
    if (options.id !== undefined && this.grid.getBuildingById(options.id)) return null;

    const id = options.id ?? nextBuildingId++;
    const building: PlacedBuilding = {
      defId: buildingId,
      gx,
      gy,
      powered: false,
      id,
    };

    this.grid.placeBuilding(building, def.width, def.height);
    nextBuildingId = Math.max(nextBuildingId, id + 1);
    if (options.emitEvent !== false) {
      this.events.emit('building:placed', { building, defId: buildingId, gx, gy });
    }
    return building;
  }

  private getStructuralPlacementRejection(buildingId: string, gx: number, gy: number): string | null {
    const def = this.registry.get(buildingId);
    if (!def) return 'Unknown building';

    const footprintRejection = this.grid.getPlacementRejection(gx, gy, def.width, def.height);
    if (footprintRejection) return footprintRejection;

    if (def.isRoad) {
      return this.getNetworkElevationRejection('road', gx, gy);
    }
    if (def.id === 'power_line') {
      return this.getNetworkElevationRejection('power_line', gx, gy);
    }
    return null;
  }

  private getNetworkElevationRejection(
    networkId: 'road' | 'power_line',
    gx: number,
    gy: number
  ): string | null {
    const directions = networkId === 'power_line'
      ? [
          [-1, 0], [1, 0], [0, -1], [0, 1],
          [-1, -1], [-1, 1], [1, -1], [1, 1],
        ]
      : [[-1, 0], [1, 0], [0, -1], [0, 1]];

    let hasEqualElevationConnection = false;
    let hasUnequalElevationConnection = false;

    for (const [dx, dy] of directions) {
      const neighbor = this.grid.getMasterBuilding(gx + dx, gy + dy);
      if (!neighbor) continue;

      const isNetworkNeighbor = networkId === 'road'
        ? neighbor.defId === 'road'
        // Power traversal treats every adjacent building as a terminal edge.
        : true;
      if (!isNetworkNeighbor) continue;

      if (this.grid.canConnectAtEqualElevation(gx, gy, gx + dx, gy + dy)) {
        hasEqualElevationConnection = true;
      } else {
        hasUnequalElevationConnection = true;
      }
    }

    if (hasUnequalElevationConnection && !hasEqualElevationConnection) {
      return networkId === 'road'
        ? 'Roads require equal elevation (ramps unavailable)'
        : 'Power lines require equal elevation (ramps unavailable)';
    }
    return null;
  }

  demolish(gx: number, gy: number): boolean {
    const building = this.grid.removeBuilding(gx, gy);
    if (building) {
      this.events.emit('building:demolished', { building, gx: building.gx, gy: building.gy });
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
