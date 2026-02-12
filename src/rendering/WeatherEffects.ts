import { Container, Graphics, Renderer, Sprite, Texture } from 'pixi.js';

interface SnowParticle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
}

export class WeatherEffects {
  readonly container: Container;
  private particles: SnowParticle[] = [];
  private snowTexture: Texture;
  private active = false;
  private screenWidth = 1200;
  private screenHeight = 800;
  private maxParticles = 50;

  constructor(renderer: Renderer) {
    this.container = new Container();
    this.snowTexture = this.createSnowTexture(renderer);
  }

  private createSnowTexture(renderer: Renderer): Texture {
    const g = new Graphics();
    g.circle(0, 0, 2);
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
    if (this.active === active) return;
    this.active = active;
    if (!active) {
      // Clear all particles
      for (const p of this.particles) {
        this.container.removeChild(p.sprite);
        p.sprite.destroy();
      }
      this.particles = [];
    }
  }

  update(dt: number): void {
    if (!this.active) return;

    // Spawn new particles
    if (this.particles.length < this.maxParticles && Math.random() < 0.3) {
      const sprite = new Sprite(this.snowTexture);
      sprite.anchor.set(0.5);
      sprite.x = Math.random() * this.screenWidth;
      sprite.y = -10;
      sprite.alpha = 0.5 + Math.random() * 0.3;
      sprite.scale.set(0.5 + Math.random() * 1.0);

      const particle: SnowParticle = {
        sprite,
        vx: (Math.random() - 0.5) * 20, // horizontal drift
        vy: 30 + Math.random() * 40, // falling speed
        life: 8000 + Math.random() * 4000,
      };

      this.particles.push(particle);
      this.container.addChild(sprite);
    }

    // Update particles
    const dtSec = dt * 0.001;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.sprite.x += p.vx * dtSec;
      p.sprite.y += p.vy * dtSec;

      // Add gentle swaying
      p.vx += (Math.random() - 0.5) * 5 * dtSec;
      p.vx = Math.max(-15, Math.min(15, p.vx));

      if (p.life <= 0 || p.sprite.y > this.screenHeight + 10) {
        this.container.removeChild(p.sprite);
        p.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }
  }
}
