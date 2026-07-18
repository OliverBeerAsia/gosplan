import { Container, Graphics, Renderer, Sprite, Texture } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { GameStateData, GraphicsQuality } from '../core/GameState';
import { gridToWorld } from './IsometricRenderer';
import { movingDepth, WorldDepthPhase, type WorldDepthLayer } from './WorldDepth';


interface TrafficDot {
  id: number;
  sprite: Sprite;
  colorIdx: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  laneX: number; // perpendicular right-hand lane offset, screen space
  laneY: number;
  progress: number; // 0..1
  speed: number;
  currentGx: number; // grid tile the dot is heading toward
  currentGy: number;
  prevGx: number; // grid tile the dot came from (to avoid backtracking)
  prevGy: number;
}

// Soviet car colors
const CAR_COLORS = [0x8B2020, 0x2A3A5A, 0x6A6A6A, 0x4A5A3A, 0x7A4A2A];

/**
 * Screen-space unit vectors for the four grid travel directions.
 * Index: 0 = +gx (down-right), 1 = -gx (up-left), 2 = +gy (down-left),
 * 3 = -gy (up-right). Matches directionIndex().
 */
const DIR_VECTORS: ReadonlyArray<{ x: number; y: number }> = (() => {
  const n = Math.hypot(2, 1);
  return [
    { x: 2 / n, y: 1 / n },
    { x: -2 / n, y: -1 / n },
    { x: -2 / n, y: 1 / n },
    { x: 2 / n, y: -1 / n },
  ];
})();

function directionIndex(dgx: number, dgy: number): number {
  if (dgx > 0) return 0;
  if (dgx < 0) return 1;
  if (dgy > 0) return 2;
  return 3;
}

function offsetColor(color: number, amount: number): number {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 0xFF) + amount));
  const g = Math.max(0, Math.min(255, ((color >> 8) & 0xFF) + amount));
  const b = Math.max(0, Math.min(255, (color & 0xFF) + amount));
  return (r << 16) | (g << 8) | b;
}

export function canTraverseRoadEdge(
  grid: Grid,
  fromGx: number,
  fromGy: number,
  toGx: number,
  toGy: number
): boolean {
  return Math.abs(fromGx - toGx) + Math.abs(fromGy - toGy) === 1
    && grid.canConnectAtEqualElevation(fromGx, fromGy, toGx, toGy);
}

export class TrafficRenderer {
  readonly container: Container;
  private dots: TrafficDot[] = [];
  /** carTextures[colorIdx][dirIndex] — oriented vehicle sprites. */
  private carTextures: Texture[][] = [];
  private dotPool: Sprite[] = [];
  private quality: GraphicsQuality = 'high';
  private roadTiles: { gx: number; gy: number }[] = [];
  private maxDots = 40;
  private spawnTimer = 0;
  private spawnInterval = 800;
  private nextDotId = 1;

  constructor(
    renderer: Renderer,
    private grid: Grid,
    private registry: BuildingRegistry,
    private events: EventBus,
    private state: GameStateData,
    private worldDepth: WorldDepthLayer
  ) {
    this.container = new Container();
    this.container.sortableChildren = true;
    this.createCarTextures(renderer);

    events.on('building:placed', ({ building }) => {
      const def = this.registry.get(building.defId);
      if (def?.isRoad) this.rebuildRoadList();
    });
    events.on('building:demolished', ({ building }) => {
      const def = this.registry.get(building.defId);
      if (def?.isRoad) this.rebuildRoadList();
    });
    events.on('game:loaded', () => this.rebuildRoadList());
    events.on('graphics:quality:changed', ({ quality }) => this.setQuality(quality));
  }

  private createCarTextures(renderer: Renderer): void {
    for (const color of CAR_COLORS) {
      const oriented: Texture[] = [];
      for (const u of DIR_VECTORS) {
        oriented.push(this.createVehicleTexture(renderer, color, u));
      }
      this.carTextures.push(oriented);
    }
  }

