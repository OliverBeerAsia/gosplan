import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { Camera } from '../rendering/Camera';
import { EventBus } from '../core/EventBus';
import { PALETTE } from '../graphics/SovietPalette';
import { TILE_HALF_W, TILE_HALF_H } from '../constants';

function hexToRgb(hex: number): string {
  const r = (hex >> 16) & 0xFF;
  const g = (hex >> 8) & 0xFF;
  const b = hex & 0xFF;
  return `rgb(${r},${g},${b})`;
}

export class Minimap {
  private el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size = 180;
  private isDragging = false;

  constructor(
    container: HTMLElement,
    private grid: Grid,
    private registry: BuildingRegistry,
    private camera: Camera,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'minimap';
    this.el.className = 'panel-shell panel-shell--red';

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d')!;

    this.el.appendChild(this.canvas);
    container.appendChild(this.el);

    // Drag to navigate
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.navigateToMinimapPos(e);
    });
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.navigateToMinimapPos(e);
      }
    });
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    events.on('tick', () => this.render());
    events.on('building:placed', () => this.render());
    events.on('building:demolished', () => this.render());
    events.on('camera:moved', () => this.render());
    events.on('terrain:changed', () => this.render());
    events.on('zone:changed', () => this.render());
    events.on('power:updated', () => this.render());
    events.on('service:updated', () => this.render());
    events.on('game:loaded', () => this.render());

    this.render();
  }

  private navigateToMinimapPos(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width * this.grid.size;
    const my = (e.clientY - rect.top) / rect.height * this.grid.size;
    const gx = Math.floor(mx);
    const gy = Math.floor(my);
    const wx = (gx - gy) * TILE_HALF_W;
    const wy = (gx + gy) * TILE_HALF_H;
    this.camera.centerOn(wx, wy);
  }

  render(): void {
    const ctx = this.ctx;
    const gs = this.grid.size;
    const pixPerCell = this.size / gs;

    ctx.fillStyle = hexToRgb(PALETTE.GROUND);
    ctx.fillRect(0, 0, this.size, this.size);

    for (let gx = 0; gx < gs; gx++) {
      for (let gy = 0; gy < gs; gy++) {
        const cell = this.grid.getCell(gx, gy);
        if (!cell) continue;

        if (cell.terrain !== 'ground') {
          let terrainColor: number;
          switch (cell.terrain) {
            case 'water': terrainColor = PALETTE.WATER; break;
            case 'forest': terrainColor = PALETTE.FOREST_GREEN; break;
            case 'hill': terrainColor = PALETTE.HILL_GREY; break;
            case 'dirt': terrainColor = PALETTE.DIRT_BROWN; break;
            default: terrainColor = PALETTE.GROUND;
          }
          ctx.fillStyle = hexToRgb(terrainColor);
          ctx.fillRect(gx * pixPerCell, gy * pixPerCell, pixPerCell, pixPerCell);
        }

        if (cell.building && cell.isMaster) {
          const def = this.registry.get(cell.building.defId);
          if (!def) continue;

          let color: number;
          switch (def.category) {
            case 'residential': color = PALETTE.CONCRETE_LIGHT; break;
            case 'industrial': color = PALETTE.STEEL_BLUE; break;
            case 'government': color = PALETTE.RED; break;
            case 'infrastructure': color = def.id === 'road' ? PALETTE.ROAD_ASPHALT : PALETTE.POWER_LINE_METAL; break;
            case 'decoration': color = PALETTE.GREEN; break;
            default: color = PALETTE.CONCRETE_MID;
          }

          ctx.fillStyle = hexToRgb(color);
          ctx.fillRect(
            gx * pixPerCell, gy * pixPerCell,
            def.width * pixPerCell, def.height * pixPerCell
          );
        } else if (cell.zone !== 'none') {
          let zoneColor = 0xFFFFFF;
          switch (cell.zone) {
            case 'housing': zoneColor = 0x4CAF50; break;
            case 'industry': zoneColor = 0xFF9800; break;
            case 'civic': zoneColor = 0x03A9F4; break;
            case 'green': zoneColor = 0x8BC34A; break;
          }
          ctx.fillStyle = hexToRgb(zoneColor);
          ctx.globalAlpha = 0.6;
          ctx.fillRect(gx * pixPerCell, gy * pixPerCell, pixPerCell, pixPerCell);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Draw viewport rectangle
    this.drawViewport(ctx, gs, pixPerCell);
  }

  private drawViewport(ctx: CanvasRenderingContext2D, gs: number, pixPerCell: number): void {
    const vp = this.camera.getViewport();

    // Convert world coords to grid coords (inverse of gridToWorld)
    // wx = (gx - gy) * TILE_HALF_W
    // wy = (gx + gy) * TILE_HALF_H
    // So: gx = (wx/TILE_HALF_W + wy/TILE_HALF_H) / 2
    //     gy = (wy/TILE_HALF_H - wx/TILE_HALF_W) / 2

    const toGrid = (wx: number, wy: number) => ({
      gx: (wx / TILE_HALF_W + wy / TILE_HALF_H) / 2,
      gy: (wy / TILE_HALF_H - wx / TILE_HALF_W) / 2,
    });

    const tl = toGrid(vp.left, vp.top);
    const tr = toGrid(vp.right, vp.top);
    const bl = toGrid(vp.left, vp.bottom);
    const br = toGrid(vp.right, vp.bottom);

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tl.gx * pixPerCell, tl.gy * pixPerCell);
    ctx.lineTo(tr.gx * pixPerCell, tr.gy * pixPerCell);
    ctx.lineTo(br.gx * pixPerCell, br.gy * pixPerCell);
    ctx.lineTo(bl.gx * pixPerCell, bl.gy * pixPerCell);
    ctx.closePath();
    ctx.stroke();
  }
}
