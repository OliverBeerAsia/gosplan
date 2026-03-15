import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { ERA_THRESHOLDS } from '../constants';

const ERA_NAMES = ['Foundation', 'Industrialization', 'Modernization', 'Superpower'];

const ERA_DESCRIPTIONS: Record<number, string[]> = {
  2: [
    'Khrushchyovka, Factory, Warehouse, School, Hospital, Monument, Fountain',
    'Five-Year Plans begin',
    'Service coverage & full happiness tracking',
  ],
  3: [
    'Stalinka, Panelak, Cinema, Radio Tower, Metro Station, Plaza, Sports Complex',
    'Commute & district systems activate',
    'City events begin (reduced frequency)',
  ],
  4: [
    'Party HQ unlocked',
    'Achievements & campaign outcomes active',
    'Full event frequency',
  ],
};

/** Toolbar category visibility per era */
export const ERA_TOOLBAR_CATEGORIES: Record<number, string[]> = {
  1: ['industrial', 'infrastructure'],
  2: ['industrial', 'infrastructure', 'residential', 'government'],
  3: ['industrial', 'infrastructure', 'residential', 'government', 'decoration'],
  4: ['industrial', 'infrastructure', 'residential', 'government', 'decoration'],
};

/** Resource bar stat visibility per era */
export const ERA_RESOURCE_STATS: Record<number, string[]> = {
  1: ['pop', 'budget', 'power'],
  2: ['pop', 'budget', 'power', 'happy', 'demand'],
  3: ['pop', 'budget', 'power', 'happy', 'demand', 'order', 'mobility'],
  4: ['pop', 'budget', 'power', 'happy', 'demand', 'order', 'mobility'],
};

const FIRST_BUILDING_MESSAGES: Record<string, string> = {
  road: 'The first road stretches across the steppe!',
  coal_power_plant: 'Electricity illuminates the workers\' path!',
  kommunalka: 'The people have a roof over their heads!',
  power_line: 'Power lines carry the spark of progress!',
  park: 'Green spaces bloom for the working people!',
  khrushchyovka: 'Prefabricated housing rises for the masses!',
  factory: 'The wheels of industry begin to turn!',
  school: 'Knowledge lights the way to the future!',
  hospital: 'Free healthcare for all comrades!',
  stalinka: 'Ornate towers crown the skyline!',
  metro_station: 'The people\'s palace opens beneath the streets!',
  party_hq: 'The guiding force of the city takes its seat!',
};

const HINT_KEY = 'gosplan_hints_shown';

export class UIProgressionManager {
  private hintsShown: Set<string>;

  constructor(
    private state: GameStateData,
    private events: EventBus
  ) {
    // Load shown hints from localStorage
    try {
      const stored = localStorage.getItem(HINT_KEY);
      this.hintsShown = new Set(stored ? JSON.parse(stored) : []);
    } catch {
      this.hintsShown = new Set();
    }

    // Listen for era changes to show hints for newly visible stats/categories
    this.events.on('era:changed', ({ era }) => {
      this.showEraHints(era);
    });

    // Track first building placements
    this.events.on('building:placed', ({ defId }) => {
      this.trackFirstBuilding(defId);
    });
  }

  /** Show one-time contextual hint via notification system */
  showHint(hintId: string, message: string): void {
    if (this.hintsShown.has(hintId)) return;
    this.hintsShown.add(hintId);
    try {
      localStorage.setItem(HINT_KEY, JSON.stringify([...this.hintsShown]));
    } catch { /* ignore storage errors */ }

    this.events.emit('notification', { message, type: 'info' });
  }

  private showEraHints(era: number): void {
    if (era === 2) {
      this.showHint('era2_happiness', 'Happiness now affects growth. Build services and parks to keep citizens content.');
      this.showHint('era2_plan', 'Five-Year Plans have begun! Complete goals to earn bonus budget.');
    }
    if (era === 3) {
      this.showHint('era3_events', 'City events may now occur. Respond within the deadline or the first option is chosen automatically.');
      this.showHint('era3_districts', 'District and commute systems are now active. Press I to view the district panel.');
    }
  }

  private trackFirstBuilding(defId: string): void {
    if (this.state.firstBuildingsPlaced.includes(defId)) return;
    this.state.firstBuildingsPlaced.push(defId);

    const message = FIRST_BUILDING_MESSAGES[defId];
    if (message) {
      this.events.emit('notification', { message, type: 'success' });
    }
  }

  /** Get era name for display */
  static getEraName(era: number): string {
    return ERA_NAMES[era - 1] ?? 'Unknown';
  }

  /** Get population needed for next era, or null if at max */
  static getNextEraThreshold(era: number): number | null {
    if (era >= ERA_THRESHOLDS.length) return null;
    return ERA_THRESHOLDS[era];
  }

  /** Get description of what an era unlocks */
  static getEraUnlocks(era: number): string[] {
    return ERA_DESCRIPTIONS[era] ?? [];
  }
}
