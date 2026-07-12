import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import type { BuildingCategory } from '../buildings/BuildingTypes';

export function canTraversePowerEdge(
  grid: Grid,
  fromGx: number,
  fromGy: number,
  toGx: number,
  toGy: number
): boolean {
  const adjacent = Math.max(Math.abs(fromGx - toGx), Math.abs(fromGy - toGy)) === 1;
  return adjacent && grid.canConnectAtEqualElevation(fromGx, fromGy, toGx, toGy);
}

export class PowerService {
  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private state: GameStateData,
    private events: EventBus
  ) {}

  tick(): void {
    const buildings = this.grid.getAllBuildings();

    // Calculate total capacity and demand
    let totalCapacity = 0;
    let totalDemand = 0;

    for (const b of buildings) {
      const def = this.registry.get(b.defId);
      if (!def) continue;
      if (def.powerGeneration) totalCapacity += def.powerGeneration;
      if (def.powerConsumption) totalDemand += def.powerConsumption;
    }

    this.state.powerCapacity = totalCapacity;
    this.state.powerDemand = totalDemand;

    // Reset all power states
    for (const b of buildings) {
      b.powered = false;
    }

    // 1) Find all buildings connected to at least one generation source.
    const reachable = this.discoverReachableBuildings();

    // 2) Allocate finite capacity in deterministic priority order.
    this.allocatePower(reachable, totalCapacity);

    this.events.emit('power:updated', {
      totalCapacity,
      totalDemand,
    });
  }

  private discoverReachableBuildings(): Set<number> {
    const size = this.grid.size;
    const visited = new Set<string>();
    const queue: [number, number][] = [];
    const reachable = new Set<number>();

    // Find all power plants as BFS seeds
    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell || !cell.building || !cell.isMaster) continue;
        const def = this.registry.get(cell.building.defId);
        if (def?.powerGeneration) {
          reachable.add(cell.building.id);
          // Add all tiles of the power plant to the queue
          for (let dx = 0; dx < def.width; dx++) {
            for (let dy = 0; dy < def.height; dy++) {
              const key = `${gx + dx},${gy + dy}`;
              if (!visited.has(key)) {
                visited.add(key);
                queue.push([gx + dx, gy + dy]);
              }
            }
          }
        }
      }
    }

    // BFS through connected buildings/infrastructure
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1], // diagonals too for connectivity
    ];

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;

      for (const [dx, dy] of directions) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = `${nx},${ny}`;

        if (visited.has(key)) continue;
        if (!this.grid.inBounds(nx, ny)) continue;
        if (!canTraversePowerEdge(this.grid, cx, cy, nx, ny)) continue;

        const cell = this.grid.getCell(nx, ny);
        if (!cell || !cell.building) continue;

        visited.add(key);

        const master = this.grid.getMasterBuilding(nx, ny);
        if (!master) continue;

        reachable.add(master.id);
        const def = this.registry.get(master.defId);
        if (def?.conductsPower || def?.powerGeneration) {
          queue.push([nx, ny]);
        }
      }
    }

    return reachable;
  }

  private allocatePower(reachable: Set<number>, totalCapacity: number): void {
    let remainingCapacity = totalCapacity;
    const consumers: Array<{
      id: number;
      priority: number;
      demand: number;
    }> = [];

    for (const building of this.grid.getAllBuildings()) {
      if (!reachable.has(building.id)) continue;

      const def = this.registry.get(building.defId);
      if (!def) continue;

      if (def.powerGeneration) {
        building.powered = true;
        continue;
      }

      if (!def.powerConsumption) {
        building.powered = true;
        continue;
      }

      consumers.push({
        id: building.id,
        priority: this.getPriority(def.category),
        demand: def.powerConsumption,
      });
    }

    consumers.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.demand !== b.demand) return a.demand - b.demand;
      return a.id - b.id;
    });

    for (const consumer of consumers) {
      const building = this.grid.getBuildingById(consumer.id);
      if (!building) continue;
      if (remainingCapacity >= consumer.demand) {
        building.powered = true;
        remainingCapacity -= consumer.demand;
      }
    }
  }

  private getPriority(category: BuildingCategory): number {
    if (category === 'government') return 0;
    if (category === 'residential') return 1;
    if (category === 'infrastructure') return 2;
    if (category === 'industrial') return 3;
    return 4;
  }
}
