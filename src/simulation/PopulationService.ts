import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { BASE_GROWTH_RATE, HAPPINESS_THRESHOLD } from '../constants';

export class PopulationService {
  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private state: GameStateData,
    private events: EventBus
  ) {}

  tick(): void {
    // Calculate housing capacity
    let totalCapacity = 0;
    const buildings = this.grid.getAllBuildings();

    for (const b of buildings) {
      const def = this.registry.get(b.defId);
      if (!def || !def.housingCapacity) continue;
      // Only powered buildings provide housing
      if (b.powered) {
        totalCapacity += def.housingCapacity;
      }
    }

    this.state.housingCapacity = totalCapacity;

    // Population growth/decline
    if (totalCapacity > this.state.population && this.state.happiness >= HAPPINESS_THRESHOLD) {
      // Grow
      const availableSpace = totalCapacity - this.state.population;
      const growth = Math.max(1, Math.floor(
        Math.min(availableSpace, this.state.population * BASE_GROWTH_RATE + 5)
      ));
      this.state.population += growth;
    } else if (this.state.population > totalCapacity) {
      // Shrink (people leave if overcrowded)
      const excess = this.state.population - totalCapacity;
      const decline = Math.max(1, Math.floor(excess * 0.1));
      this.state.population = Math.max(0, this.state.population - decline);
    } else if (this.state.happiness < HAPPINESS_THRESHOLD && this.state.population > 0) {
      // Unhappy people leave slowly
      const decline = Math.max(1, Math.floor(this.state.population * 0.005));
      this.state.population = Math.max(0, this.state.population - decline);
    }

    this.events.emit('population:changed', { population: this.state.population });
  }
}
