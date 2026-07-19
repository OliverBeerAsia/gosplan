import { Container, Graphics, Renderer, Sprite, Texture } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { GraphicsQuality } from '../core/GameState';
import { gridToWorld } from './IsometricRenderer';
import { footprintDepth, WorldDepthPhase, type WorldDepthLayer } from './WorldDepth';
import { TILE_HALF_H, TILE_HALF_W } from '../constants';
import { PALETTE } from '../graphics/SovietPalette';
import { AuthoredBuildingTexture } from '../graphics/TextureFactory';
import { ArtLod, ArtPoint } from '../graphics/ArtManifest';
import { resolveArtLodForZoom } from '../graphics/ArtVariantResolver';

interface LightSprite {
  sprite: Sprite;
  buildingId: number;
  baseAlpha: number;
}

export type AuthoredBuildingVisualProvider = (
  buildingId: number,
) => AuthoredBuildingTexture | undefined;

const RESIDENTIAL_IDS = new Set(['khrushchyovka', 'stalinka', 'kommunalka', 'panelak']);
const CIVIC_IDS = new Set(['party_hq', 'hospital', 'school', 'cinema', 'metro_station']);

export class WindowLightRenderer {
  readonly container: Container;
  private lights: LightSprite[] = [];
  private glowTexture: Texture;
  private quality: GraphicsQuality = 'high';
  private artLod: ArtLod = 'near';
  private visible = false;
  private flickerFrame = 0;

  constructor(
    renderer: Renderer,
    private grid: Grid,
    private registry: BuildingRegistry,
    private events: EventBus,
    private worldDepth: WorldDepthLayer,
    private getAuthoredBuildingVisual?: AuthoredBuildingVisualProvider,
  ) {
    this.container = new Container();
    this.container.sortableChildren = true;
    this.glowTexture = this.createGlowTexture(renderer);

    events.on('building:placed', () => this.rebuild());
    events.on('building:demolished', () => this.rebuild());
    events.on('game:loaded', () => this.rebuild());
    events.on('power:updated', () => this.rebuild());
    // BuildingRenderer registers first and updates its retained visual before
    // this handler asks the provider for the new authored LOD.
    events.on('camera:moved', ({ zoom }) => {
      const nextLod = resolveArtLodForZoom(zoom, this.artLod);
      if (nextLod === this.artLod) return;
      this.artLod = nextLod;
      this.rebuild();
    });
    events.on('graphics:quality:changed', ({ quality }) => this.setQuality(quality));
  }

