import { GameStateData } from '../core/GameState';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';

interface TutorialHint {
  id: string;
  message: string;
  condition: () => boolean;
}

const DISMISSED_KEY = 'gosplan_tutorial_dismissed';

export class TutorialManager {
  private el: HTMLDivElement;
  private messageEl: HTMLSpanElement;
  private dismissBtn: HTMLButtonElement;
  private dismissed: Set<string>;
  private currentHintId: string | null = null;
  private hints: TutorialHint[];

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    private grid: Grid,
    private registry: BuildingRegistry,
    private events: EventBus
  ) {
    // Load dismissed state
    try {
      const saved = localStorage.getItem(DISMISSED_KEY);
      this.dismissed = saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      this.dismissed = new Set();
    }

    this.el = document.createElement('div');
    this.el.id = 'tutorial-hint';
    this.el.style.display = 'none';

    this.messageEl = document.createElement('span');
    this.messageEl.className = 'tutorial-message';
    this.el.appendChild(this.messageEl);

    this.dismissBtn = document.createElement('button');
    this.dismissBtn.className = 'tutorial-dismiss';
    this.dismissBtn.textContent = '\u2715';
    this.dismissBtn.addEventListener('click', () => this.dismissCurrent());
    this.el.appendChild(this.dismissBtn);

    container.appendChild(this.el);

    this.hints = [
      {
        id: 'build_power',
        message: 'Build a Coal Power Plant first to provide electricity!',
        condition: () => {
          const buildings = this.grid.getAllBuildings();
          return buildings.length === 0;
        },
      },
      {
        id: 'build_housing',
        message: 'Paint Housing Zones and connect districts with Roads!',
        condition: () => {
          const buildings = this.grid.getAllBuildings();
          const hasPower = buildings.some(b => {
            const def = this.registry.get(b.defId);
            return def?.powerGeneration;
          });
          const hasHousing = buildings.some(b => {
            const def = this.registry.get(b.defId);
            return def?.housingCapacity;
          });
          return hasPower && !hasHousing;
        },
      },
      {
        id: 'connect_power',
        message: 'Housing needs power! Build Roads between buildings.',
        condition: () => {
          const buildings = this.grid.getAllBuildings();
          const unpoweredHousing = buildings.some(b => {
            const def = this.registry.get(b.defId);
            return def?.housingCapacity && !b.powered;
          });
          return unpoweredHousing;
        },
      },
      {
        id: 'build_factory',
        message: 'Paint Industry Zones to expand state production!',
        condition: () => {
          if (this.state.population < 200) return false;
          const buildings = this.grid.getAllBuildings();
          return !buildings.some(b => {
            const def = this.registry.get(b.defId);
            return def?.industrialOutput;
          });
        },
      },
      {
        id: 'low_happiness',
        message: 'Happiness is low! Build Parks or services.',
        condition: () => this.state.happiness < 45 && this.state.population > 100,
      },
    ];

    events.on('tick', () => this.check());
  }

  private check(): void {
    for (const hint of this.hints) {
      if (this.dismissed.has(hint.id)) continue;
      if (hint.condition()) {
        if (this.currentHintId !== hint.id) {
          this.show(hint);
        }
        return;
      }
    }
    // No hint to show
    this.hide();
  }

  private show(hint: TutorialHint): void {
    this.currentHintId = hint.id;
    this.messageEl.textContent = hint.message;
    this.el.style.display = 'flex';
  }

  private hide(): void {
    this.el.style.display = 'none';
    this.currentHintId = null;
  }

  private dismissCurrent(): void {
    if (this.currentHintId) {
      this.dismissed.add(this.currentHintId);
      try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify([...this.dismissed]));
      } catch { /* ignore */ }
    }
    this.hide();
  }
}
