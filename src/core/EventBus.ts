export type GameEvents = {
  'building:placed': { buildingId: string; gx: number; gy: number };
  'building:demolished': { gx: number; gy: number };
  'tool:selected': { tool: string; buildingId?: string };
  'tick': { week: number; year: number };
  'speed:changed': { speed: number };
  'budget:changed': { budget: number };
  'population:changed': { population: number };
  'power:updated': { totalCapacity: number; totalDemand: number };
  'happiness:changed': { happiness: number };
  'plan:completed': { planIndex: number; success: boolean };
  'notification': { message: string; type: 'info' | 'warning' | 'success' | 'error' };
  'camera:moved': { x: number; y: number; zoom: number };
  'building:selected': { building: import('../buildings/BuildingTypes').PlacedBuilding } | null;
  'game:loaded': {};
  'game:saved': {};
};

type Handler<T> = (data: T) => void;

export class EventBus {
  private handlers: Map<string, Set<Handler<any>>> = new Map();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    this.handlers.get(event)?.forEach(h => h(data));
  }
}