  /**
   * A small isometric van/truck oriented along its travel direction: ground
   * shadow, body slab, darker cab with windshield at the front, lighter roof,
   * and a headlight pixel. Bounds are pinned so every orientation shares one
   * frame and anchor.
   */
  private createVehicleTexture(
    renderer: Renderer,
    color: number,
    u: { x: number; y: number },
  ): Texture {
    const g = new Graphics();
    // Fixed frame so texture origin is identical for all orientations
    g.rect(-9, -9, 18, 18);
    g.fill({ color: 0x000000, alpha: 0 });

    // Perpendicular ground axis (screen-space right-hand side of travel)
    const p = { x: -u.y, y: u.x };
    const halfL = 4.6;
    const halfW = 2.1;

    const quad = (
      cx: number, cy: number, hl: number, hw: number, dz: number,
    ): { x: number; y: number }[] => [
      { x: cx + u.x * hl + p.x * hw, y: cy + u.y * hl + p.y * hw - dz },
      { x: cx + u.x * hl - p.x * hw, y: cy + u.y * hl - p.y * hw - dz },
      { x: cx - u.x * hl - p.x * hw, y: cy - u.y * hl - p.y * hw - dz },
      { x: cx - u.x * hl + p.x * hw, y: cy - u.y * hl + p.y * hw - dz },
    ];

    // Ground shadow
    g.poly(quad(0.5, 1, halfL, halfW + 0.4, 0));
    g.fill({ color: 0x000000, alpha: 0.22 });
    // Body slab
    g.poly(quad(0, 0, halfL, halfW, 1.6));
    g.fill(color);
    // Cargo roof (rear 60%)
    g.poly(quad(-u.x * 1.6 * 0 - u.x * 1.4, -u.y * 1.4, halfL * 0.55, halfW * 0.8, 3));
    g.fill(offsetColor(color, 28));
    // Cab (front 30%) with windshield
    g.poly(quad(u.x * 3.1, u.y * 3.1, halfL * 0.28, halfW * 0.85, 2.6));
    g.fill(offsetColor(color, -18));
    g.poly(quad(u.x * 3.6, u.y * 3.6, halfL * 0.1, halfW * 0.7, 2.8));
    g.fill(0x9FC0D0);
    // Headlight at the nose
    g.circle(u.x * (halfL + 0.4), u.y * (halfL + 0.4) - 1.4, 0.6);
    g.fill({ color: 0xFFF2C0, alpha: 0.9 });

    const tex = renderer.generateTexture(g);
    g.destroy();
    return tex;
  }

  private rebuildRoadList(): void {
    this.roadTiles = [];
    const buildings = this.grid.getAllBuildings();
    for (const b of buildings) {
      const def = this.registry.get(b.defId);
      if (def?.isRoad) {
        this.roadTiles.push({ gx: b.gx, gy: b.gy });
      }
    }
  }

  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    if (quality === 'low') {
      this.container.visible = false;
      this.maxDots = 0;
    } else if (quality === 'medium') {
      this.container.visible = true;
      this.maxDots = 20;
      this.spawnInterval = 1200;
    } else {
      this.container.visible = true;
      this.maxDots = 40;
      this.spawnInterval = 800;
    }

