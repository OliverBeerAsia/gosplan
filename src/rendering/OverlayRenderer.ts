import { Container, Graphics, Sprite } from 'pixi.js';
import { TextureFactory } from '../graphics/TextureFactory';
import { gridToWorld } from './IsometricRenderer';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { GraphicsQuality } from '../core/GameState';

export class OverlayRenderer {
  readonly container: Container;
  private ghostSprites: Array<Sprite | Graphics> = [];
  private zoneGhostSprites: Array<Sprite | Graphics> = [];
  private powerOverlayContainer: Container;
  private serviceOverlayContainer: Container;
  private selectionSprites: Sprite[] = [];
  private showPowerOverlay = false;
  private showServiceOverlay = false;
  private quality: GraphicsQuality = 'high';
  private autoHidePowerTimer: number | null = null;

  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private textures: TextureFactory,
    events?: EventBus
  ) {
    this.container = new Container();
    this.powerOverlayContainer = new Container();
    this.serviceOverlayContainer = new Container();
    this.powerOverlayContainer.visible = false;
    this.serviceOverlayContainer.visible = false;
    this.container.addChild(this.powerOverlayContainer);
    this.container.addChild(this.serviceOverlayContainer);

    const refreshSemanticOverlays = (): void => {
      if (this.powerOverlayContainer.visible) this.updatePowerOverlay();
      if (this.serviceOverlayContainer.visible) this.updateServiceOverlay();
    };

    events?.on('building:placed', refreshSemanticOverlays);
    events?.on('building:demolished', refreshSemanticOverlays);
    events?.on('zone:changed', refreshSemanticOverlays);
    events?.on('power:updated', refreshSemanticOverlays);
    events?.on('service:updated', refreshSemanticOverlays);
    events?.on('game:loaded', refreshSemanticOverlays);

    events?.on('overlay:service:toggle', () => {
      this.toggleServiceOverlay();
    });

    events?.on('graphics:quality:changed', ({ quality }) => {
      this.setQuality(quality);
    });
  }

  showGhost(buildingId: string, gx: number, gy: number, valid: boolean): void {
    this.clearGhost();
    this.clearZoneGhost();

    const def = this.registry.get(buildingId);
    if (!def) return;

    const texKey = valid ? 'ground_highlight' : 'ground_invalid';

    for (let dx = 0; dx < def.width; dx++) {
      for (let dy = 0; dy < def.height; dy++) {
        const elevation = this.grid.getElevation(gx + dx, gy + dy);
        const pos = gridToWorld(gx + dx, gy + dy, elevation);
        const sprite = new Sprite(this.textures.get(texKey));
        sprite.x = pos.x - TILE_HALF_W;
        sprite.y = pos.y - TILE_HALF_H;
        sprite.alpha = 0.7;
        this.container.addChild(sprite);
        this.ghostSprites.push(sprite);
      }
    }

    // Also show the building texture as ghost
    if (this.textures.has(buildingId)) {
      const buildingTex = this.textures.get(buildingId);
      const ghostBuilding = new Sprite(buildingTex);
      const centerGx = gx + def.width / 2;
      const centerGy = gy + def.height / 2;
      const elevation = this.grid.getElevation(gx, gy);
      const pos = gridToWorld(centerGx, centerGy, elevation);
      ghostBuilding.anchor.set(0.5, 1);
      ghostBuilding.x = pos.x;
      ghostBuilding.y = pos.y + TILE_HALF_H;
      ghostBuilding.alpha = valid ? 0.62 : 0.46;
      ghostBuilding.tint = valid ? 0xFFFFFF : 0xF4A8A8;
      this.container.addChild(ghostBuilding);
      this.ghostSprites.push(ghostBuilding);
    }
  }

  clearGhost(): void {
    for (const s of this.ghostSprites) {
      this.container.removeChild(s);
      s.destroy();
    }
    this.ghostSprites = [];
  }

  showZoneGhost(gx: number, gy: number, zone: 'housing' | 'industry' | 'civic' | 'green'): void {
    this.clearGhost();
    this.clearZoneGhost();

    if (!this.grid.inBounds(gx, gy)) return;

    const texKey = `zone_${zone}`;
    if (!this.textures.has(texKey)) return;

    const pos = gridToWorld(gx, gy, this.grid.getElevation(gx, gy));
    const sprite = new Sprite(this.textures.get(texKey));
    sprite.x = pos.x - TILE_HALF_W;
    sprite.y = pos.y - TILE_HALF_H;
    sprite.alpha = 0.8;
    this.container.addChild(sprite);
    this.zoneGhostSprites.push(sprite);
  }

  clearZoneGhost(): void {
    for (const s of this.zoneGhostSprites) {
      this.container.removeChild(s);
      s.destroy();
    }
    this.zoneGhostSprites = [];
  }

  showTileGhost(
    gx: number,
    gy: number,
    textureKey: 'ground_highlight' | 'ground_invalid' = 'ground_invalid',
    width = 1,
    height = 1
  ): void {
    this.clearGhost();
    this.clearZoneGhost();

    if (!this.grid.inBounds(gx, gy)) return;
    if (!this.textures.has(textureKey)) return;

    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        if (!this.grid.inBounds(gx + dx, gy + dy)) continue;
        const pos = gridToWorld(
          gx + dx,
          gy + dy,
          this.grid.getElevation(gx + dx, gy + dy)
        );
        const sprite = new Sprite(this.textures.get(textureKey));
        sprite.x = pos.x - TILE_HALF_W;
        sprite.y = pos.y - TILE_HALF_H;
        sprite.alpha = 0.7;
        this.container.addChild(sprite);
        this.zoneGhostSprites.push(sprite);
      }
    }
  }

  /** Clear-zone preview uses an X hatch so its meaning does not depend on colour. */
  showClearZoneGhost(gx: number, gy: number): void {
    this.clearGhost();
    this.clearZoneGhost();
    if (!this.grid.inBounds(gx, gy)) return;

    const pos = gridToWorld(gx, gy, this.grid.getElevation(gx, gy));
    const marker = new Graphics();
    marker.poly([
      { x: TILE_HALF_W, y: 0 },
      { x: TILE_HALF_W * 2, y: TILE_HALF_H },
      { x: TILE_HALF_W, y: TILE_HALF_H * 2 },
      { x: 0, y: TILE_HALF_H },
    ]).fill({ color: 0x5A1010, alpha: 0.36 }).stroke({ color: 0xFFE4B5, width: 1.5, alpha: 0.9 });
    marker.moveTo(14, 7).lineTo(50, 25);
    marker.moveTo(50, 7).lineTo(14, 25);
    marker.stroke({ color: 0xFFE4B5, width: 2.5, alpha: 0.95 });
    marker.x = pos.x - TILE_HALF_W;
    marker.y = pos.y - TILE_HALF_H;
    this.container.addChild(marker);
    this.zoneGhostSprites.push(marker);
  }

  showSelection(gx: number, gy: number, width = 1, height = 1): void {
    this.clearSelection();
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        if (!this.grid.inBounds(gx + dx, gy + dy)) continue;
        const pos = gridToWorld(
          gx + dx,
          gy + dy,
          this.grid.getElevation(gx + dx, gy + dy)
        );
        const sprite = new Sprite(this.textures.get('ground_highlight'));
        sprite.x = pos.x - TILE_HALF_W;
        sprite.y = pos.y - TILE_HALF_H;
        sprite.alpha = 0.5;
        this.container.addChild(sprite);
        this.selectionSprites.push(sprite);
      }
    }
  }

  clearSelection(): void {
    for (const sprite of this.selectionSprites) {
      this.container.removeChild(sprite);
      sprite.destroy();
    }
    this.selectionSprites = [];
  }

  togglePowerOverlay(show?: boolean): void {
    this.showPowerOverlay = show ?? !this.showPowerOverlay;
    this.powerOverlayContainer.visible = this.showPowerOverlay;
    if (this.showPowerOverlay) {
      this.updatePowerOverlay();
    }
  }

  updatePowerOverlay(): void {
    this.powerOverlayContainer.removeChildren();
    if (!this.powerOverlayContainer.visible) return;

    const size = this.grid.size;
    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell || !cell.building) continue;
        if (cell.building.powered) {
          const pos = gridToWorld(gx, gy, this.grid.getElevation(gx, gy));
          const sprite = new Sprite(this.textures.get('power_overlay'));
          sprite.x = pos.x - TILE_HALF_W;
          sprite.y = pos.y - TILE_HALF_H;
          sprite.alpha = this.quality === 'high' ? 0.42 : 0.32;
          this.powerOverlayContainer.addChild(sprite);
        }
      }
    }
  }

  toggleServiceOverlay(show?: boolean): void {
    this.showServiceOverlay = show ?? !this.showServiceOverlay;
    this.serviceOverlayContainer.visible = this.showServiceOverlay;
    if (this.showServiceOverlay) {
      this.updateServiceOverlay();
    }
  }

  updateServiceOverlay(): void {
    this.serviceOverlayContainer.removeChildren();
    if (!this.showServiceOverlay) return;
    if (!this.textures.has('service_overlay')) return;

    const size = this.grid.size;
    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell || cell.serviceCoverage <= 0) continue;
        if (cell.terrain === 'water' || cell.terrain === 'hill') continue;

        const pos = gridToWorld(gx, gy, this.grid.getElevation(gx, gy));
        const sprite = new Sprite(this.textures.get('service_overlay'));
        sprite.x = pos.x - TILE_HALF_W;
        sprite.y = pos.y - TILE_HALF_H;
        const alphaScale = this.quality === 'high' ? 1 : this.quality === 'medium' ? 0.85 : 0.7;
        sprite.alpha = Math.min(0.85, 0.12 + cell.serviceCoverage / 120) * alphaScale;
        this.serviceOverlayContainer.addChild(sprite);
      }
    }
  }

  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    if (this.showPowerOverlay) this.updatePowerOverlay();
    if (this.showServiceOverlay) this.updateServiceOverlay();
  }

  flashPowerOverlay(durationMs: number = 3000): void {
    if (this.showPowerOverlay) return; // already visible via manual toggle
    this.showPowerOverlay = true;
    this.powerOverlayContainer.visible = true;
    this.updatePowerOverlay();
    this.showPowerOverlay = false;
    if (this.autoHidePowerTimer !== null) {
      window.clearTimeout(this.autoHidePowerTimer);
    }
    this.autoHidePowerTimer = window.setTimeout(() => {
      if (!this.showPowerOverlay) {
        this.powerOverlayContainer.visible = false;
      }
      this.autoHidePowerTimer = null;
    }, durationMs);
  }
}
