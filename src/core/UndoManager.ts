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
    const action = this.undoStack.pop();
    if (!action) return false;

    if (action.type === 'place') {
      // Undo place: remove building, refund full cost
      this.placer.demolish(action.gx, action.gy);
      this.state.budget += action.cost;
      this.events.emit('budget:changed', { budget: this.state.budget });
      this.events.emit('notification', { message: 'Undo: building removed', type: 'info' });
    } else if (action.type === 'demolish') {
      // Undo demolish: re-place building, deduct the 50% refund that was given
      const def = this.registry.get(action.buildingDefId);
      if (def) {
        const building = this.placer.place(action.buildingDefId, action.gx, action.gy);
        if (building) {
          const refund = Math.floor(def.cost * 0.5);
          this.state.budget -= refund;
          this.events.emit('budget:changed', { budget: this.state.budget });
          this.events.emit('notification', { message: 'Undo: building restored', type: 'info' });
        }
      }
    }

    this.redoStack.push(action);
    return true;
  }

  redo(): boolean {
    const action = this.redoStack.pop();
    if (!action) return false;

    if (action.type === 'place') {
      // Redo place: place building, deduct cost
      const def = this.registry.get(action.buildingDefId);
      if (def) {
        const building = this.placer.place(action.buildingDefId, action.gx, action.gy);
        if (building) {
          this.state.budget -= action.cost;
          this.events.emit('budget:changed', { budget: this.state.budget });
          this.events.emit('notification', { message: 'Redo: building placed', type: 'info' });
        }
      }
    } else if (action.type === 'demolish') {
      // Redo demolish: remove building, give refund
      const def = this.registry.get(action.buildingDefId);
      if (def) {
        this.placer.demolish(action.gx, action.gy);
        const refund = Math.floor(def.cost * 0.5);
        this.state.budget += refund;
        this.events.emit('budget:changed', { budget: this.state.budget });
        this.events.emit('notification', { message: 'Redo: building demolished', type: 'info' });
      }
    }

    this.undoStack.push(action);
    return true;
  }
}
