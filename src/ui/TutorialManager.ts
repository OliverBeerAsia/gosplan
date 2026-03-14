import { GameStateData } from '../core/GameState';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';

interface TutorialStep {
  id: string;
  message: string;
  /** Return true when the step goal is achieved */
  completed: () => boolean;
}

const TUTORIAL_COMPLETE_KEY = 'gosplan_tutorial_complete';

export class TutorialManager {
  private el: HTMLDivElement;
  private messageEl: HTMLSpanElement;
  private stepEl: HTMLSpanElement;
  private skipBtn: HTMLButtonElement;
  private overlay: HTMLDivElement;
  private currentStep = 0;
  private tutorialComplete: boolean;
  private tutorialActive = false;
  private steps: TutorialStep[];

  constructor(
    private container: HTMLElement,
    private state: GameStateData,
    private grid: Grid,
    private registry: BuildingRegistry,
    private events: EventBus
  ) {
    // Check if tutorial was already completed
    this.tutorialComplete = localStorage.getItem(TUTORIAL_COMPLETE_KEY) === 'true';

    // Spotlight overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'tutorial-overlay';
    this.overlay.style.display = 'none';
    container.appendChild(this.overlay);

    // Tutorial bar
    this.el = document.createElement('div');
    this.el.id = 'tutorial-hint';
    this.el.style.display = 'none';

    this.stepEl = document.createElement('span');
    this.stepEl.className = 'tutorial-step-counter';
    this.el.appendChild(this.stepEl);

    this.messageEl = document.createElement('span');
    this.messageEl.className = 'tutorial-message';
    this.el.appendChild(this.messageEl);

    this.skipBtn = document.createElement('button');
    this.skipBtn.className = 'tutorial-dismiss';
    this.skipBtn.textContent = 'SKIP';
    this.skipBtn.addEventListener('click', () => this.completeTutorial());
    this.el.appendChild(this.skipBtn);

    container.appendChild(this.el);

    this.steps = [
      {
        id: 'place_power',
        message: 'Step 1: Open INDUSTRY and place a Coal Power Plant.',
        completed: () => {
          return this.grid.getAllBuildings().some(b => {
            const def = this.registry.get(b.defId);
            return !!def?.powerGeneration;
          });
        },
      },
      {
        id: 'build_road',
        message: 'Step 2: Open INFRA and place Roads to connect power.',
        completed: () => {
          return this.grid.getAllBuildings().filter(b => b.defId === 'road').length >= 3;
        },
      },
      {
        id: 'paint_housing',
        message: 'Step 3: Open ZONING and paint Housing near roads.',
        completed: () => {
          return this.state.population > 60;
        },
      },
      {
        id: 'watch_growth',
        message: 'Step 4: Let the city grow past 100 population.',
        completed: () => {
          return this.state.population > 100;
        },
      },
      {
        id: 'build_service',
        message: 'Step 5: Open SERVICES and place a School or Hospital.',
        completed: () => {
          return this.grid.getAllBuildings().some(b => {
            const def = this.registry.get(b.defId);
            return def?.category === 'government' && !!def.serviceRadius;
          });
        },
      },
      {
        id: 'open_plan',
        message: 'Well done, Comrade! Check the Plan Panel for Five-Year goals.',
        completed: () => false, // Timer-based: auto-completes after 6s in showStep()
      },
    ];

    // Start tutorial for new players
    if (!this.tutorialComplete && this.grid.getAllBuildings().length === 0) {
      this.startTutorial();
    }

    events.on('tick', () => this.check());
    events.on('building:placed', () => this.check());
    events.on('zone:changed', () => this.check());
    events.on('population:changed', () => this.check());
  }

  private startTutorial(): void {
    this.tutorialActive = true;
    this.container.classList.add('tutorial-active');
    this.currentStep = 0;
    this.showStep();
  }

  private showStep(): void {
    if (!this.tutorialActive || this.currentStep >= this.steps.length) {
      this.completeTutorial();
      return;
    }

    const step = this.steps[this.currentStep];
    this.stepEl.textContent = `[${this.currentStep + 1}/${this.steps.length}]`;
    this.messageEl.textContent = step.message;
    this.el.style.display = 'flex';
    this.overlay.style.display = 'block';

    // If last step, auto-advance after a delay
    if (step.id === 'open_plan') {
      window.setTimeout(() => {
        if (this.currentStep === this.steps.length - 1) {
          this.completeTutorial();
        }
      }, 6000);
    }
  }

  private check(): void {
    if (!this.tutorialActive) return;
    if (this.currentStep >= this.steps.length) return;

    const step = this.steps[this.currentStep];
    if (step.completed()) {
      this.currentStep++;
      this.showStep();
    }
  }

  private completeTutorial(): void {
    this.tutorialActive = false;
    this.container.classList.remove('tutorial-active');
    this.el.style.display = 'none';
    this.overlay.style.display = 'none';
    this.tutorialComplete = true;
    try {
      localStorage.setItem(TUTORIAL_COMPLETE_KEY, 'true');
    } catch { /* ignore */ }

    this.events.emit('notification', {
      message: 'Tutorial complete! Good luck, Comrade Planner.',
      type: 'success',
    });
    this.events.emit('tutorial:completed', {});
  }
}
