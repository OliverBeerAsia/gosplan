import { EventBus } from '../core/EventBus';
import { Camera } from '../rendering/Camera';
import { BuildingPlacer } from '../grid/BuildingPlacer';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { Grid } from '../grid/Grid';
import { OverlayRenderer } from '../rendering/OverlayRenderer';
import { screenToGridOnTerrain } from '../rendering/IsometricRenderer';
import { GameStateData } from '../core/GameState';
import { CameraController } from './CameraController';
import { UndoManager } from '../core/UndoManager';
import { ZoneType } from '../grid/Cell';
import { audioManager } from '../audio/AudioManager';
import { BuildingCategory } from '../buildings/BuildingTypes';
import type { EnvironmentCompositionHit } from '../rendering/EnvironmentPropRenderer';

export type ToolType = 'select' | 'build' | 'demolish' | 'zone';

export type ToolCursor = 'default' | 'pointer' | 'crosshair' | 'not-allowed';

export type EnvironmentCompositionHitProvider = (
  gx: number,
  gy: number,
) => EnvironmentCompositionHit | undefined;

/**
 * Complete, authoritative tool state. UI consumers must render this snapshot
 * instead of maintaining parallel selection state.
 */
export interface ToolSnapshot {
  tool: ToolType;
  buildingId: string | null;
  zone: ZoneType | null;
  category: BuildingCategory | null;
  cursor: ToolCursor;
  helpText: string;
}

export class ToolController {
  currentTool: ToolType = 'select';
  currentBuildingId: string | null = null;
  currentZone: ZoneType | null = null;
  currentCategory: BuildingCategory | null = null;
  lastBuildingId: string | null = null;
  private hoverGx = -1;
  private hoverGy = -1;

  // Drag-to-build state
  private isDragging = false;
  private dragPlacedCells = new Set<string>();
  private dragAbort: AbortController | null = null;

