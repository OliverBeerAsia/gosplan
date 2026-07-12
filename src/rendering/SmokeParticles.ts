import { Container, Graphics, Renderer, Sprite, Texture } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { gridToWorld } from './IsometricRenderer';
import { PALETTE } from '../graphics/SovietPalette';
import { EventBus } from '../core/EventBus';
import { GraphicsQuality } from '../core/GameState';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface SmogSprite {
  sprite: Sprite;
  baseX: number;
  baseY: number;
}

export class SmokeParticles {
  readonly container: Container;
  private particles: Particle[] = [];
  private smokeTexture: Texture;
  private smogTexture: Texture;
  private smogSprites: SmogSprite[] = [];
  private spritePool: Sprite[] = [];
  private smokePositions: { x: number; y: number }[] = [];
  private spawnTimer = 0;
  private spawnInterval = 260;
  private maxParticles = 120;
  private quality: GraphicsQuality = 'high';
  windX = 3;
  windY = 0;

  constructor(
    renderer: Renderer,
    private grid: Grid,
    private registry: BuildingRegistry,
    private events: EventBus
  ) {
    this.container = new Container();
    this.smokeTexture = this.createSmokeTexture(renderer);
    this.smogTexture = this.createSmogTexture(renderer);
    this.events.on('graphics:quality:changed', ({ quality }) => this.setQuality(quality));
    this.events.on('building:placed', () => { this.rebuildSmog(); this.rebuildSmokePositions(); });
    this.events.on('building:demolished', () => { this.rebuildSmog(); this.rebuildSmokePositions(); });
    this.events.on('game:loaded', () => { this.rebuildSmog(); this.rebuildSmokePositions(); });
    this.events.on('power:updated', () => this.rebuildSmokePositions());
  }

  private createSmokeTexture(renderer: Renderer): Texture {
    const g = new Graphics();
    g.circle(0, 0, 5);
    g.fill({ color: PALETTE.SMOKE, alpha: 0.6 });
    g.circle(-2, -2, 3);
    g.fill({ color: 0xD0D0D0, alpha: 0.4 });
    const tex = renderer.generateTexture(g);
    g.destroy();
    return tex;
  }

  update(dt: number): void {
    this.spawnTimer += dt;

    // Spawn new particles from factories and power plants
    if (this.spawnTimer > this.spawnInterval && this.particles.length < this.maxParticles) {
      this.spawnTimer = 0;
      this.spawnFromBuildings();
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.container.removeChild(p.sprite);
        p.sprite.visible = false;
        this.spritePool.push(p.sprite);
        // Swap-and-pop: O(1) removal
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }

      p.sprite.x += (p.vx + this.windX) * dt * 0.001;
      p.sprite.y += (p.vy + this.windY) * dt * 0.001;
      p.sprite.alpha = (p.life / p.maxLife) * 0.5;
      p.sprite.scale.set(1 + (1 - p.life / p.maxLife) * 1.5);
    }

