import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { Grid } from '../grid/Grid';

export class ServiceCoverageService {
  private averageCoverage = 0;

  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private events: EventBus
  ) {}

  tick(): void {
    const size = this.grid.size;

    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (cell) {
          cell.serviceCoverage = 0;
        }
      }
    }

    const buildings = this.grid.getAllBuildings();
    for (const building of buildings) {
      const def = this.registry.get(building.defId);
      if (!def?.serviceRadius) continue;

      // Unpowered services do not provide coverage.
      if (def.powerConsumption && !building.powered) continue;

      const radius = Math.max(1, def.serviceRadius);
      const centerGx = Math.floor(building.gx + def.width / 2);
      const centerGy = Math.floor(building.gy + def.height / 2);
      const baseStrength = Math.max(8, (def.happinessBonus ?? 4) * 5);

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const dist = Math.abs(dx) + Math.abs(dy);
          if (dist > radius) continue;

          const cell = this.grid.getCell(centerGx + dx, centerGy + dy);
          if (!cell) continue;

          // Water and steep hill tiles are effectively not serviceable ground.
          if (cell.terrain === 'water' || cell.terrain === 'hill') continue;

          const attenuation = 1 - dist / (radius + 1);
          const contribution = Math.max(1, Math.round(baseStrength * attenuation));
          cell.serviceCoverage = Math.min(100, cell.serviceCoverage + contribution);
        }
      }
    }

    this.averageCoverage = this.computeAverageCoverage();
    this.events.emit('service:updated', { average: this.averageCoverage });
  }

  getAverageCoverage(): number {
    return this.averageCoverage;
  }

  private computeAverageCoverage(): number {
    let total = 0;
    let count = 0;

    for (let gx = 0; gx < this.grid.size; gx++) {
      for (let gy = 0; gy < this.grid.size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell) continue;

        if (cell.terrain === 'water' || cell.terrain === 'hill') continue;

        total += cell.serviceCoverage;
        count++;
      }
    }

    if (count === 0) return 0;
    return Math.round(total / count);
  }
}
