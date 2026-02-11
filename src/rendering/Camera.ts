import { MIN_ZOOM, MAX_ZOOM, ZOOM_SPEED } from '../constants';
import { EventBus } from '../core/EventBus';

export class Camera {
  x: number = 0;
  y: number = 0;
  zoom: number = 1;
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  constructor(private events: EventBus) {}

  setScreenSize(w: number, h: number): void {
    this.screenWidth = w;
    this.screenHeight = h;
  }

  pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.emitMoved();
  }

  zoomAt(screenX: number, screenY: number, delta: number): void {
    const oldZoom = this.zoom;
    const zoomFactor = delta > 0 ? (1 - ZOOM_SPEED) : (1 + ZOOM_SPEED);
    this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * zoomFactor));

    // Zoom toward cursor
    const scale = this.zoom / oldZoom;
    this.x = screenX - (screenX - this.x) * scale;
    this.y = screenY - (screenY - this.y) * scale;

    this.emitMoved();
  }

  centerOn(worldX: number, worldY: number): void {
    this.x = this.screenWidth / 2 - worldX * this.zoom;
    this.y = this.screenHeight / 2 - worldY * this.zoom;
    this.emitMoved();
  }

  getViewport(): { left: number; top: number; right: number; bottom: number } {
    return {
      left: -this.x / this.zoom,
      top: -this.y / this.zoom,
      right: (-this.x + this.screenWidth) / this.zoom,
      bottom: (-this.y + this.screenHeight) / this.zoom,
    };
  }

  private emitMoved(): void {
    this.events.emit('camera:moved', { x: this.x, y: this.y, zoom: this.zoom });
  }
}
