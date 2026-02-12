import { Container, Sprite } from 'pixi.js';
import { TextureFactory } from '../graphics/TextureFactory';
import { gridToWorld } from './IsometricRenderer';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';

export class OverlayRenderer {
  readonly container: Container;
  private ghostSprites: Sprite[] = [];
  private zoneGhostSprites: Sprite[] = [];
  private powerOverlayContainer: Container;
  private serviceOverlayContainer: Container;
  private selectionSprite: Sprite | null = null;
  private showPowerOverlay = false;
  private showServiceOverlay = false;

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

    events?.on('service:updated', () => {
      if (this.showServiceOverlay) {
        this.updateServiceOverlay();
      }
    });

    events?.on('overlay:service:toggle', () => {
      this.toggleServiceOverlay();
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
        const pos = gridToWorld(gx + dx, gy + dy, 0);
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
      const pos = gridToWorld(centerGx, centerGy, 0);
      ghostBuilding.anchor.set(0.5, 1);
      ghostBuilding.x = pos.x;
      ghostBuilding.y = pos.y + TILE_HALF_H;
      ghostBuilding.alpha = valid ? 0.6 : 0.3;
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

    const pos = gridToWorld(gx, gy, 0);
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

  showTileGhost(gx: number, gy: number, textureKey: 'ground_highlight' | 'ground_invalid' = 'ground_invalid'): void {
    this.clearGhost();
    this.clearZoneGhost();

    if (!this.grid.inBounds(gx, gy)) return;
    if (!this.textures.has(textureKey)) return;

    const pos = gridToWorld(gx, gy, 0);
    const sprite = new Sprite(this.textures.get(textureKey));
    sprite.x = pos.x - TILE_HALF_W;
    sprite.y = pos.y - TILE_HALF_H;
    sprite.alpha = 0.7;
    this.container.addChild(sprite);
    this.zoneGhostSprites.push(sprite);
  }

  showSelection(gx: number, gy: number): void {
    this.clearSelection();
    const pos = gridToWorld(gx, gy, 0);
    this.selectionSprite = new Sprite(this.textures.get('ground_highlight'));
    this.selectionSprite.x = pos.x - TILE_HALF_W;
    this.selectionSprite.y = pos.y - TILE_HALF_H;
    this.selectionSprite.alpha = 0.5;
    this.container.addChild(this.selectionSprite);
  }

  clearSelection(): void {
    if (this.selectionSprite) {
      this.container.removeChild(this.selectionSprite);
      this.selectionSprite.destroy();
      this.selectionSprite = null;
    }
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
    if (!this.showPowerOverlay) return;

    const size = this.grid.size;
    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell || !cell.building) continue;
        if (cell.building.powered) {
          const pos = gridToWorld(gx, gy, 0);
          const sprite = new Sprite(this.textures.get('power_overlay'));
          sprite.x = pos.x - TILE_HALF_W;
          sprite.y = pos.y - TILE_HALF_H;
          sprite.alpha = 0.4;
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

        const pos = gridToWorld(gx, gy, 0);
        const sprite = new Sprite(this.textures.get('service_overlay'));
        sprite.x = pos.x - TILE_HALF_W;
        sprite.y = pos.y - TILE_HALF_H;
        sprite.alpha = Math.min(0.85, 0.12 + cell.serviceCoverage / 120);
        this.serviceOverlayContainer.addChild(sprite);
      }
    }
  }
}
