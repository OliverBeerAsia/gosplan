import { Container, Graphics, Renderer, Sprite, Texture } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { GraphicsQuality } from '../core/GameState';
import { gridToWorld, depthKey } from './IsometricRenderer';
import { TILE_HALF_H, TILE_HALF_W } from '../constants';
import { PALETTE } from '../graphics/SovietPalette';

interface LightSprite {
  sprite: Sprite;
  buildingId: number;
  baseAlpha: number;
}

const RESIDENTIAL_IDS = new Set(['khrushchyovka', 'stalinka', 'kommunalka', 'panelak']);
const CIVIC_IDS = new Set(['party_hq', 'hospital', 'school', 'cinema', 'metro_station']);

export class WindowLightRenderer {
  readonly container: Container;
  private lights: LightSprite[] = [];
  private glowTexture: Texture;
  private quality: GraphicsQuality = 'high';
  private visible = false;

  constructor(
    renderer: Renderer,
    private grid: Grid,
    private registry: BuildingRegistry,
    private events: EventBus
  ) {
    this.container = new Container();
    this.glowTexture = this.createGlowTexture(renderer);

    events.on('building:placed', () => this.rebuild());
    events.on('building:demolished', () => this.rebuild());
    events.on('game:loaded', () => this.rebuild());
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
    if (quality === 'low') {
      this.container.visible = false;
    }
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
      const pos = gridToWorld(centerGx, centerGy, 0);

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
        sprite.zIndex = depthKey(building.gx + def.width - 1, building.gy + def.height - 1) + 0.5;

        const baseAlpha = 0.5 + ((hash + i) % 40) / 100;

        sprite.alpha = 0;
        sprite.visible = false;

        this.lights.push({ sprite, buildingId: building.id, baseAlpha });
        this.container.addChild(sprite);
      }
    }
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
}