  // Rejection reason label
  private rejectionLabel: HTMLDivElement | null = null;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private lastPublishedSnapshot = '';
  private readonly domAbort = new AbortController();
  private readonly onGameLoaded = (): void => this.setTool('select');

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
    private canvas: HTMLCanvasElement,
    private getEnvironmentComposition?: EnvironmentCompositionHitProvider,
  ) {
    this.undoManager = new UndoManager(grid, placer, registry, state, events);
    this.setupEvents();
  }

  setTool(
    tool: ToolType,
    buildingId?: string,
    zone?: ZoneType,
    category?: BuildingCategory
  ): void {
    this.cancelActiveDrag();
    const buildingDef = buildingId ? this.registry.get(buildingId) : undefined;
    if (tool === 'build' && !buildingDef) {
      tool = 'select';
      buildingId = undefined;
    }

    this.currentTool = tool;
    this.currentBuildingId = tool === 'build' ? buildingId ?? null : null;
    this.currentZone = tool === 'zone' ? zone ?? null : null;
    this.currentCategory = this.resolveCategory(tool, buildingDef?.category, zone, category);

    if (tool === 'build' && this.currentBuildingId) {
      this.lastBuildingId = this.currentBuildingId;
    }

    this.overlay.clearGhost();
    this.overlay.clearZoneGhost();
    this.overlay.clearSelection();
    this.hideRejectionLabel();

    if (this.hoverGx >= 0 && this.hoverGy >= 0) {
      this.onHover(this.hoverGx, this.hoverGy);
    } else {
      this.publishSnapshot();
    }
  }

  /** Re-emit current state after late UI subscribers are mounted. */
  syncState(): void {
    this.lastPublishedSnapshot = '';
    this.publishSnapshot();
  }

  getSnapshot(): ToolSnapshot {
    return this.makeSnapshot();
  }

  isDragActive(): boolean {
    return this.isDragging;
  }

  cancelActiveDrag(): void {
    this.isDragging = false;
    this.dragPlacedCells.clear();
    this.dragAbort?.abort();
    this.dragAbort = null;
  }

  destroy(): void {
    this.cancelActiveDrag();
    this.domAbort.abort();
    this.events.off('game:loaded', this.onGameLoaded);
    this.rejectionLabel?.remove();
    this.rejectionLabel = null;
  }

  private getGridPos(e: MouseEvent): { gx: number; gy: number } {
    return screenToGridOnTerrain(
      e.clientX, e.clientY,
      this.camera.x, this.camera.y, this.camera.zoom,
      this.grid
    );
  }

  private setupEvents(): void {
    const listenerOptions = { signal: this.domAbort.signal };
    this.canvas.addEventListener('mousemove', (e) => {
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      const { gx, gy } = this.getGridPos(e);
      if (gx !== this.hoverGx || gy !== this.hoverGy) {
        this.hoverGx = gx;
        this.hoverGy = gy;
        this.onHover(gx, gy);

        if (this.isDragging) {
          this.onDragMove(gx, gy);
        }
      } else if (this.rejectionLabel && this.rejectionLabel.style.display !== 'none') {
        this.rejectionLabel.style.left = `${e.clientX + 16}px`;
        this.rejectionLabel.style.top = `${e.clientY - 8}px`;
      }
    }, listenerOptions);

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.shiftKey) return;
      if (this.cameraController.dragging) return;

      const { gx, gy } = this.getGridPos(e);

      if (this.currentTool === 'build' && this.currentBuildingId) {
        const def = this.registry.get(this.currentBuildingId);
        if (def && def.width === 1 && def.height === 1) {
          this.beginDrag();
          this.onDragMove(gx, gy);
          return;
        }
      }

      if (this.currentTool === 'demolish' || this.currentTool === 'zone') {
        this.beginDrag();
        this.onDragMove(gx, gy);
      }
    }, listenerOptions);

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        const wasDragging = this.isDragging;
        this.cancelActiveDrag();
        if (wasDragging) return;

        if (!this.cameraController.dragging && !e.shiftKey) {
          const { gx, gy } = this.getGridPos(e);
          this.onClick(gx, gy);
        }
      }
    }, listenerOptions);

    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.currentTool === 'build' || this.currentTool === 'demolish' || this.currentTool === 'zone') {
        e.preventDefault();
        e.stopPropagation();
        this.setTool('select');
      }
    }, listenerOptions);

    this.canvas.addEventListener('mouseleave', () => {
      this.cancelActiveDrag();
      this.hoverGx = -1;
      this.hoverGy = -1;
      this.overlay.clearGhost();
      this.overlay.clearZoneGhost();
      this.hideRejectionLabel();
      this.publishSnapshot();
    }, listenerOptions);

    // Loaded/system-replaced worlds always return to a known interaction state.
    this.events.on('game:loaded', this.onGameLoaded);
  }

  private beginDrag(): void {
    this.cancelActiveDrag();
    this.isDragging = true;
    this.dragAbort = new AbortController();
    const listenerOptions = { signal: this.dragAbort.signal };

    // These temporary listeners exist only for the active drag and are aborted
    // together on completion, leave, blur, tool change, or controller teardown.
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.cancelActiveDrag();
    }, listenerOptions);
    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) this.cancelActiveDrag();
    }, listenerOptions);
    window.addEventListener('pointercancel', () => this.cancelActiveDrag(), listenerOptions);
    window.addEventListener('blur', () => this.cancelActiveDrag(), listenerOptions);
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
      const reason = this.placer.getPlacementRejection(
        this.currentBuildingId, gx, gy, this.state.budget
      );
      const valid = !reason;
      this.overlay.showGhost(this.currentBuildingId, gx, gy, valid);
      if (reason) {
        this.showRejectionLabel(reason);
        this.publishSnapshot(`Cannot place ${this.registry.get(this.currentBuildingId)?.name ?? 'building'}: ${reason}`, 'not-allowed');
      } else {
        this.hideRejectionLabel();
        this.publishSnapshot(undefined, 'crosshair');
      }
      return;
    }

    this.hideRejectionLabel();

    if (this.currentTool === 'demolish') {
      const cell = this.grid.getCell(gx, gy);
      if (cell?.building) {
        const building = this.grid.getMasterBuilding(gx, gy);
        const def = building ? this.registry.get(building.defId) : undefined;
        if (building && def) {
          this.overlay.showTileGhost(building.gx, building.gy, 'ground_invalid', def.width, def.height);
          this.publishSnapshot(`Demolish ${def.name} (${def.width}\u00d7${def.height})`, 'pointer');
        } else {
          this.overlay.clearGhost();
          this.overlay.clearZoneGhost();
          this.publishSnapshot(undefined, 'not-allowed');
        }
      } else if (cell?.terrain === 'forest') {
        this.overlay.showTileGhost(gx, gy, 'ground_invalid');
        this.publishSnapshot('Clear forest (200\u20bd)', 'pointer');
      } else if (this.getEnvironmentComposition?.(gx, gy)) {
        const owner = this.getEnvironmentOwnerAt(gx, gy);
        const ownerDef = owner ? this.registry.get(owner.defId) : undefined;
        this.overlay.showTileGhost(gx, gy, 'ground_invalid');
        this.publishSnapshot(
          ownerDef
            ? `Courtyard amenity belongs to ${ownerDef.name}`
            : 'Courtyard amenity belongs to its housing block',
          'not-allowed',
        );
      } else {
        this.overlay.clearGhost();
        this.overlay.clearZoneGhost();
        this.publishSnapshot('Nothing here to demolish', 'not-allowed');
      }
      return;
    }

    if (this.currentTool === 'zone' && this.currentZone) {
      if (this.currentZone === 'none') {
        const cell = this.grid.getCell(gx, gy);
        this.overlay.showClearZoneGhost(gx, gy);
        this.publishSnapshot(
          cell?.zone === 'none' ? 'No zone marking to clear' : `Clear ${cell?.zone ?? ''} zone marking`,
          cell?.zone === 'none' ? 'not-allowed' : 'crosshair'
        );
      } else {
        this.overlay.showZoneGhost(gx, gy, this.currentZone);
        const cell = this.grid.getCell(gx, gy);
        this.publishSnapshot(
          cell?.building ? 'Cannot zone occupied land' : undefined,
          cell?.building ? 'not-allowed' : 'crosshair'
        );
      }
      return;
    }

    this.overlay.clearGhost();
    this.overlay.clearZoneGhost();

    if (this.currentTool === 'select') {
      const building = this.grid.getMasterBuilding(gx, gy);
      const environmentOwner = building ? null : this.getEnvironmentOwnerAt(gx, gy);
      const inspected = building ?? environmentOwner;
      const def = inspected ? this.registry.get(inspected.defId) : undefined;
      this.publishSnapshot(
        def
          ? environmentOwner
            ? `Inspect ${def.name} courtyard amenity`
            : `Inspect ${def.name} (${def.width}\u00d7${def.height})`
          : 'Inspect city tile',
        inspected ? 'pointer' : 'default',
      );
      return;
    }

    this.publishSnapshot();
  }

  private resolveCategory(
    tool: ToolType,
    buildingCategory?: BuildingCategory,
    zone?: ZoneType,
    requestedCategory?: BuildingCategory
  ): BuildingCategory | null {
    if (tool === 'build') return buildingCategory ?? null;
    if (tool === 'zone') {
      if (requestedCategory) return requestedCategory;
      if (zone === 'housing') return 'residential';
      if (zone === 'industry') return 'industrial';
      if (zone === 'civic' || zone === 'green') return 'government';
      if (zone === 'none') return 'infrastructure';
      return null;
    }
    if (tool === 'select') return requestedCategory ?? null;
    return null;
  }

  private defaultHelpText(): string {
    if (this.currentTool === 'build' && this.currentBuildingId) {
      const def = this.registry.get(this.currentBuildingId);
      return def ? `Place ${def.name} (${def.width}\u00d7${def.height})` : 'Choose a building';
    }
    if (this.currentTool === 'demolish') return 'Demolish buildings or clear forests';
    if (this.currentTool === 'zone') {
      if (this.currentZone === 'none') return 'Clear zone markings';
      return `Paint ${this.currentZone ?? ''} zone`;
    }
    if (this.currentCategory) return `Choose from ${this.currentCategory} planning tools`;
    return 'Inspect buildings and city tiles';
  }

  private defaultCursor(): ToolCursor {
    return this.currentTool === 'select' ? 'default' : 'crosshair';
  }

  private makeSnapshot(helpText?: string, cursor?: ToolCursor): ToolSnapshot {
    return {
      tool: this.currentTool,
      buildingId: this.currentBuildingId,
      zone: this.currentZone,
      category: this.currentCategory,
      cursor: cursor ?? this.defaultCursor(),
      helpText: helpText ?? this.defaultHelpText(),
    };
  }

  private publishSnapshot(helpText?: string, cursor?: ToolCursor): void {
    const snapshot = this.makeSnapshot(helpText, cursor);
    const serialized = JSON.stringify(snapshot);
    this.canvas.style.cursor = snapshot.cursor;
    if (serialized === this.lastPublishedSnapshot) return;
    this.lastPublishedSnapshot = serialized;
    this.events.emit('tool:selected', snapshot);
  }

  private showRejectionLabel(reason: string): void {
    if (!this.rejectionLabel) {
      this.rejectionLabel = document.createElement('div');
      this.rejectionLabel.className = 'placement-rejection';
      this.canvas.parentElement?.appendChild(this.rejectionLabel);
    }
    this.rejectionLabel.textContent = reason;
    this.rejectionLabel.style.display = 'block';
    this.rejectionLabel.style.left = `${this.lastMouseX + 16}px`;
    this.rejectionLabel.style.top = `${this.lastMouseY - 8}px`;
  }

  private hideRejectionLabel(): void {
    if (this.rejectionLabel) {
      this.rejectionLabel.style.display = 'none';
    }
  }

  private tryPlace(gx: number, gy: number): boolean {
    if (!this.grid.inBounds(gx, gy)) return false;
    if (!this.currentBuildingId) return false;

    const def = this.registry.get(this.currentBuildingId);
    if (!def) return false;

    if (this.state.budget < def.cost) {
      this.events.emit('placement:rejected', {
        reason: 'Insufficient rubles',
        buildingId: this.currentBuildingId,
        gx,
        gy,
      });
      this.events.emit('notification', {
        message: 'Insufficient rubles, Comrade!',
        type: 'error'
      });
      audioManager.playSfx('invalid');
      return false;
    }

    const building = this.placer.place(this.currentBuildingId, gx, gy);
    if (building) {
      this.state.budget -= def.cost;
      this.events.emit('budget:changed', { budget: this.state.budget });
      this.overlay.clearGhost();
      // Auto-flash power overlay for power-related buildings
      if (def.powerGeneration || def.conductsPower || def.powerConsumption) {
        this.overlay.flashPowerOverlay(3000);
      }
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
    const reason = this.placer.getPlacementRejection(this.currentBuildingId, gx, gy, this.state.budget)
      ?? 'Placement blocked';
    this.events.emit('placement:rejected', {
      reason,
      buildingId: this.currentBuildingId,
      gx,
      gy,
    });
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
      this.onHover(gx, gy);
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
        this.onHover(gx, gy);
        return true;
      }
    }

    const environmentOwner = this.getEnvironmentOwnerAt(gx, gy);
    if (environmentOwner) {
      const definition = this.registry.get(environmentOwner.defId);
      this.overlay.showSelection(
        environmentOwner.gx,
        environmentOwner.gy,
        definition?.width ?? 1,
        definition?.height ?? 1,
      );
      this.events.emit('building:selected', { building: environmentOwner });
      this.events.emit('notification', {
        message: definition
          ? `Courtyard amenity is managed by ${definition.name}. Demolish the housing block to remove it.`
          : 'Courtyard amenity is managed by its housing block.',
        type: 'info',
      });
      this.onHover(gx, gy);
      return false;
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
    this.onHover(gx, gy);
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
      const building = this.grid.getMasterBuilding(gx, gy)
        ?? this.getEnvironmentOwnerAt(gx, gy);
      if (building) {
        const def = this.registry.get(building.defId);
        this.overlay.showSelection(building.gx, building.gy, def?.width ?? 1, def?.height ?? 1);
        this.events.emit('building:selected', { building });
      } else {
        this.overlay.clearSelection();
        this.events.emit('building:selected', null);
        this.events.emit('tile:selected', { gx, gy });
      }
    }
  }

  private getEnvironmentOwnerAt(gx: number, gy: number) {
    const hit = this.getEnvironmentComposition?.(gx, gy);
    return hit ? this.grid.getBuildingById(hit.ownerBuildingId) : null;
  }
}
