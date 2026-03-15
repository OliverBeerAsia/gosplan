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
    const era = this.state.currentEra;
    // Calculate housing capacity
    let totalCapacity = 0;
    const buildings = this.grid.getAllBuildings();

    for (const b of buildings) {
      const def = this.registry.get(b.defId);
      if (!def || !def.housingCapacity) continue;
      if (b.powered) {
        totalCapacity += def.housingCapacity;
      } else if (era === 1) {
        // Era 1 forgiveness: unpowered residential still gives 30% capacity
        totalCapacity += Math.floor(def.housingCapacity * 0.3);
      }
    }

    this.state.housingCapacity = totalCapacity;

    // Era 1: lower happiness threshold for growth (20 vs 30)
    const happinessThreshold = era === 1 ? 20 : HAPPINESS_THRESHOLD;

    // Population growth/decline
    if (totalCapacity > this.state.population && this.state.happiness >= happinessThreshold) {
      // Grow
      const availableSpace = totalCapacity - this.state.population;
      let growth = Math.max(1, Math.floor(
        Math.min(availableSpace, this.state.population * BASE_GROWTH_RATE + 5 + Math.floor(totalCapacity * 0.02))
      ));
      // Era 1: minimum growth of +3 when any housing is available
      if (era === 1 && totalCapacity > 0) {
        growth = Math.max(3, growth);
      }
      this.state.population += growth;
    } else if (this.state.population > totalCapacity) {
      // Shrink (people leave if overcrowded)
      const excess = this.state.population - totalCapacity;
      const decline = Math.max(1, Math.floor(excess * 0.1));
      this.state.population = Math.max(0, this.state.population - decline);
    } else if (this.state.happiness < happinessThreshold && this.state.population > 0) {
      // Unhappy people leave slowly
      const decline = Math.max(1, Math.floor(this.state.population * 0.005));
      this.state.population = Math.max(0, this.state.population - decline);
    }

    this.events.emit('population:changed', { population: this.state.population });
  }
}
