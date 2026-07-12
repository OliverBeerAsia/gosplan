import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { GameStateData } from '../core/GameState';
import { Grid } from '../grid/Grid';

export function hasRoadNearbyAtEqualElevation(
  grid: Grid,
  gx: number,
  gy: number,
  roads: Set<string>,
  radius: number
): boolean {
  const targetElevation = grid.getElevation(gx, gy);
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;
      const roadGx = gx + dx;
      const roadGy = gy + dy;
      if (!roads.has(`${roadGx},${roadGy}`)) continue;
      if (grid.getElevation(roadGx, roadGy) === targetElevation) return true;
    }
  }
  return false;
}

export class CommuteService {
  private tickCounter = 0;

  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private state: GameStateData,
    private events: EventBus
  ) {}

  tick(): void {
    this.tickCounter++;
    // Recompute every two simulation ticks to avoid unnecessary churn.
    if (this.tickCounter % 2 !== 0) return;

    const commute = this.computeCommuteIndex();
    const service = this.computeServiceAccessIndex();

    const smoothedCommute = this.smooth(this.state.commuteIndex, commute, 0.3);
    const smoothedService = this.smooth(this.state.serviceAccessIndex, service, 0.3);

    this.state.commuteIndex = smoothedCommute;
    this.state.serviceAccessIndex = smoothedService;

    this.events.emit('commute:updated', {
      commute: this.state.commuteIndex,
      serviceAccess: this.state.serviceAccessIndex,
    });
  }

  private computeCommuteIndex(): number {
    const roads = new Set<string>();
    const metros: { gx: number; gy: number; width: number; height: number }[] = [];

    const buildings = this.grid.getAllBuildings();
    for (const building of buildings) {
      const def = this.registry.get(building.defId);
      if (!def) continue;
      if (def.isRoad) {
        roads.add(`${building.gx},${building.gy}`);
      } else if (def.id === 'metro_station') {
        metros.push({ gx: building.gx, gy: building.gy, width: def.width, height: def.height });
      }
    }

    let total = 0;
    let count = 0;
    for (let gx = 0; gx < this.grid.size; gx++) {
      for (let gy = 0; gy < this.grid.size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell) continue;
        if (cell.terrain === 'water' || cell.terrain === 'hill') continue;

        const activeTile =
          cell.zone === 'housing' ||
          cell.zone === 'industry' ||
          cell.zone === 'civic' ||
          !!cell.building;
        if (!activeTile) continue;

        const accessGx = cell.building?.gx ?? gx;
        const accessGy = cell.building?.gy ?? gy;
        let score = 22;
        if (hasRoadNearbyAtEqualElevation(this.grid, accessGx, accessGy, roads, 2)) score += 38;
        if (hasRoadNearbyAtEqualElevation(this.grid, accessGx, accessGy, roads, 1)) score += 10;
        if (this.hasMetroNearby(gx, gy, metros, 7)) score += 20;
        score += Math.round(cell.serviceCoverage * 0.13);

        total += Math.max(0, Math.min(100, score));
        count++;
      }
    }

    if (count === 0) return 40;
    return Math.round(total / count);
  }

  private computeServiceAccessIndex(): number {
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

  private hasMetroNearby(
    gx: number,
    gy: number,
    metros: { gx: number; gy: number; width: number; height: number }[],
    radius: number
  ): boolean {
    for (const metro of metros) {
      const cx = metro.gx + metro.width / 2;
      const cy = metro.gy + metro.height / 2;
      const dist = Math.abs(gx - cx) + Math.abs(gy - cy);
      if (dist <= radius) return true;
    }
    return false;
  }

  private smooth(previous: number, next: number, alpha: number): number {
    return Math.round(previous * (1 - alpha) + next * alpha);
  }
}