    // Remove excess dots
    while (this.dots.length > this.maxDots) {
      const removed = this.dots.pop();
      if (!removed) break;
      this.container.removeChild(removed.sprite);
      removed.sprite.visible = false;
      this.dotPool.push(removed.sprite);
    }
  }

  update(dt: number): void {
    if (this.quality === 'low' || this.roadTiles.length === 0) return;

    this.spawnTimer += dt;

    // Scale traffic count with population
    const popScale = Math.min(1, this.state.population / 500);
    const targetDots = Math.floor(this.maxDots * popScale);

    // Spawn new dots
    if (this.spawnTimer > this.spawnInterval && this.dots.length < targetDots) {
      this.spawnTimer = 0;
      this.spawnDot();
    }

    // Update existing dots
    const dtSec = dt * 0.001;
    for (let i = this.dots.length - 1; i >= 0; i--) {
      const dot = this.dots[i];
      dot.progress += dot.speed * dtSec;

      if (dot.progress >= 1) {
        // Try to find next road tile to continue from the tile we just arrived at
        const nextRoad = this.findAdjacentRoad(dot.currentGx, dot.currentGy, dot);
        if (nextRoad) {
          dot.fromX = dot.toX;
          dot.fromY = dot.toY;
          const nextPos = gridToWorld(
            nextRoad.gx,
            nextRoad.gy,
            this.grid.getElevation(nextRoad.gx, nextRoad.gy)
          );
          dot.toX = nextPos.x;
          dot.toY = nextPos.y;
          dot.prevGx = dot.currentGx;
          dot.prevGy = dot.currentGy;
          dot.currentGx = nextRoad.gx;
          dot.currentGy = nextRoad.gy;
          dot.progress -= 1;
          this.applyHeading(dot);
        } else {
          // Remove dot — pool sprite and swap-and-pop
          this.container.removeChild(dot.sprite);
          dot.sprite.visible = false;
          this.dotPool.push(dot.sprite);
          this.dots[i] = this.dots[this.dots.length - 1];
          this.dots.pop();
          continue;
        }
      }

      // Interpolate position along the right-hand lane
      const t = dot.progress;
      dot.sprite.x = dot.fromX + (dot.toX - dot.fromX) * t + dot.laneX;
      dot.sprite.y = dot.fromY + (dot.toY - dot.fromY) * t + dot.laneY;
      dot.sprite.zIndex = movingDepth(
        dot.prevGx,
        dot.prevGy,
        dot.currentGx,
        dot.currentGy,
        t,
        WorldDepthPhase.VEHICLE,
        dot.id
      );
    }
  }

  private spawnDot(): void {
    if (this.roadTiles.length === 0) return;

    // Pick a random road tile
    const idx = Math.floor(Math.random() * this.roadTiles.length);
    const road = this.roadTiles[idx];

    // Find an adjacent road to travel to
    const target = this.findAdjacentRoad(road.gx, road.gy, null);
    if (!target) return;

    const roadElevation = this.grid.getElevation(road.gx, road.gy);
    const targetElevation = this.grid.getElevation(target.gx, target.gy);
    const fromPos = gridToWorld(road.gx, road.gy, roadElevation);
    const toPos = gridToWorld(target.gx, target.gy, targetElevation);

    const texIdx = Math.floor(Math.random() * this.carTextures.length);
    const dirIdx = directionIndex(target.gx - road.gx, target.gy - road.gy);
    let sprite: Sprite;
    if (this.dotPool.length > 0) {
      sprite = this.dotPool.pop()!;
      sprite.texture = this.carTextures[texIdx][dirIdx];
      sprite.visible = true;
    } else {
      sprite = new Sprite(this.carTextures[texIdx][dirIdx]);
      sprite.anchor.set(0.5);
    }
    sprite.x = fromPos.x;
    sprite.y = fromPos.y;
    const dotId = this.nextDotId++;
    sprite.zIndex = movingDepth(
      road.gx,
      road.gy,
      target.gx,
      target.gy,
      0,
      WorldDepthPhase.VEHICLE,
      dotId
    );

    const dot: TrafficDot = {
      id: dotId,
      sprite,
      colorIdx: texIdx,
      fromX: fromPos.x,
      fromY: fromPos.y,
      toX: toPos.x,
      toY: toPos.y,
      laneX: 0,
      laneY: 0,
      progress: 0,
      speed: 0.4 + Math.random() * 0.3, // traverse one tile in ~2-3 seconds
      currentGx: target.gx,
      currentGy: target.gy,
      prevGx: road.gx,
      prevGy: road.gy,
    };
    this.applyHeading(dot);

    this.dots.push(dot);
    this.container.addChild(sprite);
    // removeChild() automatically detaches pooled sprites from a RenderLayer.
    // Every add, including pool reuse, must therefore attach again.
    this.worldDepth.attach(sprite);
  }

  /** Face the sprite along its travel direction and set the lane offset. */
  private applyHeading(dot: TrafficDot): void {
    const dirIdx = directionIndex(
      dot.currentGx - dot.prevGx,
      dot.currentGy - dot.prevGy,
    );
    dot.sprite.texture = this.carTextures[dot.colorIdx][dirIdx];
    const u = DIR_VECTORS[dirIdx];
    // Right-hand lane: perpendicular of the travel vector in screen space
    dot.laneX = -u.y * 3;
    dot.laneY = u.x * 3;
  }

  private findAdjacentRoad(
    gx: number, gy: number,
    exclude: TrafficDot | null
  ): { gx: number; gy: number } | null {
    const neighbors = [
      { gx: gx, gy: gy - 1 },
      { gx: gx + 1, gy: gy },
      { gx: gx, gy: gy + 1 },
      { gx: gx - 1, gy: gy },
    ];

    const valid: { gx: number; gy: number }[] = [];
    for (const n of neighbors) {
      const building = this.grid.getMasterBuilding(n.gx, n.gy);
      if (!building) continue;
      const def = this.registry.get(building.defId);
      if (!def?.isRoad) continue;
      if (!canTraverseRoadEdge(this.grid, gx, gy, n.gx, n.gy)) continue;
      // Avoid going back to where we came from
      if (exclude && n.gx === exclude.prevGx && n.gy === exclude.prevGy) continue;
      valid.push(n);
    }

    if (valid.length === 0) return null;
    return valid[Math.floor(Math.random() * valid.length)];
  }
}
