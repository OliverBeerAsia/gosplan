import { EventBus } from '../core/EventBus';
import { Camera } from '../rendering/Camera';
import { BuildingPlacer } from '../grid/BuildingPlacer';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { Grid } from '../grid/Grid';
import { OverlayRenderer } from '../rendering/OverlayRenderer';
import { screenToGrid } from '../rendering/IsometricRenderer';
import { GameStateData } from '../core/GameState';
import { CameraController } from './CameraController';
import { UndoManager } from '../core/UndoManager';
import { ZoneType } from '../grid/Cell';

export type ToolType = 'select' | 'build' | 'demolish' | 'zone';

export class ToolController {
  currentTool: ToolType = 'select';
  currentBuildingId: string | null = null;
  currentZone: ZoneType | null = null;
  lastBuildingId: string | null = null;
  private hoverGx = -1;
  private hoverGy = -1;

  // Drag-to-build state
  private isDragging = false;
  private dragPlacedCells = new Set<string>();

  undoManager: UndoManager;

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
    this.undoManager = new UndoManager(grid, placer, registry, state, events);
    this.setupEvents();
  }

  setTool(tool: ToolType, buildingId?: string, zone?: ZoneType): void {
    this.currentTool = tool;
    this.currentBuildingId = buildingId ?? null;
    this.currentZone = zone ?? null;

    if (tool === 'build' && buildingId) {
      this.lastBuildingId = buildingId;
    }

    this.overlay.clearGhost();
    this.overlay.clearZoneGhost();
    this.overlay.clearSelection();
    this.events.emit('tool:selected', { tool, buildingId, zone });
  }

  private getGridPos(e: MouseEvent): { gx: number; gy: number } {
    return screenToGrid(
      e.clientX, e.clientY,
      this.camera.x, this.camera.y, this.camera.zoom
    );
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const { gx, gy } = this.getGridPos(e);
      if (gx !== this.hoverGx || gy !== this.hoverGy) {
        this.hoverGx = gx;
        this.hoverGy = gy;
        this.onHover(gx, gy);

        if (this.isDragging) {
          this.onDragMove(gx, gy);
        }
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.shiftKey) return;
      if (this.cameraController.dragging) return;

      const { gx, gy } = this.getGridPos(e);

      if (this.currentTool === 'build' && this.currentBuildingId) {
        const def = this.registry.get(this.currentBuildingId);
        if (def && def.width === 1 && def.height === 1) {
          this.isDragging = true;
          this.dragPlacedCells.clear();
          this.onDragMove(gx, gy);
          return;
        }
      }

      if (this.currentTool === 'demolish' || this.currentTool === 'zone') {
        this.isDragging = true;
        this.dragPlacedCells.clear();
        this.onDragMove(gx, gy);
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        if (this.isDragging) {
          this.isDragging = false;
          this.dragPlacedCells.clear();
          return;
        }

        if (!this.cameraController.dragging && !e.shiftKey) {
          const { gx, gy } = this.getGridPos(e);
          this.onClick(gx, gy);
        }
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.currentTool === 'build' || this.currentTool === 'demolish' || this.currentTool === 'zone') {
        e.preventDefault();
        e.stopPropagation();
        this.setTool('select');
      }
    });
  }

  private onDragMove(gx: number, gy: number): void {
    const key = `${gx},${gy}`;
    if (this.dragPlacedCells.has(key)) return;

    if (this.currentTool === 'build' && this.currentBuildingId) {
      this.tryPlace(gx, gy);
      this.dragPlacedCells.add(key);
    } else if (this.currentTool === 'demolish') {
      this.tryDemolish(gx, gy);
      this.dragPlacedCells.add(key);
    } else if (this.currentTool === 'zone') {
      this.tryPaintZone(gx, gy);
      this.dragPlacedCells.add(key);
    }
  }

  private onHover(gx: number, gy: number): void {
    if (this.currentTool === 'build' && this.currentBuildingId) {
      const valid = this.placer.canPlace(this.currentBuildingId, gx, gy);
      this.overlay.showGhost(this.currentBuildingId, gx, gy, valid);
      return;
    }

    if (this.currentTool === 'demolish') {
      const cell = this.grid.getCell(gx, gy);
      if (cell && (cell.building || cell.terrain === 'forest')) {
        this.overlay.showTileGhost(gx, gy, 'ground_invalid');
      } else {
        this.overlay.clearGhost();
        this.overlay.clearZoneGhost();
      }
      return;
    }

    if (this.currentTool === 'zone' && this.currentZone && this.currentZone !== 'none') {
      this.overlay.showZoneGhost(gx, gy, this.currentZone);
      return;
    }

    this.overlay.clearGhost();
    this.overlay.clearZoneGhost();
  }

  private tryPlace(gx: number, gy: number): boolean {
    if (!this.grid.inBounds(gx, gy)) return false;
    if (!this.currentBuildingId) return false;

    const def = this.registry.get(this.currentBuildingId);
    if (!def) return false;

    if (this.state.budget < def.cost) {
      this.events.emit('notification', {
        message: 'Insufficient rubles, Comrade!',
        type: 'error'
      });
      return false;
    }

    const building = this.placer.place(this.currentBuildingId, gx, gy);
    if (building) {
      this.state.budget -= def.cost;
      this.events.emit('budget:changed', { budget: this.state.budget });
      this.overlay.clearGhost();
      this.onHover(gx, gy);

      this.undoManager.pushAction({
        type: 'place',
        buildingDefId: def.id,
        gx, gy,
        cost: def.cost,
        buildingId: building.id,
      });
      return true;
    }
    return false;
  }

  private tryDemolish(gx: number, gy: number): boolean {
    if (!this.grid.inBounds(gx, gy)) return false;
    const cell = this.grid.getCell(gx, gy);
    if (!cell) return false;

    if (cell.building) {
      const masterBuilding = this.grid.getMasterBuilding(gx, gy);
      if (!masterBuilding) return false;
      const def = this.registry.get(masterBuilding.defId);
      if (def) {
        const refund = Math.floor(def.cost * 0.5);
        this.state.budget += refund;
        this.events.emit('budget:changed', { budget: this.state.budget });

        this.undoManager.pushAction({
          type: 'demolish',
          buildingDefId: masterBuilding.defId,
          gx: masterBuilding.gx,
          gy: masterBuilding.gy,
          cost: def.cost,
          buildingId: masterBuilding.id,
        });
      }
      this.placer.demolish(gx, gy);
      this.overlay.clearGhost();
      return true;
    }

    if (cell.terrain === 'forest') {
      const clearCost = 200;
      if (this.state.budget < clearCost) {
        this.events.emit('notification', {
          message: 'Insufficient rubles to clear forest!',
          type: 'error'
        });
        return false;
      }
      if (this.grid.clearForest(gx, gy)) {
        this.state.budget -= clearCost;
        this.events.emit('budget:changed', { budget: this.state.budget });
        this.events.emit('terrain:changed', { gx, gy });
        return true;
      }
    }

    return false;
  }

  private tryPaintZone(gx: number, gy: number): boolean {
    if (!this.grid.inBounds(gx, gy)) return false;
    if (!this.currentZone) return false;

    const changed = this.grid.setZone(gx, gy, this.currentZone);
    if (!changed) return false;

    this.events.emit('zone:changed', {
      gx,
      gy,
      zone: this.currentZone,
    });
    return true;
  }

  private onClick(gx: number, gy: number): void {
    if (!this.grid.inBounds(gx, gy)) return;

    if (this.currentTool === 'build' && this.currentBuildingId) {
      const def = this.registry.get(this.currentBuildingId);
      if (def && (def.width > 1 || def.height > 1)) {
        this.tryPlace(gx, gy);
      }
      return;
    }

    if (this.currentTool === 'zone') {
      this.tryPaintZone(gx, gy);
      return;
    }

    if (this.currentTool === 'select') {
      const building = this.grid.getMasterBuilding(gx, gy);
      if (building) {
        this.overlay.showSelection(building.gx, building.gy);
        this.events.emit('building:selected', { building });
      } else {
        this.overlay.clearSelection();
        this.events.emit('building:selected', null);
        this.events.emit('tile:selected', { gx, gy });
      }
    }
  }
}
