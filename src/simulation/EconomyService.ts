import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { ERA_INCOME_BASE, ERA_INCOME_PER_POP, ERA_MAINTENANCE_MULT } from '../constants';

export class EconomyService {
  private nextDeficitAlertTick = 0;

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
    const eraIdx = this.state.currentEra - 1;
    const maintenanceMult = ERA_MAINTENANCE_MULT[eraIdx] ?? 1.0;

    for (const b of buildings) {
      const def = this.registry.get(b.defId);
      if (!def) continue;

      // Unpowered buildings that require power pay 30% maintenance
      if (def.powerConsumption && !b.powered) {
        totalMaintenance += Math.floor(def.maintenance * 0.3 * maintenanceMult);
      } else {
        totalMaintenance += Math.floor(def.maintenance * maintenanceMult);
      }

      // Only produce if powered (or no power needed)
      if (def.industrialOutput && b.powered) {
        totalIndustrial += Math.round(def.industrialOutput * this.state.industrialEfficiency);
      }
    }

    // Central planning base allocation (scales with population, era-adjusted)
    const incomeBase = ERA_INCOME_BASE[eraIdx] ?? 500;
    const incomePerPop = ERA_INCOME_PER_POP[eraIdx] ?? 0.5;
    const baseAllocation = incomeBase + Math.floor(this.state.population * incomePerPop);
    const totalIncome = baseAllocation + totalIndustrial;

    this.state.industrialOutput = totalIndustrial;
    this.state.lastTickIncome = totalIncome;
    this.state.lastTickExpense = totalMaintenance;
    this.state.lastTickNet = totalIncome - totalMaintenance;
    this.state.budget += this.state.lastTickNet;

    // Clamp budget (can go negative = debt)
    this.events.emit('budget:changed', { budget: this.state.budget });

    if (this.state.budget >= 0) {
      this.nextDeficitAlertTick = 0;
      return;
    }

    if (this.state.totalTicks >= this.nextDeficitAlertTick) {
      this.events.emit('notification', {
        message: 'Comrade! The city treasury is in deficit!',
        type: 'warning'
      });
      this.nextDeficitAlertTick = this.state.totalTicks + 12;
    }
  }
}
