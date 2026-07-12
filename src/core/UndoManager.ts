import { Grid } from '../grid/Grid';
import { BuildingPlacer } from '../grid/BuildingPlacer';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { GameStateData } from './GameState';
import { EventBus } from './EventBus';

export interface UndoAction {
  type: 'place' | 'demolish';
  buildingDefId: string;
  gx: number;
  gy: number;
  cost: number;
  buildingId: number;
}

export class UndoManager {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private maxSize = 20;

  constructor(
    private grid: Grid,
    private placer: BuildingPlacer,
    private registry: BuildingRegistry,
    private state: GameStateData,
    private events: EventBus
  ) {}

  pushAction(action: UndoAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    // Clear redo stack on new action
    this.redoStack = [];
  }

  undo(): boolean {
    const action = this.undoStack[this.undoStack.length - 1];
    if (!action) return false;

    if (action.type === 'place') {
      // Undo place: remove building, refund full cost
      if (!this.placer.demolish(action.gx, action.gy)) return false;
      this.state.budget += action.cost;
      this.events.emit('budget:changed', { budget: this.state.budget });
      this.events.emit('notification', { message: 'Undo: building removed', type: 'info' });
    } else if (action.type === 'demolish') {
      // Compatibility restore preserves valid uneven legacy footprints.
      const def = this.registry.get(action.buildingDefId);
      if (!def) return false;
      const building = this.placer.restore(action.buildingDefId, action.gx, action.gy, {
        id: action.buildingId,
      });
      if (!building) {
        this.events.emit('notification', {
          message: 'Undo blocked: original building footprint is no longer clear',
          type: 'warning',
        });
        return false;
      }
      const refund = Math.floor(def.cost * 0.5);
      this.state.budget -= refund;
      this.events.emit('budget:changed', { budget: this.state.budget });
      this.events.emit('notification', { message: 'Undo: building restored', type: 'info' });
    }

    this.undoStack.pop();
    this.redoStack.push(action);
    return true;
  }

  redo(): boolean {
    const action = this.redoStack[this.redoStack.length - 1];
    if (!action) return false;

    if (action.type === 'place') {
      // Redo place: place building, deduct cost
      const def = this.registry.get(action.buildingDefId);
      if (!def) return false;
      const building = this.placer.place(action.buildingDefId, action.gx, action.gy);
      if (!building) return false;
      this.state.budget -= action.cost;
      this.events.emit('budget:changed', { budget: this.state.budget });
      this.events.emit('notification', { message: 'Redo: building placed', type: 'info' });
    } else if (action.type === 'demolish') {
      // Redo demolish: remove building, give refund
      const def = this.registry.get(action.buildingDefId);
      if (!def) return false;
      if (!this.placer.demolish(action.gx, action.gy)) return false;
      const refund = Math.floor(def.cost * 0.5);
      this.state.budget += refund;
      this.events.emit('budget:changed', { budget: this.state.budget });
      this.events.emit('notification', { message: 'Redo: building demolished', type: 'info' });
    }

    this.redoStack.pop();
    this.undoStack.push(action);
    return true;
  }
}
