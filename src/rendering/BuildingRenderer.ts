import { Container, Sprite } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { TextureFactory } from '../graphics/TextureFactory';
import { PlacedBuilding } from '../buildings/BuildingTypes';
import { gridToWorld, depthKey } from './IsometricRenderer';
import { TILE_HALF_H, TILE_HALF_W } from '../constants';
import { EventBus } from '../core/EventBus';
import { GameStateData, GraphicsQuality } from '../core/GameState';
import { ZoneType } from '../grid/Cell';
import { computeQueuePressure, queueCountFromPressure } from '../simulation/QueuePressureModel';

type DistrictStyle = 'worker_housing' | 'heavy_industry' | 'scientific_city' | 'historic_core';

export class BuildingRenderer {
  readonly container: Container;
  private spriteMap: Map<number, Sprite> = new Map();
  private queueMap: Map<number, Sprite[]> = new Map();
  private quality: GraphicsQuality = 'high';
  private queueRefreshTick = 0;

  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private textures: TextureFactory,
    private events: EventBus,
    private state: GameStateData
  ) {
    this.container = new Container();
    this.container.sortableChildren = true;

    events.on('building:placed', ({ building, gx, gy }) => {
      this.addBuildingSprite(building);
      this.refreshNetworkAround(gx, gy);
    });

    events.on('building:demolished', ({ building, gx, gy }) => {
      this.removeBuildingSprite(building.id);
      const def = this.registry.get(building.defId);
      if (def) {
        this.refreshNetworkAround(gx, gy, Math.max(def.width, def.height) + 1);
      } else {
        this.refreshNetworkAround(gx, gy);
      }
    });

    events.on('power:updated', () => this.refreshPowerStates());
    events.on('service:updated', () => this.refreshBuildingLooksAndQueues());
    events.on('demand:updated', () => this.refreshBuildingLooksAndQueues());
    events.on('graphics:quality:changed', ({ quality }) => this.setQuality(quality));
    events.on('tick', () => {
      this.queueRefreshTick++;
      if (this.queueRefreshTick % 4 === 0) {
        this.refreshQueueStates();
      }
    });
  }

  rebuild(): void {
    for (const sprite of this.spriteMap.values()) {
      this.container.removeChild(sprite);
      sprite.destroy();
    }
    this.spriteMap.clear();

    for (const queueSprites of this.queueMap.values()) {
      for (const queue of queueSprites) {
        this.container.removeChild(queue);
        queue.destroy();
      }
    }
    this.queueMap.clear();

    const buildings = this.grid.getAllBuildings();

    // Sort by depth (diagonal sweep: gx + gy ascending)
    buildings.sort((a, b) => {
      const da = depthKey(a.gx, a.gy);
      const db = depthKey(b.gx, b.gy);
      if (da !== db) return da - db;
      return a.gy - b.gy;
    });

    for (const building of buildings) {
      this.addBuildingSprite(building);
    }

    // Ensure network variants are up to date after all sprites exist.
    for (const building of buildings) {
      const def = this.registry.get(building.defId);
      if (!def) continue;
      if (def.id === 'road' || def.id === 'power_line') {
        this.refreshSingleBuildingTexture(building);
      }
    }

    this.refreshBuildingLooksAndQueues();
  }

  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    this.refreshBuildingLooksAndQueues();
  }

  private tileHash(seed: number): number {
    let v = seed * 1103515245 + 12345;
    v = (v ^ (v >>> 13)) * 1274126177;
    return Math.abs(v);
  }

  private addBuildingSprite(building: PlacedBuilding): void {
    this.removeBuildingSprite(building.id);

    const def = this.registry.get(building.defId);
    if (!def) return;

    const texKey = this.getTextureKey(building);
    if (!this.textures.has(texKey)) return;

    const sprite = new Sprite(this.textures.get(texKey));

    const centerGx = building.gx + def.width / 2;
    const centerGy = building.gy + def.height / 2;
    const pos = gridToWorld(centerGx, centerGy, 0);

    sprite.anchor.set(0.5, 1);
    sprite.x = pos.x;
    sprite.y = pos.y + TILE_HALF_H;
    sprite.zIndex = depthKey(building.gx + def.width - 1, building.gy + def.height - 1);

    this.spriteMap.set(building.id, sprite);
    this.container.addChild(sprite);
    this.applySpriteLook(building, sprite);
    this.refreshQueueForBuilding(building);
  }

  private removeBuildingSprite(buildingId: number): void {
    const sprite = this.spriteMap.get(buildingId);
    if (sprite) {
      this.container.removeChild(sprite);
      sprite.destroy();
      this.spriteMap.delete(buildingId);
    }
    this.clearQueueForBuilding(buildingId);
  }

  private clearQueueForBuilding(buildingId: number): void {
    const queueSprites = this.queueMap.get(buildingId);
    if (!queueSprites) return;
    for (const sprite of queueSprites) {
      this.container.removeChild(sprite);
      sprite.destroy();
    }
    this.queueMap.delete(buildingId);
  }

  private getTextureKey(building: PlacedBuilding): string {
    const def = this.registry.get(building.defId);
    if (!def) return building.defId;

    if (def.id === 'road') {
      return `road_${this.getConnectionMask(building.gx, building.gy, 'road')}`;
    }

    if (def.id === 'power_line') {
      return `power_line_${this.getConnectionMask(building.gx, building.gy, 'power_line')}`;
    }

    const baseKey = this.resolveVariantKey(building);

    if (def.powerConsumption && !building.powered) {
      const unpoweredVariant = `${baseKey}_unpowered`;
      if (this.textures.has(unpoweredVariant)) return unpoweredVariant;

      const fallbackUnpowered = `${building.defId}_unpowered`;
      if (this.textures.has(fallbackUnpowered)) return fallbackUnpowered;
    }

    return baseKey;
  }

  private resolveVariantKey(building: PlacedBuilding): string {
    const variant = this.tileHash(building.id) % 3;
    let base = building.defId;
    if (variant === 1 && this.textures.has(`${building.defId}_var1`)) base = `${building.defId}_var1`;
    if (variant === 2 && this.textures.has(`${building.defId}_var2`)) base = `${building.defId}_var2`;

    if (this.quality !== 'low') {
      const style = this.resolveDistrictStyle(building);
      const districtKey = `${base}_district_${style}`;
      if (this.textures.has(districtKey)) {
        base = districtKey;
      }
    }

    return base;
  }

  private resolveDistrictStyle(building: PlacedBuilding): DistrictStyle {
    const def = this.registry.get(building.defId);
    if (!def) return 'worker_housing';

    const zoneStats = this.collectZoneInfluence(building, 2);
    const localCoverage = this.getBuildingCoverage(building.id);

    const industrialPressure = zoneStats.industry + (def.category === 'industrial' ? 2 : 0);
    const civicPressure = zoneStats.civic + zoneStats.green + (def.category === 'government' ? 1 : 0);
    const housingPressure = zoneStats.housing + (def.category === 'residential' ? 1 : 0);

    if (def.category === 'industrial' || industrialPressure >= 3) return 'heavy_industry';
    if ((def.category === 'government' || def.id === 'metro_station') && localCoverage >= 55) {
      return 'scientific_city';
    }
    if (def.category === 'decoration' || civicPressure >= 4) return 'historic_core';
    if (housingPressure >= industrialPressure && housingPressure >= civicPressure) return 'worker_housing';

    if (localCoverage >= 70) return 'scientific_city';
    if (industrialPressure > housingPressure) return 'heavy_industry';
    return 'worker_housing';
  }

  private collectZoneInfluence(
    building: PlacedBuilding,
    radius: number
  ): Record<Exclude<ZoneType, 'none'>, number> {
    const stats = {
      housing: 0,
      industry: 0,
      civic: 0,
      green: 0,
    };

    const def = this.registry.get(building.defId);
    const width = def?.width ?? 1;
    const height = def?.height ?? 1;

    for (let gx = building.gx - radius; gx < building.gx + width + radius; gx++) {
      for (let gy = building.gy - radius; gy < building.gy + height + radius; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell || cell.zone === 'none') continue;
        stats[cell.zone]++;
      }
    }

    return stats;
  }

  private getConnectionMask(gx: number, gy: number, defId: 'road' | 'power_line'): number {
    let mask = 0;
    const neighbors = [
      { bit: 1, x: gx, y: gy - 1 },
      { bit: 2, x: gx + 1, y: gy },
      { bit: 4, x: gx, y: gy + 1 },
      { bit: 8, x: gx - 1, y: gy },
    ];

    for (const n of neighbors) {
      const building = this.grid.getMasterBuilding(n.x, n.y);
      if (!building) continue;
      if (building.defId === defId) {
        mask |= n.bit;
      }
    }

    return mask;
  }

  private refreshNetworkAround(gx: number, gy: number, radius: number = 2): void {
    const seen = new Set<number>();

    for (let x = gx - radius; x <= gx + radius; x++) {
      for (let y = gy - radius; y <= gy + radius; y++) {
        const building = this.grid.getMasterBuilding(x, y);
        if (!building || seen.has(building.id)) continue;
        seen.add(building.id);

        const def = this.registry.get(building.defId);
        if (!def) continue;
        if (def.id === 'road' || def.id === 'power_line') {
          this.refreshSingleBuildingTexture(building);
        }
      }
    }
  }

  private refreshSingleBuildingTexture(building: PlacedBuilding): void {
    const sprite = this.spriteMap.get(building.id);
    if (!sprite) return;

    const texKey = this.getTextureKey(building);
    if (this.textures.has(texKey)) {
      sprite.texture = this.textures.get(texKey);
    }
    this.applySpriteLook(building, sprite);
    this.refreshQueueForBuilding(building);
  }

  private refreshPowerStates(): void {
    const buildings = this.grid.getAllBuildings();
    for (const building of buildings) {
      this.refreshSingleBuildingTexture(building);
    }
  }

  private refreshBuildingLooksAndQueues(): void {
    const buildings = this.grid.getAllBuildings();
    for (const building of buildings) {
      this.refreshSingleBuildingTexture(building);
    }
  }

  private refreshQueueStates(): void {
    const buildings = this.grid.getAllBuildings();
    for (const building of buildings) {
      this.refreshQueueForBuilding(building);
    }
  }

  private applySpriteLook(building: PlacedBuilding, sprite: Sprite): void {
    const def = this.registry.get(building.defId);
    if (!def) return;

    let tint = 0xFFFFFF;
    const coverage = this.getBuildingCoverage(building.id);

    if (def.powerConsumption && !building.powered) {
      tint = 0x7A7684;
    } else if (def.category === 'residential' || def.category === 'government') {
      if (coverage < 20) {
        tint = 0xC9B596;
      } else if (coverage > 70) {
        tint = 0xE4F0D8;
      }
    } else if (def.category === 'industrial' && coverage < 18) {
      tint = 0xBAAE99;
    }

    const variance = this.quality === 'low'
      ? 0
      : (this.tileHash(building.id * 31) % 15) - 7;
    sprite.tint = this.offsetTint(tint, variance, Math.floor(variance * 0.5), -Math.floor(variance * 0.3));
    sprite.alpha = this.quality === 'low' ? 0.98 : 1;
  }

  private getBuildingCoverage(buildingId: number): number {
    const footprint = this.grid.getBuildingFootprint(buildingId);
    if (!footprint) return 0;

    let total = 0;
    let count = 0;
    for (let dx = 0; dx < footprint.width; dx++) {
      for (let dy = 0; dy < footprint.height; dy++) {
        const cell = this.grid.getCell(footprint.gx + dx, footprint.gy + dy);
        if (!cell) continue;
        total += cell.serviceCoverage;
        count++;
      }
    }

    if (count === 0) return 0;
    return total / count;
  }

  private refreshQueueForBuilding(building: PlacedBuilding): void {
    this.clearQueueForBuilding(building.id);
    if (this.quality === 'low') return;
    if (!this.textures.has('queue_citizen')) return;

    const def = this.registry.get(building.defId);
    if (!def) return;

    const queueCount = this.computeQueueCount(building, def.category);
    if (queueCount <= 0) return;

    const centerGx = building.gx + def.width / 2;
    const centerGy = building.gy + def.height / 2;
    const pos = gridToWorld(centerGx, centerGy, 0);

    const baseX = pos.x - TILE_HALF_W * 0.55;
    const baseY = pos.y + TILE_HALF_H - 4;
    const sprites: Sprite[] = [];

    for (let i = 0; i < queueCount; i++) {
      const sprite = new Sprite(this.textures.get('queue_citizen'));
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(this.quality === 'high' ? 1 : 0.92);
      sprite.alpha = 0.78 + (i % 2) * 0.1;

      const jitter = (this.tileHash(building.id * 89 + i * 17) % 5) - 2;
      sprite.x = baseX + i * 6 + jitter * 0.35;
      sprite.y = baseY + i * 3 + (i % 2);
      sprite.zIndex = depthKey(building.gx + def.width, building.gy + def.height) + 1;

      this.container.addChild(sprite);
      sprites.push(sprite);
    }

    this.queueMap.set(building.id, sprites);
  }

  private computeQueueCount(building: PlacedBuilding, category: string): number {
    const def = this.registry.get(building.defId);
    if (!def) return 0;

    const queueEligible = category === 'government' || def.id === 'metro_station';
    if (!queueEligible) return 0;

    const localCoverage = this.getBuildingCoverage(building.id);
    const pressure = computeQueuePressure({
      eligible: queueEligible,
      civicDemand: this.state.civicDemand,
      residentialDemand: this.state.residentialDemand,
      localCoverage,
      budget: this.state.budget,
      powered: !def.powerConsumption || building.powered,
    });

    return queueCountFromPressure(pressure, this.quality);
  }

  private offsetTint(color: number, dr: number, dg: number, db: number): number {
    const r = Math.max(0, Math.min(255, ((color >> 16) & 0xFF) + dr));
    const g = Math.max(0, Math.min(255, ((color >> 8) & 0xFF) + dg));
    const b = Math.max(0, Math.min(255, (color & 0xFF) + db));
    return (r << 16) | (g << 8) | b;
  }

  getBuildingSpriteAt(buildingId: number): Sprite | undefined {
    return this.spriteMap.get(buildingId);
  }
}
