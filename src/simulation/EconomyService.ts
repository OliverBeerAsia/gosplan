import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';

export class EconomyService {
  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private state: GameStateData,
    private events: EventBus
  ) {}

  tick(): void {
    const buildings = this.grid.getAllBuildings();
    let totalMaintenance = 0;
    let totalIndustrial = 0;

    for (const b of buildings) {
      const def = this.registry.get(b.defId);
      if (!def) continue;

      totalMaintenance += def.maintenance;

      // Only produce if powered (or no power needed)
      if (def.industrialOutput && b.powered) {
        totalIndustrial += def.industrialOutput;
      }
    }

    // Central planning base allocation (scales with population)
    const baseAllocation = 500 + Math.floor(this.state.population * 0.5);

    this.state.industrialOutput = totalIndustrial;
    this.state.budget += baseAllocation + totalIndustrial - totalMaintenance;

    // Clamp budget (can go negative = debt)
    this.events.emit('budget:changed', { budget: this.state.budget });

    if (this.state.budget < 0) {
      this.events.emit('notification', {
        message: 'Comrade! The city treasury is in deficit!',
        type: 'warning'
      });
    }
  }
}
