import { Container, Sprite, Text, TextStyle } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { AuthoredBuildingTexture, TextureFactory } from '../graphics/TextureFactory';
import { ArtEra, ArtLod } from '../graphics/ArtManifest';
import { resolveArtLodForZoom } from '../graphics/ArtVariantResolver';
import { PlacedBuilding } from '../buildings/BuildingTypes';
import { gridToWorld } from './IsometricRenderer';
import {
  footprintDepth,
  tileDepth,
  WorldDepthPhase,
  type WorldDepthLayer,
} from './WorldDepth';
import { TILE_HALF_H, TILE_HALF_W } from '../constants';
import { EventBus } from '../core/EventBus';
import { GameStateData, GraphicsQuality } from '../core/GameState';
import { ZoneType } from '../grid/Cell';
import { computeQueuePressure, queueCountFromPressure } from '../simulation/QueuePressureModel';

type DistrictStyle = 'worker_housing' | 'heavy_industry' | 'scientific_city' | 'historic_core';

interface ConstructionTween {
  sprite: Sprite;
  elapsed: number;
  duration: number;
}

export function computeNetworkConnectionMask(
  grid: Grid,
  gx: number,
  gy: number,
  defId: 'road' | 'power_line'
): number {
  let mask = 0;
  const neighbors = [
    { bit: 1, x: gx, y: gy - 1 },
    { bit: 2, x: gx + 1, y: gy },
    { bit: 4, x: gx, y: gy + 1 },
    { bit: 8, x: gx - 1, y: gy },
  ];

  for (const neighbor of neighbors) {
    const building = grid.getMasterBuilding(neighbor.x, neighbor.y);
    if (!building || building.defId !== defId) continue;
    if (!grid.canConnectAtEqualElevation(gx, gy, neighbor.x, neighbor.y)) continue;
    mask |= neighbor.bit;
  }

  return mask;
}

/** Building families that sit flush with the ground and cast no shadow. */
const NO_SHADOW_IDS = new Set(['road', 'power_line', 'park', 'plaza']);

export class BuildingRenderer {
  readonly container: Container;
  private spriteMap: Map<number, Sprite> = new Map();
  private shadowMap: Map<number, Sprite> = new Map();
  private authoredSpriteIds: Set<number> = new Set();
  /**
   * The exact authored frame and variant currently shown for each building.
   * Effect renderers consume this instead of independently re-running visual
   * selection and risking a different mass, district, or LOD.
   */
  private authoredVisualMap: Map<number, AuthoredBuildingTexture> = new Map();
  private queueMap: Map<number, { sprite: Sprite; baseY: number }[]> = new Map();
  private unpoweredIconMap: Map<number, Text> = new Map();
  private constructionTweens: ConstructionTween[] = [];
  private quality: GraphicsQuality = 'high';
  private artLod: ArtLod = 'near';
  private queueRefreshTick = 0;

  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private textures: TextureFactory,
    private events: EventBus,
    private state: GameStateData,
    private worldDepth: WorldDepthLayer
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
    events.on('camera:moved', ({ zoom }) => this.setArtLod(resolveArtLodForZoom(zoom, this.artLod)));
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
    for (const shadow of this.shadowMap.values()) {
      this.container.removeChild(shadow);
      shadow.destroy();
    }
    this.shadowMap.clear();
    this.authoredSpriteIds.clear();
    this.authoredVisualMap.clear();

    for (const queueSprites of this.queueMap.values()) {
      for (const q of queueSprites) {
        this.container.removeChild(q.sprite);
        q.sprite.destroy();
      }
    }
    this.queueMap.clear();

    for (const icon of this.unpoweredIconMap.values()) {
      this.container.removeChild(icon);
      icon.destroy();
    }
    this.unpoweredIconMap.clear();

    const buildings = this.grid.getAllBuildings();

    // Sort by each footprint's visible baseline. Building id is the stable tie
    // breaker so load order cannot change overlap results.
    buildings.sort((a, b) => {
      const da = this.getBuildingDepth(a);
      const db = this.getBuildingDepth(b);
      if (da !== db) return da - db;
      return a.id - b.id;
    });

