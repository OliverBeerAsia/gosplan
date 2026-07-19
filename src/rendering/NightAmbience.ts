import { Container, Sprite, Texture } from 'pixi.js';
import { Grid } from '../grid/Grid';
import { gridToWorld } from './IsometricRenderer';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { GraphicsQuality } from '../core/GameState';

/**
 * World-space day/night ambience.
 *
 * A single multiply-blend sprite covering the world plane darkens terrain,
 * buildings, props, and vehicles as the shared day cycle approaches night.
 * Window lights and lamp pools render above this layer, so at night they
 * read as true light sources instead of bright decals on a daytime scene.
 *
 * The cycle constant matches WindowLightRenderer and AmbienceOverlay
 * (now * 0.000045), keeping every night system in phase.
 */

const DAY_TINT = 0xFFFFFF;
const DUSK_TINT = 0xF0C08C; // low amber sun
const NIGHT_TINT = 0x7883A6; // moonlit blue-grey, ~52% luminance

function mixColor(from: number, to: number, amount: number): number {
  const t = Math.max(0, Math.min(1, amount));
  const fr = (from >> 16) & 0xFF; const fg = (from >> 8) & 0xFF; const fb = from & 0xFF;
  const tr = (to >> 16) & 0xFF; const tg = (to >> 8) & 0xFF; const tb = to & 0xFF;
  const r = Math.round(fr + (tr - fr) * t);
  const g = Math.round(fg + (tg - fg) * t);
  const b = Math.round(fb + (tb - fb) * t);
  return (r << 16) | (g << 8) | b;
}

/** Shared day factor: 0 = deep night, 1 = full day. */
export function getDayFactor(nowMs: number): number {
  const cycle = (nowMs * 0.000045) % (Math.PI * 2);
  return (Math.sin(cycle) + 1) * 0.5;
}

/** Ambient multiply tint for a given day factor. */
export function getAmbientTint(dayFactor: number): number {
  if (dayFactor >= 0.72) return DAY_TINT;
  if (dayFactor >= 0.45) {
    // Late afternoon into dusk: white toward amber
    return mixColor(DUSK_TINT, DAY_TINT, (dayFactor - 0.45) / 0.27);
  }
  if (dayFactor >= 0.2) {
    // Dusk into night: amber toward blue-grey
    return mixColor(NIGHT_TINT, DUSK_TINT, (dayFactor - 0.2) / 0.25);
  }
  return NIGHT_TINT;
}

export class NightAmbience {
  readonly container: Container;
  private veil: Sprite;
  private quality: GraphicsQuality = 'high';
  private frame = 0;

  constructor(grid: Grid) {
    this.container = new Container();

    // World-plane bounds with generous margins for elevation headroom,
    // building heights, and smoke columns.
    const size = grid.size;
    const left = gridToWorld(0, size - 1).x - TILE_HALF_W;
    const right = gridToWorld(size - 1, 0).x + TILE_HALF_W;
    const top = gridToWorld(0, 0).y - TILE_HALF_H;
    const bottom = gridToWorld(size - 1, size - 1).y + TILE_HALF_H;
    const margin = 360;

    this.veil = new Sprite(Texture.WHITE);
    this.veil.x = left - margin;
    this.veil.y = top - margin;
    this.veil.width = right - left + margin * 2;
    this.veil.height = bottom - top + margin * 2;
    this.veil.blendMode = 'multiply';
    this.veil.tint = DAY_TINT;
    this.veil.visible = false;
    this.container.addChild(this.veil);
  }

  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    // The ambience layer is a single quad; it stays on at every tier so low
    // quality does not silently revert the world to permanent noon.
    void this.quality;
  }

  /** Advance the ambience toward the cycle's current tint. Call per frame. */
  update(nowMs: number): void {
    // Tint changes are slow; every 3rd frame is imperceptible and saves work.
    if (++this.frame % 3 !== 0) return;
    const tint = getAmbientTint(getDayFactor(nowMs));
    if (tint === DAY_TINT) {
      if (this.veil.visible) this.veil.visible = false;
      return;
    }
    if (!this.veil.visible) this.veil.visible = true;
    if (this.veil.tint !== tint) this.veil.tint = tint;
  }
}
