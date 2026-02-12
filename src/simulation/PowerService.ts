import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';

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

    // BFS flood-fill from power plants
    this.floodFillPower();

    this.events.emit('power:updated', {
      totalCapacity,
      totalDemand,
    });
  }

  private floodFillPower(): void {
    const size = this.grid.size;
    const visited = new Set<string>();
    const queue: [number, number][] = [];

    // Find all power plants as BFS seeds
    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell || !cell.building || !cell.isMaster) continue;
        const def = this.registry.get(cell.building.defId);
        if (def?.powerGeneration) {
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
          cell.building.powered = true;
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

        const cell = this.grid.getCell(nx, ny);
        if (!cell || !cell.building) continue;

        visited.add(key);

        const def = this.registry.get(cell.building.defId);

        if (def) {
          const master = this.grid.getMasterBuilding(nx, ny);
          if (master) {
            master.powered = true;
          }
          // Only conductors (roads, power lines, power plants) propagate BFS further
          // Non-conductor buildings receive power but don't spread it
          if (def.conductsPower || def.powerGeneration) {
            queue.push([nx, ny]);
          }
        }
      }
    }
  }
}
