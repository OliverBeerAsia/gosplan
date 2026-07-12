import { Container, Sprite } from 'pixi.js';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { GraphicsQuality } from '../core/GameState';
import { ArtLod, ArtSeason, EnvironmentMinimumQuality } from '../graphics/ArtManifest';
import { resolveArtLodForZoom } from '../graphics/ArtVariantResolver';
import { TextureFactory } from '../graphics/TextureFactory';
import { Grid } from '../grid/Grid';
import { TILE_HALF_H } from '../constants';
import { gridToWorld } from './IsometricRenderer';
import { getSeason } from './SeasonalEffects';
import { tileDepth, WorldDepthPhase, type WorldDepthLayer } from './WorldDepth';
import {
  EnvironmentCompositionInvalidationQueue,
  planEnvironmentCompositions,
  type PlannedEnvironmentComposition,
  type PlannedEnvironmentPart,
} from './EnvironmentCompositionPlanner';

type PropTextureKey =
  | 'prop_none'
  | 'prop_lamp'
  | 'prop_fence'
  | 'prop_kiosk'
  | 'prop_courtyard'
  | 'prop_pole'
  | 'prop_bus_stop'
  | 'prop_statue'
  | 'prop_bench'
  | 'prop_flowerbed'
  | 'prop_flagpole';

export interface EnvironmentRendererContext {
  mapSeed?: number;
  season?: ArtSeason;
}

export interface EnvironmentCompositionHit {
  definitionId: string;
  variantId: string;
  ownerBuildingId: number;
}

interface EnvironmentEmissiveSprite {
  sprite: Sprite;
  ownerBuildingId: number;
  requiresOwnerPower: boolean;
  baseAlpha: number;
}

const QUALITY_RANK: Readonly<Record<GraphicsQuality, number>> = {
  low: 0,
  medium: 1,
  high: 2,
};

const MINIMUM_QUALITY_RANK: Readonly<Record<EnvironmentMinimumQuality, number>> = {
  medium: 1,
  high: 2,
};

