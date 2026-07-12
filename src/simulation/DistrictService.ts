import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { DistrictSnapshot, DistrictStyle, GameStateData } from '../core/GameState';
import { Grid } from '../grid/Grid';

interface DistrictBounds {
  id: string;
  label: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class DistrictService {
  private tickCounter = 0;

  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private state: GameStateData,
    private events: EventBus
  ) {}

  tick(): void {
    this.tickCounter++;
    // Recompute districts every 4 ticks.
    if (this.tickCounter % 4 !== 0) return;

    const districts = this.computeDistricts();
    this.state.districtStats = districts;

    const loyaltyTarget = Math.round(districts.reduce((sum, d) => sum + d.loyalty, 0) / Math.max(1, districts.length));
    const unrestTarget = Math.round(districts.reduce((sum, d) => sum + d.unrestRisk, 0) / Math.max(1, districts.length));

    // Keep these metrics smooth to avoid UI flicker and sudden oscillation.
    this.state.cityLoyalty = Math.round(this.state.cityLoyalty * 0.75 + loyaltyTarget * 0.25);
    this.state.unrestLevel = Math.round(this.state.unrestLevel * 0.75 + unrestTarget * 0.25);
    this.state.cityLoyalty = clamp(this.state.cityLoyalty, 0, 100);
    this.state.unrestLevel = clamp(this.state.unrestLevel, 0, 100);

    this.events.emit('district:updated', {
      districts,
      cityLoyalty: this.state.cityLoyalty,
      unrestLevel: this.state.unrestLevel,
      commuteIndex: this.state.commuteIndex,
      serviceAccessIndex: this.state.serviceAccessIndex,
    });
  }

  private computeDistricts(): DistrictSnapshot[] {
    const half = Math.floor(this.grid.size / 2);
    const bounds: DistrictBounds[] = [
      { id: 'nw', label: 'Northern Rayon', x0: 0, x1: half, y0: 0, y1: half },
      { id: 'ne', label: 'Eastern Sector', x0: half, x1: this.grid.size, y0: 0, y1: half },
      { id: 'sw', label: 'Southern Blocks', x0: 0, x1: half, y0: half, y1: this.grid.size },
      { id: 'se', label: 'Western Precinct', x0: half, x1: this.grid.size, y0: half, y1: this.grid.size },
    ];

    const totalHousingCap = Math.max(1, this.state.housingCapacity);
    const districts: DistrictSnapshot[] = [];

    for (const b of bounds) {
      let buildableTiles = 0;
      let housingZoneTiles = 0;
      let industryZoneTiles = 0;
      let civicZoneTiles = 0;
      let greenZoneTiles = 0;
      let serviceTotal = 0;
      let roadTouches = 0;
      let metroPresence = 0;
      let localHousingCapacity = 0;
      let activity = 0;

      for (let gx = b.x0; gx < b.x1; gx++) {
        for (let gy = b.y0; gy < b.y1; gy++) {
          const cell = this.grid.getCell(gx, gy);
          if (!cell) continue;

          cell.districtId = b.id;

          if (cell.terrain === 'water' || cell.terrain === 'hill') continue;
          buildableTiles++;
          serviceTotal += cell.serviceCoverage;

          if (cell.zone === 'housing') housingZoneTiles++;
          if (cell.zone === 'industry') industryZoneTiles++;
          if (cell.zone === 'civic') civicZoneTiles++;
          if (cell.zone === 'green') greenZoneTiles++;

          if (this.hasAdjacentRoad(gx, gy)) roadTouches++;

          const building = this.grid.getMasterBuilding(gx, gy);
          if (building) {
            const def = this.registry.get(building.defId);
            if (def?.housingCapacity) {
              localHousingCapacity += def.housingCapacity;
            }
            if (def?.id === 'metro_station') {
              metroPresence++;
            }
          }
        }
      }

      const zoneTotal = Math.max(1, housingZoneTiles + industryZoneTiles + civicZoneTiles + greenZoneTiles);
      const serviceAccess = buildableTiles > 0 ? Math.round(serviceTotal / buildableTiles) : 0;
      const commute =
        Math.round(
          clamp(
            (roadTouches / Math.max(1, buildableTiles)) * 100 * 0.65 +
            (metroPresence > 0 ? 18 : 0) +
            serviceAccess * 0.25,
            0,
            100
          )
        );

      const localPopEstimate = Math.round(this.state.population * (localHousingCapacity / totalHousingCap));
      const occupancy = localHousingCapacity > 0 ? localPopEstimate / localHousingCapacity : 1.4;
      const housingStress = clamp(
        Math.round(
          occupancy * 58 +
          Math.max(0, this.state.residentialDemand) * 0.23 +
          Math.max(0, 45 - serviceAccess) * 0.2
        ),
        0,
        100
      );

      const style = this.selectStyle({
        housingRatio: housingZoneTiles / zoneTotal,
        industryRatio: industryZoneTiles / zoneTotal,
        civicRatio: civicZoneTiles / zoneTotal,
        greenRatio: greenZoneTiles / zoneTotal,
        serviceAccess,
      });

      const loyalty = clamp(
        Math.round(
          38 +
          this.state.happiness * 0.38 +
          serviceAccess * 0.2 +
          commute * 0.14 -
          housingStress * 0.3 -
          (this.state.budget < 0 ? 9 : 0)
        ),
        0,
        100
      );

      const unrestRisk = clamp(
        Math.round(
          100 - loyalty +
          Math.max(0, 45 - commute) * 0.42 +
          Math.max(0, this.state.civicDemand) * 0.24 +
          Math.max(0, housingStress - 55) * 0.28
        ),
        0,
        100
      );

      activity = clamp(Math.round((serviceAccess + commute + (100 - unrestRisk)) / 3), 0, 100);

      // Store derived district markers on cells for renderers/UI.
      for (let gx = b.x0; gx < b.x1; gx++) {
        for (let gy = b.y0; gy < b.y1; gy++) {
          const cell = this.grid.getCell(gx, gy);
          if (!cell) continue;
          cell.districtStyle = style;
          cell.activityLevel = activity;
          cell.unrestMarker = unrestRisk >= 65;
        }
      }

      districts.push({
        id: b.id,
        label: b.label,
        style,
        housingStress,
        serviceAccess,
        commute,
        loyalty,
        unrestRisk,
        activity,
      });
    }

    return districts;
  }

  private hasAdjacentRoad(gx: number, gy: number): boolean {
    const master = this.grid.getMasterBuilding(gx, gy);
    const accessElevation = master
      ? this.grid.getElevation(master.gx, master.gy)
      : this.grid.getElevation(gx, gy);
    const neighbors = [
      [gx, gy - 1],
      [gx + 1, gy],
      [gx, gy + 1],
      [gx - 1, gy],
    ];

    for (const [nx, ny] of neighbors) {
      const building = this.grid.getMasterBuilding(nx, ny);
      if (!building) continue;
      const def = this.registry.get(building.defId);
      if (def?.isRoad && this.grid.getElevation(nx, ny) === accessElevation) return true;
    }
    return false;
  }

  private selectStyle(input: {
    housingRatio: number;
    industryRatio: number;
    civicRatio: number;
    greenRatio: number;
    serviceAccess: number;
  }): DistrictStyle {
    if (input.industryRatio > 0.34) return 'heavy_industry';
    if (input.civicRatio + input.greenRatio > 0.33 && input.serviceAccess > 56) return 'scientific_city';
    if (input.greenRatio > 0.22 && input.civicRatio > 0.16) return 'historic_core';
    if (input.housingRatio >= input.industryRatio) return 'worker_housing';
    return 'heavy_industry';
  }
}
