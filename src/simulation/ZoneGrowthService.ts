import { BuildingDef } from '../buildings/BuildingTypes';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { GameStateData } from '../core/GameState';
import { BuildingPlacer } from '../grid/BuildingPlacer';
import { Grid } from '../grid/Grid';
import { ZoneType } from '../grid/Cell';
import { nextGameRandom, nextGameRandomInt } from '../core/Rng';

const DEMAND_MIN = -100;
const DEMAND_MAX = 100;

function clampDemand(value: number): number {
  return Math.max(DEMAND_MIN, Math.min(DEMAND_MAX, Math.round(value)));
}

export class ZoneGrowthService {
  private growthTick = 0;

  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private placer: BuildingPlacer,
    private state: GameStateData,
    private events: EventBus
  ) {}

  tick(): void {
    this.updateDemandSignals();

    this.growthTick++;
    // Run growth every 4 in-game weeks.
    if (this.growthTick % 4 !== 0) return;

    this.tryGrowZone('housing', this.state.residentialDemand, 'residential', 0.35);
    this.tryGrowZone('industry', this.state.industrialDemand, 'industrial', 0.4);

    // Civic and green zones share the civic demand channel.
    this.tryGrowZone('civic', this.state.civicDemand, 'government', 0.3);
    this.tryGrowZone('green', this.state.civicDemand, 'decoration', 0.25);
  }

  private updateDemandSignals(): void {
    const housingGap = this.state.population - this.state.housingCapacity;
    const powerBalance = this.state.powerCapacity - this.state.powerDemand;
    const industryPressure = this.state.population / 120 - this.state.industrialOutput / 300;

    const residential = clampDemand(
      housingGap / 40 +
      (this.state.happiness - 50) * 0.8 +
      (powerBalance >= 0 ? 10 : -20)
    );

    const industrial = clampDemand(
      industryPressure * 20 +
      (this.state.budget < 0 ? 15 : 0) +
      (powerBalance >= 0 ? 6 : -12)
    );

    const civic = clampDemand(
      (55 - this.state.happiness) * 1.4 +
      this.state.population / 700 -
      10
    );

    if (
      residential !== this.state.residentialDemand ||
      industrial !== this.state.industrialDemand ||
      civic !== this.state.civicDemand
    ) {
      this.state.residentialDemand = residential;
      this.state.industrialDemand = industrial;
      this.state.civicDemand = civic;

      this.events.emit('demand:updated', {
        residential,
        industrial,
        civic,
      });
    }
  }

  private tryGrowZone(
    zone: ZoneType,
    demand: number,
    category: BuildingDef['category'],
    allocationRatio: number
  ): void {
    if (demand < 12) return;

    const candidates = this.collectCandidateCells(zone);
    if (candidates.length === 0) return;

    const attempts = demand >= 70 ? 3 : demand >= 40 ? 2 : 1;

    for (let i = 0; i < attempts; i++) {
      const cell = candidates[nextGameRandomInt(this.state, candidates.length)];
      if (!cell) continue;

      const chosen = this.pickBuildingForCell(category, zone, cell.gx, cell.gy, demand);
      if (!chosen) continue;

      const allocationCost = Math.max(10, Math.floor(chosen.cost * allocationRatio));
      if (this.state.budget < allocationCost) continue;

      const building = this.placer.place(chosen.id, cell.gx, cell.gy);
      if (!building) continue;

      this.state.budget -= allocationCost;
      this.events.emit('budget:changed', { budget: this.state.budget });

      if (nextGameRandom(this.state) < 0.2) {
        this.events.emit('notification', {
          message: `State construction bureau completed ${chosen.name}.`,
          type: 'info',
        });
      }
    }
  }

  private collectCandidateCells(zone: ZoneType): { gx: number; gy: number }[] {
    const out: { gx: number; gy: number }[] = [];

    for (let gx = 0; gx < this.grid.size; gx++) {
      for (let gy = 0; gy < this.grid.size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell || cell.zone !== zone || cell.building) continue;
        if (!this.grid.isBuildable(cell.terrain)) continue;
        out.push({ gx, gy });
      }
    }

    return out;
  }

  private pickBuildingForCell(
    category: BuildingDef['category'],
    zone: ZoneType,
    gx: number,
    gy: number,
    demand: number
  ): BuildingDef | null {
    const defs = this.registry.getAvailableByCategory(category, this.state.currentEra)
      .filter(def => this.isGrowthEligible(def, zone));

    const buildable = defs
      .filter(def => this.grid.canPlace(gx, gy, def.width, def.height))
      .filter(def => !this.requiresRoadAccess(def) || this.hasRoadAccess(gx, gy, def.width, def.height));

    if (buildable.length === 0) return null;

    const ranked = [...buildable].sort((a, b) => this.scoreBuilding(b, demand) - this.scoreBuilding(a, demand));
    const topN = Math.min(3, ranked.length);
    return ranked[nextGameRandomInt(this.state, topN)] ?? null;
  }

  private isGrowthEligible(def: BuildingDef, zone: ZoneType): boolean {
    if (def.isRoad || def.id === 'power_line') return false;

    if (zone === 'industry' && def.powerGeneration) return false;
    if (zone === 'green') {
      return Boolean(def.happinessBonus);
    }

    return true;
  }

  private requiresRoadAccess(def: BuildingDef): boolean {
    return !def.isRoad && !def.powerGeneration;
  }

  private hasRoadAccess(gx: number, gy: number, width: number, height: number): boolean {
    for (let x = gx - 1; x <= gx + width; x++) {
      for (let y = gy - 1; y <= gy + height; y++) {
        // Skip interior cells.
        if (x >= gx && x < gx + width && y >= gy && y < gy + height) continue;

        const neighbor = this.grid.getCell(x, y);
        if (!neighbor?.building) continue;

        const master = this.grid.getMasterBuilding(x, y);
        if (!master) continue;

        const def = this.registry.get(master.defId);
        if (def?.isRoad) return true;
      }
    }

    return false;
  }

  private scoreBuilding(def: BuildingDef, demand: number): number {
    const valueWeight = demand >= 70 ? 1.6 : demand >= 40 ? 1.2 : 1.0;

    const value =
      (def.housingCapacity ?? 0) * 1.1 +
      (def.industrialOutput ?? 0) * 0.4 +
      (def.happinessBonus ?? 0) * 20;

    const upkeepPenalty = def.maintenance * 0.6;
    const footprintPenalty = def.width * def.height * 8;

    return value * valueWeight - upkeepPenalty - footprintPenalty;
  }
}
