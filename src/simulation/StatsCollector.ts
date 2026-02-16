import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';

export interface StatsSnapshot {
  tick: number;
  population: number;
  happiness: number;
  budget: number;
  powerCapacity: number;
  powerDemand: number;
}

const MAX_HISTORY = 200;
const SAMPLE_INTERVAL = 4; // every 4 weeks (~monthly)

export class StatsCollector {
  private tickCounter = 0;

  constructor(
    private state: GameStateData,
    private events: EventBus
  ) {}

  tick(): void {
    this.tickCounter++;
    if (this.tickCounter % SAMPLE_INTERVAL !== 0) return;

    if (!this.state.statsHistory) {
      this.state.statsHistory = [];
    }

    this.state.statsHistory.push({
      tick: this.state.totalTicks,
      population: this.state.population,
      happiness: Math.round(this.state.happiness),
      budget: this.state.budget,
      powerCapacity: this.state.powerCapacity,
      powerDemand: this.state.powerDemand,
    });

    // Circular buffer
    if (this.state.statsHistory.length > MAX_HISTORY) {
      this.state.statsHistory.shift();
    }
  }
}