  private createGlowTexture(renderer: Renderer): Texture {
    const g = new Graphics();
    // Small warm rectangle glow
    g.rect(-2, -1, 4, 3);
    g.fill({ color: PALETTE.WINDOW_WARM, alpha: 0.85 });
    // Soft glow halo
    g.rect(-3, -2, 6, 5);
    g.fill({ color: PALETTE.WINDOW_WARM, alpha: 0.2 });
    const tex = renderer.generateTexture(g);
    g.destroy();
    return tex;
  }

  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    this.container.visible = quality !== 'low' && this.visible;
    this.rebuild();
  }

  rebuild(): void {
    // Clear existing lights
    for (const l of this.lights) {
      this.container.removeChild(l.sprite);
      l.sprite.destroy();
    }
    this.lights = [];

    if (this.quality === 'low') return;

    const buildings = this.grid.getAllBuildings();
    for (const building of buildings) {
      const def = this.registry.get(building.defId);
      if (!def) continue;

      const isResidential = RESIDENTIAL_IDS.has(def.id);
      const isCivic = CIVIC_IDS.has(def.id);
      if (!isResidential && !isCivic) continue;
      if (def.powerConsumption && !building.powered) continue;

      const centerGx = building.gx + def.width / 2;
      const centerGy = building.gy + def.height / 2;
      const elevation = this.grid.getElevation(building.gx, building.gy);
      const pos = gridToWorld(centerGx, centerGy, elevation);

      const authored = this.getAuthoredBuildingVisual?.(building.id);
      if (authored) {
        // Far physical-mass frames deliberately carry no individual window
        // effects. Authored art with no declared anchors must not receive the
        // old generic floating-light treatment.
        if (authored.lod === 'far' || authored.windowAnchors.length === 0) continue;
        this.addAuthoredLights(building.id, building.gx, building.gy, def.width, def.height, pos, authored);
        continue;
      }

      // Place 3-8 window lights depending on building size
      const lightCount = this.quality === 'high'
        ? Math.min(8, 2 + def.width * def.height * 2)
        : Math.min(4, 1 + def.width * def.height);

      const hash = this.tileHash(building.id);

      for (let i = 0; i < lightCount; i++) {
        const h = this.tileHash(building.id * 97 + i * 31);
        const sprite = new Sprite(this.glowTexture);
        sprite.anchor.set(0.5);

        // Distribute lights across building facade
        const spreadX = def.width * TILE_HALF_W * 0.6;
        const spreadY = def.height * TILE_HALF_H * 0.8;
        const offsetX = ((h % 100) / 100 - 0.5) * spreadX;
        const offsetY = -20 - ((h >> 8) % 100) / 100 * spreadY;

        sprite.x = pos.x + offsetX;
        sprite.y = pos.y + TILE_HALF_H + offsetY;
        sprite.zIndex = footprintDepth(
          building.gx,
          building.gy,
          def.width,
          def.height,
          WorldDepthPhase.BUILDING_EFFECT,
          building.id * 16 + i
        );

        const baseAlpha = 0.5 + ((hash + i) % 40) / 100;

        sprite.alpha = 0;
        sprite.visible = false;

        this.lights.push({ sprite, buildingId: building.id, baseAlpha });
        // Not attached to the world depth layer: window lights render in
        // their own container above the night ambience veil, so they stay
        // warm instead of being multiplied down with the buildings.
        this.container.addChild(sprite);
      }
    }
  }

  private addAuthoredLights(
    buildingId: number,
    gx: number,
    gy: number,
    width: number,
    height: number,
    baseline: { x: number; y: number },
    authored: AuthoredBuildingTexture,
  ): void {
    const maxLights = this.quality === 'high' ? 8 : 4;
    const selected = this.selectAuthoredWindowAnchors(
      buildingId,
      authored.windowAnchors,
      maxLights,
    );
    const buildingHash = this.tileHash(buildingId);

    for (let index = 0; index < selected.length; index++) {
      const { point, sourceIndex } = selected[index];
      const sprite = new Sprite(this.glowTexture);
      sprite.anchor.set(0.5);
      sprite.x = baseline.x + point[0] - authored.anchor[0];
      sprite.y = baseline.y + TILE_HALF_H + point[1] - authored.anchor[1];
      sprite.zIndex = footprintDepth(
        gx,
        gy,
        width,
        height,
        WorldDepthPhase.BUILDING_EFFECT,
        buildingId * 64 + sourceIndex,
      );

      const baseAlpha = 0.5 + ((buildingHash + sourceIndex) % 40) / 100;
      sprite.alpha = 0;
      sprite.visible = false;

      this.lights.push({ sprite, buildingId, baseAlpha });
      // See rebuild(): lights render above the night veil, unattached.
      this.container.addChild(sprite);
    }
  }

  private selectAuthoredWindowAnchors(
    buildingId: number,
    anchors: readonly ArtPoint[],
    limit: number,
  ): { point: ArtPoint; sourceIndex: number }[] {
    return anchors
      .map((point, sourceIndex) => ({
        point,
        sourceIndex,
        rank: this.tileHash(buildingId * 131 + sourceIndex * 977 + 17),
      }))
      .sort((left, right) => left.rank - right.rank || left.sourceIndex - right.sourceIndex)
      .slice(0, limit)
      // A stable spatial order makes effect depth IDs and flicker phase easy
      // to inspect while preserving the deterministic subset above.
      .sort((left, right) => left.sourceIndex - right.sourceIndex)
      .map(({ point, sourceIndex }) => ({ point, sourceIndex }));
  }

  /** Update light visibility based on day/night cycle. Call from game loop. */
  update(now: number): void {
    if (this.quality === 'low') return;

    // Match the AmbienceOverlay day/night cycle
    const cycle = (now * 0.000045) % (Math.PI * 2);
    const dayFactor = (Math.sin(cycle) + 1) * 0.5; // 0 = night, 1 = day

    const shouldShow = dayFactor < 0.4;

    if (shouldShow !== this.visible) {
      this.visible = shouldShow;
      this.container.visible = shouldShow;
    }

    if (!shouldShow) return;

    // Throttle flicker to every 4th frame — 0.08-amplitude sine at 15fps is imperceptible vs 60fps
    if (++this.flickerFrame % 4 !== 0) return;

    // Gentle flicker
    const nightIntensity = Math.max(0, (0.4 - dayFactor) / 0.4); // 0..1
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i];
      const flicker = Math.sin(now * 0.003 + i * 1.7) * 0.08;
      l.sprite.alpha = Math.max(0, l.baseAlpha * nightIntensity + flicker);
      l.sprite.visible = true;
    }
  }

  private tileHash(seed: number): number {
    let v = seed * 1103515245 + 12345;
    v = (v ^ (v >>> 13)) * 1274126177;
    return Math.abs(v);
  }

  /** Development benchmark readback without exposing mutable sprite state. */
  getVisibleLightCount(): number {
    return this.lights.reduce(
      (count, light) => count + (light.sprite.visible && light.sprite.alpha > 0 ? 1 : 0),
      0,
    );
  }
}