    this.updateSmog(dt);
  }

  private rebuildSmokePositions(): void {
    this.smokePositions = [];
    const buildings = this.grid.getAllBuildings();
    for (const b of buildings) {
      if (!b.powered) continue;
      const def = this.registry.get(b.defId);
      if (!def) continue;
      if (def.id !== 'factory' && def.id !== 'coal_power_plant') continue;
      const centerGx = b.gx + def.width / 2;
      const centerGy = b.gy + def.height / 2;
      this.smokePositions.push(gridToWorld(
        centerGx,
        centerGy,
        this.grid.getElevation(b.gx, b.gy)
      ));
    }
  }

  private spawnFromBuildings(): void {
    for (const pos of this.smokePositions) {
      // Random chance per tick
      if (Math.random() > 0.7) continue;

      // Reuse pooled sprite or create new one
      let sprite: Sprite;
      if (this.spritePool.length > 0) {
        sprite = this.spritePool.pop()!;
        sprite.visible = true;
        sprite.scale.set(1);
      } else {
        sprite = new Sprite(this.smokeTexture);
        sprite.anchor.set(0.5);
      }
      // Offset up from building top
      sprite.x = pos.x + (Math.random() - 0.5) * 15;
      sprite.y = pos.y - 60 - Math.random() * 20;
      sprite.alpha = 0.4;

      const maxLife = 2000 + Math.random() * 2000;

      const particle: Particle = {
        sprite,
        vx: (Math.random() - 0.5) * 8 + 3, // slight drift right
        vy: -10 - Math.random() * 8, // float up
        life: maxLife,
        maxLife,
      };

      this.particles.push(particle);
      this.container.addChild(sprite);
    }
  }

  private createSmogTexture(renderer: Renderer): Texture {
    const g = new Graphics();
    g.circle(0, 0, 18);
    g.fill({ color: 0x888888, alpha: 0.1 });
    g.circle(-4, -4, 12);
    g.fill({ color: 0x999999, alpha: 0.06 });
    const tex = renderer.generateTexture(g);
    g.destroy();
    return tex;
  }

  private rebuildSmog(): void {
    // Clear existing smog
    for (const s of this.smogSprites) {
      this.container.removeChild(s.sprite);
      s.sprite.destroy();
    }
    this.smogSprites = [];

    if (this.quality !== 'high') return;

    // Find industrial building clusters
    const buildings = this.grid.getAllBuildings();
    const industrialPositions: { x: number; y: number }[] = [];

    for (const b of buildings) {
      const def = this.registry.get(b.defId);
      if (!def || def.category !== 'industrial') continue;
      const centerGx = b.gx + def.width / 2;
      const centerGy = b.gy + def.height / 2;
      const pos = gridToWorld(centerGx, centerGy, this.grid.getElevation(b.gx, b.gy));
      industrialPositions.push(pos);
    }

    // Place 2-3 smog sprites per industrial cluster area
    const placed = new Set<string>();
    for (const pos of industrialPositions) {
      // Round to grid to avoid placing too many in the same area
      const key = `${Math.round(pos.x / 80)}_${Math.round(pos.y / 40)}`;
      if (placed.has(key)) continue;
      placed.add(key);

      const count = 2 + (placed.size % 2);
      for (let i = 0; i < count; i++) {
        const sprite = new Sprite(this.smogTexture);
        sprite.anchor.set(0.5);
        const baseX = pos.x + (i - 1) * 20;
        const baseY = pos.y - 40 - i * 10;
        sprite.x = baseX;
        sprite.y = baseY;
        sprite.alpha = 0.08 + (i % 3) * 0.02;
        sprite.scale.set(1.5 + i * 0.3);
        this.smogSprites.push({ sprite, baseX, baseY });
        this.container.addChild(sprite);
      }
    }
  }

  /** Drift smog sprites slowly with wind */
  private updateSmog(dt: number): void {
    if (this.quality !== 'high' || this.smogSprites.length === 0) return;

    const dtSec = dt * 0.001;
    for (const s of this.smogSprites) {
      s.sprite.x += this.windX * dtSec * 1.5;
      const drift = Math.abs(s.sprite.x - s.baseX);
      // Fade out as smog approaches wrap distance, then reset
      if (drift > 60) {
        s.sprite.x = s.baseX;
        s.sprite.alpha = 0.08;
      } else if (drift > 40) {
        // Fade from normal alpha to 0 over the last 20px of drift
        s.sprite.alpha = (0.08 + (s.baseX % 3) * 0.02) * (1 - (drift - 40) / 20);
      }
    }
  }

  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    if (quality === 'low') {
      this.spawnInterval = 520;
      this.maxParticles = 45;
    } else if (quality === 'medium') {
      this.spawnInterval = 340;
      this.maxParticles = 80;
    } else {
      this.spawnInterval = 240;
      this.maxParticles = 130;
    }

    while (this.particles.length > this.maxParticles) {
      const removed = this.particles.pop();
      if (!removed) break;
      this.container.removeChild(removed.sprite);
      removed.sprite.visible = false;
      this.spritePool.push(removed.sprite);
    }

    this.rebuildSmog();
  }
}