export class EnvironmentPropRenderer {
  readonly container: Container;
  private sprites: Sprite[][] = [];
  private authoredSprites: Sprite[] = [];
  private emissiveSprites: EnvironmentEmissiveSprite[] = [];
  private claimedCells = new Set<string>();
  private plannedCompositions: PlannedEnvironmentComposition[] = [];
  private pendingZoneChanges = new EnvironmentCompositionInvalidationQueue();
  private quality: GraphicsQuality = 'high';
  private artLod: ArtLod = 'near';
  private mapSeed: number;
  private season: ArtSeason;

  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private textures: TextureFactory,
    private events: EventBus,
    private worldDepth: WorldDepthLayer,
    context: EnvironmentRendererContext = {},
  ) {
    this.mapSeed = Number.isFinite(context.mapSeed) ? context.mapSeed! >>> 0 : 0;
    this.season = context.season ?? 'summer';
    this.container = new Container();
    this.container.sortableChildren = true;
    this.buildSprites();

    // Authored compositions reserve multiple cells, so a topology change may
    // cascade to a later owner. Structural changes remain synchronous. Zone
    // drag events are coalesced and applied once at the start of the next
    // frame, including while simulation time is paused.
    events.on('building:placed', () => this.updateAll());
    events.on('building:demolished', () => this.updateAll());
    events.on('zone:changed', ({ gx, gy }) => this.pendingZoneChanges.invalidate(gx, gy));
    events.on('terrain:changed', () => this.updateAll());
    events.on('game:loaded', () => this.updateAll());
    events.on('tick', ({ week }) => this.setSeason(getSeason(week)));
    events.on('graphics:quality:changed', ({ quality }) => this.setQuality(quality));
    events.on('camera:moved', ({ zoom }) => {
      const nextLod = resolveArtLodForZoom(zoom, this.artLod);
      if (nextLod === this.artLod) return;
      this.artLod = nextLod;
      this.updateAll();
    });
  }

  setQuality(quality: GraphicsQuality): void {
    if (this.quality === quality) return;
    this.quality = quality;
    this.container.visible = quality !== 'low';
    this.updateAll();
  }

  setMapSeed(mapSeed: number): void {
    const nextSeed = Number.isFinite(mapSeed) ? mapSeed >>> 0 : 0;
    if (nextSeed === this.mapSeed) return;
    this.mapSeed = nextSeed;
    this.updateAll();
  }

  setSeason(season: ArtSeason): void {
    if (season === this.season) return;
    this.season = season;
    this.updateAll();
  }

  /** Exact deterministic plan retained for benchmark inspection. */
  getPlannedCompositions(): readonly PlannedEnvironmentComposition[] {
    return this.plannedCompositions;
  }

  /** Cosmetic ownership lookup for inspect/demolish messaging. */
  getCompositionAt(gx: number, gy: number): EnvironmentCompositionHit | undefined {
    if (!this.claimedCells.has(`${gx},${gy}`)) return undefined;
    for (const composition of this.plannedCompositions) {
      if (!composition.claimedCells.some((cell) => cell.gx === gx && cell.gy === gy)) continue;
      return {
        definitionId: composition.definitionId,
        variantId: composition.variantId,
        ownerBuildingId: composition.ownerBuildingId,
      };
    }
    return undefined;
  }

  /**
   * Update only the bounded emissive list. Game may call this beside the
   * existing authored building light update without any grid scan.
   */
  updateLighting(now: number): void {
    if (this.quality === 'low' || this.emissiveSprites.length === 0) return;
    const cycle = (now * 0.000045) % (Math.PI * 2);
    const dayFactor = (Math.sin(cycle) + 1) * 0.5;
    const nightIntensity = Math.max(0, (0.4 - dayFactor) / 0.4);

    for (const entry of this.emissiveSprites) {
      const owner = this.grid.getBuildingById(entry.ownerBuildingId);
      const powered = !entry.requiresOwnerPower || Boolean(owner?.powered);
      entry.sprite.visible = powered && nightIntensity > 0;
      entry.sprite.alpha = powered ? entry.baseAlpha * nightIntensity : 0;
    }
  }

  /** Apply all zone edits received since the previous rendered frame. */
  flushPendingUpdates(): void {
    this.pendingZoneChanges.flush((changedCells) => {
      // Claim changes can cascade through deterministic owner ordering. Replan
      // once, then refresh only cells whose legacy prop visibility can differ.
      const affectedCells = new Set(this.claimedCells);
      for (const { gx, gy } of changedCells) affectedCells.add(`${gx},${gy}`);
      this.rebuildAuthoredCompositions();
      for (const key of this.claimedCells) affectedCells.add(key);

      for (const key of affectedCells) {
        const separator = key.indexOf(',');
        this.updateCell(
          Number(key.slice(0, separator)),
          Number(key.slice(separator + 1)),
        );
      }
    });
  }

  private buildSprites(): void {
    for (let gx = 0; gx < this.grid.size; gx++) {
      this.sprites[gx] = [];
      for (let gy = 0; gy < this.grid.size; gy++) {
        const elevation = this.grid.getElevation(gx, gy);
        const pos = gridToWorld(gx, gy, elevation);
        const sprite = new Sprite(this.textures.get('prop_none'));
        sprite.anchor.set(0.5, 1);
        sprite.x = pos.x;
        sprite.y = pos.y + TILE_HALF_H;
        sprite.zIndex = tileDepth(gx, gy, WorldDepthPhase.PROP);
        sprite.visible = false;
        this.sprites[gx][gy] = sprite;
        this.container.addChild(sprite);
        this.worldDepth.attach(sprite);
      }
    }
    this.container.visible = this.quality !== 'low';
    this.updateAll();
  }

  private updateAround(gx: number, gy: number, radius: number): void {
    for (let x = gx - radius; x <= gx + radius; x++) {
      for (let y = gy - radius; y <= gy + radius; y++) this.updateCell(x, y);
    }
  }

  updateAll(): void {
    // A synchronous full rebuild subsumes any queued interactive edits.
    this.pendingZoneChanges.drain();
    this.rebuildAuthoredCompositions();
    for (let gx = 0; gx < this.grid.size; gx++) {
      for (let gy = 0; gy < this.grid.size; gy++) this.updateCell(gx, gy);
    }
  }

  private clearAuthoredSprites(): void {
    for (const sprite of this.authoredSprites) {
      this.container.removeChild(sprite);
      sprite.destroy();
    }
    this.authoredSprites = [];
    this.emissiveSprites = [];
    this.claimedCells.clear();
  }

  private rebuildAuthoredCompositions(): void {
    this.clearAuthoredSprites();
    const definitions = this.textures.getArtRegistry()?.getEnvironmentDefinitions() ?? [];
    this.plannedCompositions = planEnvironmentCompositions({
      grid: this.grid,
      registry: this.registry,
      definitions,
      mapSeed: this.mapSeed,
      quality: this.quality,
    });
    if (this.quality === 'low') return;

    const lod: ArtLod = this.quality === 'medium' && this.artLod === 'near'
      ? 'mid'
      : this.artLod;
    for (const composition of this.plannedCompositions) {
      let renderedPart = false;
      for (const plannedPart of composition.parts) {
        if (!this.meetsMinimumQuality(plannedPart.part.minimumQuality)) continue;
        const resolved = this.textures.resolveEnvironmentPartTexture(
          plannedPart.part,
          lod,
          this.season,
        );
        if (!resolved) continue;

        const sprite = new Sprite(resolved.texture);
        this.applyAnchor(sprite, resolved.anchor);
        this.positionPart(sprite, plannedPart);
        sprite.zIndex = tileDepth(
          plannedPart.gx,
          plannedPart.gy,
          plannedPart.part.layer === 'ground_decal'
            ? WorldDepthPhase.TERRAIN_DECAL
            : WorldDepthPhase.PROP,
          plannedPart.stableId,
        );
        sprite.alpha = 1;
        this.container.addChild(sprite);
        this.worldDepth.attach(sprite);
        this.authoredSprites.push(sprite);
        renderedPart = true;

        const emissive = this.textures.resolveEnvironmentEmissiveTexture(plannedPart.part, lod);
        if (!emissive || plannedPart.part.layer !== 'prop') continue;
        const emissiveSprite = new Sprite(emissive.texture);
        this.applyAnchor(emissiveSprite, emissive.anchor);
        this.positionPart(emissiveSprite, plannedPart);
        emissiveSprite.zIndex = tileDepth(
          plannedPart.gx,
          plannedPart.gy,
          WorldDepthPhase.PROP,
          plannedPart.stableId + 1,
        );
        emissiveSprite.alpha = 0;
        emissiveSprite.visible = false;
        this.container.addChild(emissiveSprite);
        this.worldDepth.attach(emissiveSprite);
        this.authoredSprites.push(emissiveSprite);
        this.emissiveSprites.push({
          sprite: emissiveSprite,
          ownerBuildingId: composition.ownerBuildingId,
          requiresOwnerPower: plannedPart.definition.powerSource === 'owner',
          baseAlpha: 0.82,
        });
      }

      // Suppress legacy random props only when a usable authored or procedural
      // composition part reached the scene. Atlas failure therefore cannot
      // create an unexplained blank courtyard.
      if (renderedPart) {
        for (const cell of composition.claimedCells) {
          this.claimedCells.add(`${cell.gx},${cell.gy}`);
        }
      }
    }
  }

  private meetsMinimumQuality(minimum?: EnvironmentMinimumQuality): boolean {
    if (!minimum) return this.quality !== 'low';
    return QUALITY_RANK[this.quality] >= MINIMUM_QUALITY_RANK[minimum];
  }

  private applyAnchor(sprite: Sprite, anchor: readonly [number, number]): void {
    const width = Number(sprite.texture.width);
    const height = Number(sprite.texture.height);
    if (!(width > 0) || !(height > 0)) {
      sprite.anchor.set(0.5, 1);
      return;
    }
    sprite.anchor.set(
      Math.max(0, Math.min(1, anchor[0] / width)),
      Math.max(0, Math.min(1, anchor[1] / height)),
    );
  }

  private positionPart(sprite: Sprite, plannedPart: PlannedEnvironmentPart): void {
    const pos = gridToWorld(plannedPart.gx, plannedPart.gy, plannedPart.elevation);
    sprite.x = pos.x;
    sprite.y = pos.y + TILE_HALF_H;
  }

  private updateCell(gx: number, gy: number): void {
    if (!this.grid.inBounds(gx, gy)) return;
    const sprite = this.sprites[gx]?.[gy];
    const cell = this.grid.getCell(gx, gy);
    if (!sprite || !cell) return;

    const propKey = this.claimedCells.has(`${gx},${gy}`)
      ? 'prop_none'
      : this.pickPropForCell(gx, gy);
    sprite.texture = this.textures.get(propKey);
    if (propKey === 'prop_none') {
      sprite.visible = false;
      return;
    }

    const jitter = (this.tileHash(gx + 11, gy - 7) % 5) - 2;
    const elevation = this.grid.getElevation(gx, gy);
    const pos = gridToWorld(gx, gy, elevation);
    sprite.x = pos.x + jitter * 0.8;
    sprite.y = pos.y + TILE_HALF_H + ((this.tileHash(gx, gy) % 3) - 1) * 0.5;
    sprite.zIndex = tileDepth(gx, gy, WorldDepthPhase.PROP);
    sprite.alpha = this.quality === 'high' ? 0.96 : 0.84;
    sprite.scale.set(this.quality === 'high' ? 1 : 0.94);
    sprite.visible = true;
  }

  private pickPropForCell(gx: number, gy: number): PropTextureKey {
    if (this.quality === 'low') return 'prop_none';

    const cell = this.grid.getCell(gx, gy);
    if (!cell || !this.grid.isBuildable(cell.terrain) || cell.building) return 'prop_none';
    const hash = this.tileHash(gx, gy);
    const roll = hash % 100;
    const density = this.quality === 'high' ? 1 : 0.66;
    let roadCount = 0;
    let industrialCount = 0;
    let residentialCount = 0;
    let civicCount = 0;

    for (let nx = gx - 1; nx <= gx + 1; nx++) {
      for (let ny = gy - 1; ny <= gy + 1; ny++) {
        if (nx === gx && ny === gy) continue;
        const building = this.grid.getMasterBuilding(nx, ny);
        if (!building) continue;
        const def = this.registry.get(building.defId);
        if (!def) continue;
        if (def.isRoad) roadCount++;
        if (def.category === 'industrial') industrialCount++;
        if (def.category === 'residential') residentialCount++;
        if (def.category === 'government' || def.id === 'metro_station') civicCount++;
      }
    }

    if (roadCount > 0 && (cell.zone === 'civic' || civicCount > 0)) {
      if (roll < 28 * density) {
        const pick = hash % 4;
        if (pick === 0) return 'prop_bus_stop';
        if (pick === 1) return 'prop_kiosk';
        if (pick === 2) return 'prop_flagpole';
        return 'prop_statue';
      }
    }
    if (cell.zone === 'industry' || industrialCount > 0) {
      if (roll < 36 * density) return hash % 2 === 0 ? 'prop_pole' : 'prop_fence';
    }
    if (cell.zone === 'housing' || residentialCount > 0) {
      if (roll < 30 * density) {
        const pick = hash % 4;
        if (pick === 0) return 'prop_courtyard';
        if (pick === 1) return 'prop_bench';
        if (pick === 2) return 'prop_flowerbed';
        return 'prop_fence';
      }
    }
    if (cell.zone === 'green') {
      if (roll < 40 * density) {
        const pick = hash % 4;
        if (pick === 0) return 'prop_courtyard';
        if (pick === 1) return 'prop_bench';
        if (pick === 2) return 'prop_flowerbed';
        return 'prop_flagpole';
      }
    }
    if (roadCount > 0 && roll < 16 * density) return 'prop_lamp';
    if (roll < 7 * density) return hash % 2 === 0 ? 'prop_fence' : 'prop_bench';
    return 'prop_none';
  }

  private tileHash(gx: number, gy: number): number {
    let value = gx * 374761393 + gy * 668265263;
    value = (value ^ (value >>> 13)) * 1274126177;
    return Math.abs(value);
  }
}
