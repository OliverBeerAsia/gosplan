import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EconomyService } from './EconomyService';
import { PopulationService } from './PopulationService';
import { PowerService } from './PowerService';
import { FiveYearPlanService } from './FiveYearPlan';
import {
  BASE_TICK_MS, TICKS_PER_YEAR, BASE_HAPPINESS,
  PARK_BONUS, SERVICE_BONUS, MONUMENT_BONUS,
  NO_POWER_PENALTY, OVERCROWDING_PENALTY
} from '../constants';

export class SimulationManager {
  private economy: EconomyService;
  private population: PopulationService;
  private power: PowerService;
  private fiveYearPlan: FiveYearPlanService;
  private accumulator = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private state: GameStateData,
    private events: EventBus
  ) {
    this.economy = new EconomyService(grid, registry, state, events);
    this.population = new PopulationService(grid, registry, state, events);
    this.power = new PowerService(grid, registry, state, events);
    this.fiveYearPlan = new FiveYearPlanService(grid, registry, state, events);

    events.on('speed:changed', ({ speed }) => {
      this.state.speed = speed;
    });
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
  }

  stop(): void {
    this.running = false;
  }

  update(currentTime: number): void {
    if (!this.running || this.state.speed === 0) {
      this.lastTime = currentTime;
      return;
    }

    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const tickInterval = BASE_TICK_MS / this.state.speed;
    this.accumulator += delta;

    while (this.accumulator >= tickInterval) {
      this.accumulator -= tickInterval;
      this.tick();
    }
  }

  private tick(): void {
    this.state.totalTicks++;
    this.state.week++;
    if (this.state.week > TICKS_PER_YEAR) {
      this.state.week = 1;
      this.state.year++;
    }

    // Update in order: power -> happiness -> economy -> population -> plan
    this.power.tick();
    this.updateHappiness();
    this.economy.tick();
    this.population.tick();
    this.fiveYearPlan.tick();

    this.events.emit('tick', { week: this.state.week, year: this.state.year });
  }

  private updateHappiness(): void {
    let happiness = BASE_HAPPINESS;
    const buildings = this.grid.getAllBuildings();

    let totalPowered = 0;
    let totalNeedPower = 0;
    let serviceCount = 0;
    let parkCount = 0;
    let monumentCount = 0;

    for (const b of buildings) {
      const def = this.registry.get(b.defId);
      if (!def) continue;

      if (def.powerConsumption) {
        totalNeedPower++;
        if (b.powered) totalPowered++;
      }

      if (b.powered || !def.powerConsumption) {
        if (def.id === 'park') parkCount++;
        if (def.id === 'monument') monumentCount++;
        if (def.id === 'hospital' || def.id === 'school') serviceCount++;
        if (def.id === 'party_hq') serviceCount += 2;
      }
    }

    // Power penalty
    if (totalNeedPower > 0) {
      const powerRatio = totalPowered / totalNeedPower;
      if (powerRatio < 0.5) {
        happiness += NO_POWER_PENALTY;
      } else if (powerRatio < 1.0) {
        happiness += Math.floor(NO_POWER_PENALTY * (1 - powerRatio));
      }
    }

    // Overcrowding penalty
    if (this.state.housingCapacity > 0) {
      const occupancyRatio = this.state.population / this.state.housingCapacity;
      if (occupancyRatio > 1.2) {
        happiness += OVERCROWDING_PENALTY;
      } else if (occupancyRatio > 1.0) {
        happiness += Math.floor(OVERCROWDING_PENALTY * (occupancyRatio - 1) / 0.2);
      }
    }

    // Bonuses
    happiness += Math.min(parkCount * PARK_BONUS, 25);
    happiness += Math.min(serviceCount * SERVICE_BONUS, 30);
    happiness += Math.min(monumentCount * MONUMENT_BONUS, 15);

    this.state.happiness = Math.max(0, Math.min(100, happiness));
    this.events.emit('happiness:changed', { happiness: this.state.happiness });
  }
}
