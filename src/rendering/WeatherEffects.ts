import { Container, Graphics, Renderer, Sprite, Texture } from 'pixi.js';
import { GraphicsQuality } from '../core/GameState';

interface SnowParticle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
}

export class WeatherEffects {
  readonly container: Container;
  private particles: SnowParticle[] = [];
  private spritePool: Sprite[] = [];
  private snowTexture: Texture;
  private rainTexture: Texture;
  private active = false;
  private weatherType: 'none' | 'snow' | 'rain' = 'none';
  private screenWidth = 1200;
  private screenHeight = 800;
  private maxParticles = 50;
  private spawnChance = 0.3;
  windX = 0;
  windY = 0;

  constructor(renderer: Renderer) {
    this.container = new Container();
    this.snowTexture = this.createSnowTexture(renderer);
    this.rainTexture = this.createRainTexture(renderer);
  }

  private createSnowTexture(renderer: Renderer): Texture {
    const g = new Graphics();
    g.circle(0, 0, 2);
    g.fill({ color: 0xFFFFFF, alpha: 0.8 });
    const tex = renderer.generateTexture(g);
    g.destroy();
    return tex;
  }

  private createRainTexture(renderer: Renderer): Texture {
    const g = new Graphics();
    g.rect(0, 0, 1, 7);
    g.fill({ color: 0xFFFFFF, alpha: 0.8 });
    const tex = renderer.generateTexture(g);
    g.destroy();
    return tex;
  }

  setScreenSize(w: number, h: number): void {
    this.screenWidth = w;
    this.screenHeight = h;
  }

  setActive(active: boolean): void {
    this.setWeatherType(active ? 'snow' : 'none');
  }

  setWeatherType(type: 'none' | 'snow' | 'rain'): void {
    const wasActive = this.active;
    this.weatherType = type;
    this.active = type !== 'none';

    if (wasActive && !this.active) {
      // Return all particles to pool
      for (const p of this.particles) {
        this.container.removeChild(p.sprite);
        p.sprite.visible = false;
        this.spritePool.push(p.sprite);
      }
      this.particles = [];
    }
  }

  update(dt: number): void {
    if (!this.active) return;

    const isRain = this.weatherType === 'rain';
    const spawnLimit = isRain ? Math.floor(this.maxParticles * 1.5) : this.maxParticles;
    const spawnRate = isRain ? Math.min(this.spawnChance * 2, 0.8) : this.spawnChance;

    // Spawn new particles
    if (this.particles.length < spawnLimit && Math.random() < spawnRate) {
      const texture = isRain ? this.rainTexture : this.snowTexture;

      // Reuse pooled sprite or create new one
      let sprite: Sprite;
      if (this.spritePool.length > 0) {
        sprite = this.spritePool.pop()!;
        sprite.texture = texture;
        sprite.visible = true;
        sprite.rotation = 0;
      } else {
        sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
      }
      sprite.x = Math.random() * this.screenWidth;
      sprite.y = -10;
      sprite.alpha = isRain ? 0.4 + Math.random() * 0.3 : 0.5 + Math.random() * 0.3;
      sprite.scale.set(isRain ? 0.8 + Math.random() * 0.5 : 0.5 + Math.random() * 1.0);

      const vx = (Math.random() - 0.5) * 20 + this.windX * 0.5;
      const vy = isRain ? 150 + Math.random() * 100 : 30 + Math.random() * 40;

      // Tilt rain streaks to match wind direction
      if (isRain) {
        sprite.rotation = Math.atan2(vy, vx + this.windX * 0.5);
      }

      const particle: SnowParticle = {
        sprite,
        vx,
        vy,
        life: isRain ? 3000 + Math.random() * 2000 : 8000 + Math.random() * 4000,
      };

      this.particles.push(particle);
      this.container.addChild(sprite);
    }

    // Update particles
    const dtSec = dt * 0.001;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.sprite.x += p.vx * dtSec + this.windX * dtSec * 0.5;
      p.sprite.y += p.vy * dtSec;

      // Add gentle swaying (snow only)
      if (!isRain) {
        p.vx += (Math.random() - 0.5) * 5 * dtSec;
        p.vx = Math.max(-15, Math.min(15, p.vx));
      }

      if (p.life <= 0 || p.sprite.y > this.screenHeight + 10) {
        this.container.removeChild(p.sprite);
        p.sprite.visible = false;
        this.spritePool.push(p.sprite);
        // Swap-and-pop: O(1) removal
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  setQuality(quality: GraphicsQuality): void {
    if (quality === 'low') {
      this.maxParticles = 22;
      this.spawnChance = 0.16;
    } else if (quality === 'medium') {
      this.maxParticles = 40;
      this.spawnChance = 0.24;
    } else {
      this.maxParticles = 64;
      this.spawnChance = 0.34;
    }

    while (this.particles.length > this.maxParticles) {
      const p = this.particles.pop();
      if (!p) break;
      this.container.removeChild(p.sprite);
      p.sprite.visible = false;
      this.spritePool.push(p.sprite);
    }
  }
}
