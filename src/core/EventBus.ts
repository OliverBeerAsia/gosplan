export type GameEvents = {
  'building:placed': {
    building: import('../buildings/BuildingTypes').PlacedBuilding;
    defId: string;
    gx: number;
    gy: number;
  };
  'building:demolished': {
    building: import('../buildings/BuildingTypes').PlacedBuilding;
    gx: number;
    gy: number;
  };
  /** Authoritative interaction state. All tool-facing UI renders from this snapshot. */
  'tool:selected': import('../input/ToolController').ToolSnapshot;
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
  'terrain:changed': { gx: number; gy: number };
  'zone:changed': { gx: number; gy: number; zone: import('../grid/Cell').ZoneType };
  'placement:rejected': { reason: string; buildingId: string; gx: number; gy: number };
  'demand:updated': { residential: number; industrial: number; civic: number };
  'service:updated': { average: number };
  'commute:updated': { commute: number; serviceAccess: number };
  'district:updated': {
    districts: import('./GameState').DistrictSnapshot[];
    cityLoyalty: number;
    unrestLevel: number;
    commuteIndex: number;
    serviceAccessIndex: number;
  };
  'directive:changed': { directive: string; pressure: number };
  'event:triggered': { event: import('./GameState').ActiveCityEvent };
  'event:choice:selected': { eventId: string; choiceId: string };
  'event:resolved': { eventId: string; choiceId: string; summary: string };
  'achievement:unlocked': { id: string; title: string; description: string };
  'campaign:ended': { endingId: string; title: string; summary: string; score: number };
  'mode:changed': { mode: import('./GameState').GameMode };
  'bulletin:added': { entry: import('./GameState').BulletinEntry };
  'tile:selected': { gx: number; gy: number };
  'overlay:service:toggle': {};
  'graphics:quality:changed': { quality: import('./GameState').GraphicsQuality };
  'era:changed': { era: number; previousEra: number };
  'game:loaded': {};
  'game:saved': {};
  'game:save:requested': {};
  'tutorial:completed': {};
  'plan:viewed': {};
  'ui:settings:changed': { settings: Partial<import('./GameState').UiSettings> };
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
