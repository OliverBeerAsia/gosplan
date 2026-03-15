import { GameStateData } from '../core/GameState';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';

interface AdvisorAdvice {
  priority: number;
  message: string;
}

export class AdvisorService {
  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private state: GameStateData
  ) {}

  /** Returns the single most important advice message, or null if city is healthy */
  getAdvice(): string | null {
    const advices: AdvisorAdvice[] = [];

    // Power deficit
    if (this.state.powerDemand > this.state.powerCapacity) {
      const deficit = this.state.powerDemand - this.state.powerCapacity;
      advices.push({
        priority: 100,
        message: `Power deficit detected: ${deficit}MW shortage. Build additional generation capacity, Comrade.`,
      });
    }

    // No buildings at all
    const buildings = this.grid.getAllBuildings();
    if (buildings.length === 0) {
      advices.push({
        priority: 95,
        message: 'The city awaits its first structure. Begin with a Coal Power Plant to electrify the revolution.',
      });
    }

    // No power at all
    if (buildings.length > 0 && this.state.powerCapacity === 0) {
      advices.push({
        priority: 90,
        message: 'No power generation detected. The people sit in darkness. Build a Coal Power Plant immediately.',
      });
    }

    // Low happiness
    if (this.state.happiness < 35 && this.state.population > 50) {
      advices.push({
        priority: 85,
        message: 'Citizens report dangerously low morale. Consider parks, services, or addressing power shortages.',
      });
    } else if (this.state.happiness < 50 && this.state.population > 100) {
      advices.push({
        priority: 60,
        message: 'Worker satisfaction is mediocre. Parks and civic services would improve conditions.',
      });
    }

    // Housing demand high
    if (this.state.residentialDemand > 40) {
      advices.push({
        priority: 75,
        message: 'Housing demand is HIGH. Paint more Housing Zones to accommodate the growing proletariat.',
      });
    }

    // Industrial demand
    if (this.state.industrialDemand > 40) {
      advices.push({
        priority: 70,
        message: 'Industrial output is insufficient. Paint Industry Zones to meet production quotas.',
      });
    }

    // Budget critically low
    if (this.state.budget < 1000 && this.state.lastTickNet < 0) {
      advices.push({
        priority: 80,
        message: 'Treasury approaching insolvency. Reduce expenditures or expand industrial output.',
      });
    }

    // High unrest
    if (this.state.unrestLevel > 60) {
      advices.push({
        priority: 78,
        message: 'Unrest levels are concerning. The Party recommends civic services and improved living conditions.',
      });
    }

    // === Positive feedback (lower priority, shows when things are going well) ===

    // Power well-balanced
    if (this.state.powerCapacity > 0 && this.state.powerDemand <= this.state.powerCapacity && this.state.powerCapacity - this.state.powerDemand < this.state.powerCapacity * 0.3) {
      advices.push({
        priority: 15,
        message: 'Your power grid is well-balanced. Excellent planning, Comrade.',
      });
    }

    // Housing meets demand
    if (this.state.housingCapacity > this.state.population && this.state.residentialDemand < 12 && this.state.population > 100) {
      advices.push({
        priority: 12,
        message: 'Housing meets demand. The people are content.',
      });
    }

    // Budget surplus growing
    if (this.state.budget > 20000 && this.state.lastTickNet > 200) {
      advices.push({
        priority: 10,
        message: 'Budget surplus growing. The Treasury commends your discipline.',
      });
    }

    // High happiness
    if (this.state.happiness >= 65 && this.state.population > 200) {
      advices.push({
        priority: 14,
        message: 'Citizens report high satisfaction. The socialist model succeeds!',
      });
    }

    // Default idle state
    if (advices.length === 0) {
      return 'All systems nominal. The Party approves.';
    }

    advices.sort((a, b) => b.priority - a.priority);
    return advices[0].message;
  }
}
