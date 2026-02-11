import { EventBus } from '../core/EventBus';
import { Camera } from '../rendering/Camera';
import { BuildingPlacer } from '../grid/BuildingPlacer';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { Grid } from '../grid/Grid';
import { OverlayRenderer } from '../rendering/OverlayRenderer';
import { screenToGrid } from '../rendering/IsometricRenderer';
import { GameStateData } from '../core/GameState';
import { CameraController } from './CameraController';

export type ToolType = 'select' | 'build' | 'demolish';

export class ToolController {
  currentTool: ToolType = 'select';
  currentBuildingId: string | null = null;
  private hoverGx = -1;
  private hoverGy = -1;

  constructor(
    private events: EventBus,
    private camera: Camera,
    private cameraController: CameraController,
    private grid: Grid,
    private placer: BuildingPlacer,
    private registry: BuildingRegistry,
    private overlay: OverlayRenderer,
    private state: GameStateData,
    private canvas: HTMLCanvasElement
  ) {
    this.setupEvents();
  }

  setTool(tool: ToolType, buildingId?: string): void {
    this.currentTool = tool;
    this.currentBuildingId = buildingId ?? null;
    this.overlay.clearGhost();
    this.overlay.clearSelection();
    this.events.emit('tool:selected', { tool, buildingId });
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const { gx, gy } = screenToGrid(
        e.clientX, e.clientY,
        this.camera.x, this.camera.y, this.camera.zoom
      );
      if (gx !== this.hoverGx || gy !== this.hoverGy) {
        this.hoverGx = gx;
        this.hoverGy = gy;
        this.onHover(gx, gy);
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.cameraController.dragging) return;
      if (e.shiftKey) return; // shift+click is camera pan
      const { gx, gy } = screenToGrid(
        e.clientX, e.clientY,
        this.camera.x, this.camera.y, this.camera.zoom
      );
      this.onClick(gx, gy);
    });
  }

  private onHover(gx: number, gy: number): void {
    if (this.currentTool === 'build' && this.currentBuildingId) {
      const valid = this.placer.canPlace(this.currentBuildingId, gx, gy);
      this.overlay.showGhost(this.currentBuildingId, gx, gy, valid);
    } else if (this.currentTool === 'demolish') {
      if (this.grid.inBounds(gx, gy)) {
        const cell = this.grid.getCell(gx, gy);
        if (cell?.building) {
          this.overlay.showGhost('', gx, gy, false);
        } else {
          this.overlay.clearGhost();
        }
      }
    } else {
      this.overlay.clearGhost();
    }
  }

  private onClick(gx: number, gy: number): void {
    if (!this.grid.inBounds(gx, gy)) return;

    if (this.currentTool === 'build' && this.currentBuildingId) {
      const def = this.registry.get(this.currentBuildingId);
      if (!def) return;

      if (this.state.budget < def.cost) {
        this.events.emit('notification', {
          message: 'Insufficient rubles, Comrade!',
          type: 'error'
        });
        return;
      }

      const building = this.placer.place(this.currentBuildingId, gx, gy);
      if (building) {
        this.state.budget -= def.cost;
        this.events.emit('budget:changed', { budget: this.state.budget });
        this.overlay.clearGhost();
        // Re-show ghost at current position
        this.onHover(gx, gy);
      }
    } else if (this.currentTool === 'demolish') {
      const cell = this.grid.getCell(gx, gy);
      if (cell?.building) {
        const def = this.registry.get(cell.building.defId);
        if (def) {
          // Refund 50% of cost
          this.state.budget += Math.floor(def.cost * 0.5);
          this.events.emit('budget:changed', { budget: this.state.budget });
        }
        this.placer.demolish(gx, gy);
        this.overlay.clearGhost();
      }
    } else if (this.currentTool === 'select') {
      const building = this.grid.getMasterBuilding(gx, gy);
      if (building) {
        this.overlay.showSelection(building.gx, building.gy);
        this.events.emit('building:selected', { building });
      } else {
        this.overlay.clearSelection();
        this.events.emit('building:selected', null);
      }
    }
  }
}