    for (const building of buildings) {
      this.addBuildingSprite(building, false);
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

  /** Runtime hook for camera/QA tooling. LOD is visual-only and never saved. */
  setArtLod(lod: ArtLod): void {
    if (lod === this.artLod) return;
    this.artLod = lod;
    this.refreshBuildingLooksAndQueues();
  }

  private tileHash(seed: number): number {
    let v = seed * 1103515245 + 12345;
    v = (v ^ (v >>> 13)) * 1274126177;
    return Math.abs(v);
  }

  private getBuildingElevation(building: PlacedBuilding): number {
    return this.grid.getElevation(building.gx, building.gy);
  }

  private getBuildingDepth(
    building: PlacedBuilding,
    phaseOverride?: WorldDepthPhase,
    stableId = building.id
  ): number {
    const def = this.registry.get(building.defId);
    const phase = phaseOverride ?? (
      def?.id === 'road' || def?.id === 'power_line'
        ? WorldDepthPhase.SURFACE_INFRASTRUCTURE
        : WorldDepthPhase.STRUCTURE
    );
    if (!def) return tileDepth(building.gx, building.gy, phase, stableId);
    return footprintDepth(
      building.gx,
      building.gy,
      def.width,
      def.height,
      phase,
      stableId
    );
  }

  private addBuildingSprite(building: PlacedBuilding, animate = true): void {
    this.removeBuildingSprite(building.id);

    const def = this.registry.get(building.defId);
    if (!def) return;

    const authored = this.resolveAuthoredBuildingTexture(building);
    const texKey = authored ? undefined : this.getTextureKey(building);
    if (!authored && (!texKey || !this.textures.has(texKey))) return;

    const sprite = new Sprite(authored?.texture ?? this.textures.get(texKey!));

    const centerGx = building.gx + def.width / 2;
    const centerGy = building.gy + def.height / 2;
    const pos = gridToWorld(centerGx, centerGy, this.getBuildingElevation(building));

    this.applyTextureAnchor(sprite, authored);
    sprite.x = pos.x;
    sprite.y = pos.y + TILE_HALF_H;
    sprite.zIndex = this.getBuildingDepth(building);

    this.spriteMap.set(building.id, sprite);
    if (authored) {
      this.authoredSpriteIds.add(building.id);
      this.authoredVisualMap.set(building.id, authored);
    }

    // Baked contact shadow seats the building on its tile. Sun is top-left,
    // so the pool leans slightly down-right.
    if (!NO_SHADOW_IDS.has(def.id) && this.textures.has('building_shadow')) {
      const shadow = new Sprite(this.textures.get('building_shadow'));
      const span = (def.width + def.height) / 2;
      shadow.anchor.set(0.5);
      shadow.width = span * TILE_HALF_W * 2 * 1.06;
      shadow.height = span * TILE_HALF_H * 2 * 1.06;
      shadow.x = pos.x + 2;
      shadow.y = pos.y + TILE_HALF_H - span * TILE_HALF_H + 1;
      // PROP phase: above terrain and zones, below the structure itself.
      shadow.zIndex = this.getBuildingDepth(building, WorldDepthPhase.PROP);
      this.shadowMap.set(building.id, shadow);
      this.container.addChild(shadow);
      this.worldDepth.attach(shadow);
    }

    this.container.addChild(sprite);
    this.worldDepth.attach(sprite);
    this.applySpriteLook(building, sprite);
    this.refreshQueueForBuilding(building);

    // Construction animation (scale up + fade in)
    if (animate && this.quality !== 'low') {
      sprite.scale.set(0.75);
      sprite.alpha = 0.3;
      this.constructionTweens.push({
        sprite,
        elapsed: 0,
        duration: 400, // ms
      });
    }
  }

  /** Call from the main game loop ticker to advance construction tweens */
  updateConstructionTweens(dtMs: number): void {
    for (let i = this.constructionTweens.length - 1; i >= 0; i--) {
      const tw = this.constructionTweens[i];
      tw.elapsed += dtMs;
      const t = Math.min(tw.elapsed / tw.duration, 1);
      // Ease-out cubic
      const ease = 1 - (1 - t) * (1 - t) * (1 - t);
      tw.sprite.scale.set(0.75 + 0.25 * ease);
      tw.sprite.alpha = 0.3 + 0.7 * ease;

      if (t >= 1) {
        tw.sprite.scale.set(1);
        tw.sprite.alpha = 1;
        // Re-apply the actual sprite look (might have tint changes)
        this.constructionTweens.splice(i, 1);
      }
    }
  }

  private removeBuildingSprite(buildingId: number): void {
    const sprite = this.spriteMap.get(buildingId);
    if (sprite) {
      // Clean up any in-progress construction tween referencing this sprite
      this.constructionTweens = this.constructionTweens.filter(tw => tw.sprite !== sprite);
      this.container.removeChild(sprite);
      sprite.destroy();
      this.spriteMap.delete(buildingId);
    }
    const shadow = this.shadowMap.get(buildingId);
    if (shadow) {
      this.container.removeChild(shadow);
      shadow.destroy();
      this.shadowMap.delete(buildingId);
    }
    this.authoredSpriteIds.delete(buildingId);
    this.authoredVisualMap.delete(buildingId);
    this.clearQueueForBuilding(buildingId);
    const icon = this.unpoweredIconMap.get(buildingId);
    if (icon) {
      this.container.removeChild(icon);
      icon.destroy();
      this.unpoweredIconMap.delete(buildingId);
    }
  }

  private clearQueueForBuilding(buildingId: number): void {
    const queueSprites = this.queueMap.get(buildingId);
    if (!queueSprites) return;
    for (const q of queueSprites) {
      this.container.removeChild(q.sprite);
      q.sprite.destroy();
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

    const fallbackKey = this.textures.getProceduralBuildingFallback(building.defId)
      ?? building.defId;
    const baseKey = this.resolveVariantKey(building, fallbackKey);

    if (def.powerConsumption && !building.powered) {
      const unpoweredVariant = `${baseKey}_unpowered`;
      if (this.textures.has(unpoweredVariant)) return unpoweredVariant;

      const fallbackUnpowered = `${building.defId}_unpowered`;
      if (this.textures.has(fallbackUnpowered)) return fallbackUnpowered;
    }

    return baseKey;
  }

  private resolveVariantKey(building: PlacedBuilding, fallbackKey = building.defId): string {
    const variant = this.tileHash(building.id) % 3;
    let base = fallbackKey;
    if (variant === 1 && this.textures.has(`${fallbackKey}_var1`)) base = `${fallbackKey}_var1`;
    if (variant === 2 && this.textures.has(`${fallbackKey}_var2`)) base = `${fallbackKey}_var2`;

    if (this.quality !== 'low') {
      const style = this.resolveDistrictStyle(building);
      const districtKey = `${base}_district_${style}`;
      if (this.textures.has(districtKey)) {
        base = districtKey;
      }
    }

    return base;
  }

  private resolveAuthoredBuildingTexture(building: PlacedBuilding): AuthoredBuildingTexture | undefined {
    const era = Math.max(1, Math.min(4, Math.floor(this.state.currentEra))) as ArtEra;
    return this.textures.resolveAuthoredBuildingTexture(building.defId, this.artLod, {
      mapSeed: this.state.mapSeed,
      building,
      districtStyle: this.resolveDistrictStyle(building),
      era,
    });
  }

  private applyTextureAnchor(sprite: Sprite, authored?: AuthoredBuildingTexture): void {
    if (!authored) {
      sprite.anchor.set(0.5, 1);
      return;
    }

    const width = Number(sprite.texture.width);
    const height = Number(sprite.texture.height);
    if (!(width > 0) || !(height > 0)) {
      sprite.anchor.set(0.5, 1);
      return;
    }

    sprite.anchor.set(
      Math.max(0, Math.min(1, authored.anchor[0] / width)),
      Math.max(0, Math.min(1, authored.anchor[1] / height)),
    );
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
    return computeNetworkConnectionMask(this.grid, gx, gy, defId);
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

    const authored = this.resolveAuthoredBuildingTexture(building);
    if (authored) {
      sprite.texture = authored.texture;
      this.applyTextureAnchor(sprite, authored);
      this.authoredSpriteIds.add(building.id);
      this.authoredVisualMap.set(building.id, authored);
    } else {
      const texKey = this.getTextureKey(building);
      if (this.textures.has(texKey)) sprite.texture = this.textures.get(texKey);
      this.applyTextureAnchor(sprite);
      this.authoredSpriteIds.delete(building.id);
      this.authoredVisualMap.delete(building.id);
    }
    this.applySpriteLook(building, sprite);
    this.refreshQueueForBuilding(building);
  }

  private refreshPowerStates(): void {
    const buildings = this.grid.getAllBuildings();
    for (const building of buildings) {
      this.refreshSingleBuildingTexture(building);
      this.refreshUnpoweredIcon(building);
    }
  }

  private refreshUnpoweredIcon(building: PlacedBuilding): void {
    const existing = this.unpoweredIconMap.get(building.id);
    const def = this.registry.get(building.defId);
    if (!def) return;

    const needsIcon = def.powerConsumption && !building.powered && this.quality !== 'low';

    if (!needsIcon) {
      if (existing) {
        this.container.removeChild(existing);
        existing.destroy();
        this.unpoweredIconMap.delete(building.id);
      }
      return;
    }

    if (existing) return; // already shown

    const icon = new Text({
      text: '\u26A1',
      style: new TextStyle({
        fontSize: 14,
        fill: '#ff4444',
        fontWeight: 'bold',
        dropShadow: { color: '#000000', blur: 2, distance: 1, angle: Math.PI / 4 },
      }),
    });

    const centerGx = building.gx + def.width / 2;
    const centerGy = building.gy + def.height / 2;
    const pos = gridToWorld(centerGx, centerGy, this.getBuildingElevation(building));

    icon.anchor.set(0.5, 1);
    icon.x = pos.x + TILE_HALF_W * 0.3;
    icon.y = pos.y - TILE_HALF_H * 0.5;
    icon.zIndex = this.getBuildingDepth(
      building,
      WorldDepthPhase.BUILDING_EFFECT,
      building.id * 32 + 31
    );
    icon.alpha = 0.85;

    this.unpoweredIconMap.set(building.id, icon);
    this.container.addChild(icon);
    this.worldDepth.attach(icon);
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
    const unpowered = Boolean(def.powerConsumption && !building.powered);
    const authored = this.authoredSpriteIds.has(building.id);
    const coverage = this.getBuildingCoverage(building.id);

    // Unpowered textures already include a dedicated darkening pass.
    // Skip extra tinting here to avoid over-dark industrial silhouettes.
    if (unpowered && authored) {
      tint = 0xB0B0B0;
    } else if (!unpowered && (def.category === 'residential' || def.category === 'government')) {
      if (coverage < 20) {
        tint = 0xC9B596;
      }
    } else if (!unpowered && def.category === 'industrial' && coverage < 18) {
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
    const pos = gridToWorld(centerGx, centerGy, this.getBuildingElevation(building));

    const authored = this.authoredVisualMap.get(building.id);
    const authoredQueueAnchors = authored?.queueAnchors ?? [];
    const baseX = pos.x - TILE_HALF_W * 0.55;
    const baseY = pos.y + TILE_HALF_H - 4;
    const entries: { sprite: Sprite; baseY: number }[] = [];

    for (let i = 0; i < queueCount; i++) {
      // Select citizen variant based on position hash
      const variantHash = this.tileHash(building.id * 89 + i * 17);
      const variantIdx = variantHash % 4;
      const citizenKey = variantIdx === 0 ? 'queue_citizen' : `queue_citizen_${variantIdx}`;
      const texKey = this.textures.has(citizenKey) ? citizenKey : 'queue_citizen';
      const sprite = new Sprite(this.textures.get(texKey));
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(this.quality === 'high' ? 1 : 0.92);
      sprite.alpha = 0.78 + (i % 2) * 0.1;

      const jitter = (this.tileHash(building.id * 89 + i * 17) % 5) - 2;
      const authoredAnchor = authoredQueueAnchors.length > 0
        ? authoredQueueAnchors[i % authoredQueueAnchors.length]
        : undefined;
      const queueRow = authoredAnchor
        ? Math.floor(i / authoredQueueAnchors.length)
        : i;
      const authoredBaseX = authoredAnchor
        ? pos.x + authoredAnchor[0] - authored!.anchor[0]
        : baseX;
      const authoredBaseY = authoredAnchor
        ? pos.y + TILE_HALF_H + authoredAnchor[1] - authored!.anchor[1]
        : baseY;
      const spriteBaseY = authoredBaseY + queueRow * 3 + (queueRow % 2);
      sprite.x = authoredBaseX + queueRow * 6 + jitter * 0.35;
      sprite.y = spriteBaseY;
      sprite.zIndex = this.getBuildingDepth(
        building,
        WorldDepthPhase.BUILDING_EFFECT,
        building.id * 32 + i
      );

      this.container.addChild(sprite);
      this.worldDepth.attach(sprite);
      entries.push({ sprite, baseY: spriteBaseY });
    }

    this.queueMap.set(building.id, entries);
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

  private queueBobFrame = 0;

  updateQueues(now: number): void {
    // Throttle to every 4th frame — 0.5px sine bob is imperceptible at 15fps vs 60fps
    if (++this.queueBobFrame % 4 !== 0) return;
    for (const [, entries] of this.queueMap) {
      for (let i = 0; i < entries.length; i++) {
        entries[i].sprite.y = entries[i].baseY + Math.sin(now * 0.002 + i) * 0.5;
      }
    }
  }

  getBuildingSpriteAt(buildingId: number): Sprite | undefined {
    return this.spriteMap.get(buildingId);
  }

  /** Exact authored visual currently assigned to the building sprite, if any. */
  getAuthoredBuildingVisual(buildingId: number): AuthoredBuildingTexture | undefined {
    return this.authoredVisualMap.get(buildingId);
  }
}
