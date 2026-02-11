import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { Camera } from '../rendering/Camera';
import { EventBus } from '../core/EventBus';
import { PALETTE } from '../graphics/SovietPalette';

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
  private size = 150;

  constructor(
    container: HTMLElement,
    private grid: Grid,
    private registry: BuildingRegistry,
    private camera: Camera,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'minimap';

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d')!;

    this.el.appendChild(this.canvas);
    container.appendChild(this.el);

    // Click to move camera
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width * this.grid.size;
      const my = (e.clientY - rect.top) / rect.height * this.grid.size;
      // Convert minimap coords to grid coords (simple mapping)
      const gx = Math.floor(mx);
      const gy = Math.floor(my);
      // Convert to world and center camera
      const wx = (gx - gy) * 32;
      const wy = (gx + gy) * 16;
      this.camera.centerOn(wx, wy);
    });

    events.on('tick', () => this.render());
    events.on('building:placed', () => this.render());
    events.on('building:demolished', () => this.render());
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

        if (cell.terrain === 'water') {
          ctx.fillStyle = hexToRgb(PALETTE.WATER);
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
        }
      }
    }
  }
}
