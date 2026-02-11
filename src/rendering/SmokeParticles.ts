import { Container, Graphics, Renderer, Sprite, Texture } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { gridToWorld } from './IsometricRenderer';
import { PALETTE } from '../graphics/SovietPalette';
import { EventBus } from '../core/EventBus';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class SmokeParticles {
  readonly container: Container;
  private particles: Particle[] = [];
  private smokeTexture: Texture;
  private spawnTimer = 0;

  constructor(
    renderer: Renderer,
    private grid: Grid,
    private registry: BuildingRegistry,
    private events: EventBus
  ) {
    this.container = new Container();
    this.smokeTexture = this.createSmokeTexture(renderer);
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
    if (this.spawnTimer > 300) { // every 300ms
      this.spawnTimer = 0;
      this.spawnFromBuildings();
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.container.removeChild(p.sprite);
        p.sprite.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      p.sprite.x += p.vx * dt * 0.001;
      p.sprite.y += p.vy * dt * 0.001;
      p.sprite.alpha = (p.life / p.maxLife) * 0.5;
      p.sprite.scale.set(1 + (1 - p.life / p.maxLife) * 1.5);
    }
  }

  private spawnFromBuildings(): void {
    const buildings = this.grid.getAllBuildings();
    for (const b of buildings) {
      if (!b.powered) continue;
      const def = this.registry.get(b.defId);
      if (!def) continue;

      // Only factories and power plants smoke
      if (def.id !== 'factory' && def.id !== 'coal_power_plant') continue;

      // Random chance per tick
      if (Math.random() > 0.7) continue;

      const centerGx = b.gx + def.width / 2;
      const centerGy = b.gy + def.height / 2;
      const pos = gridToWorld(centerGx, centerGy, 0);

      const sprite = new Sprite(this.smokeTexture);
      sprite.anchor.set(0.5);
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
}
