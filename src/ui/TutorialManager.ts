import { GameStateData } from '../core/GameState';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';

interface TutorialStep {
  id: string;
  message: string;
  /** Match only the explicit action taught by this step. */
  completedBy: (action: TutorialAction) => boolean;
}

type TutorialAction =
  | { type: 'building:placed'; defId: string }
  | { type: 'zone:changed'; zone: import('../grid/Cell').ZoneType }
  | { type: 'population:changed'; population: number }
  | { type: 'plan:viewed' };

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
  private roadsPlacedDuringTutorial = 0;

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
        message: 'Step 1: Open INDUSTRY and select COAL POWER PLANT, then place it.',
        completedBy: action => action.type === 'building:placed'
          && !!this.registry.get(action.defId)?.powerGeneration,
      },
      {
        id: 'build_road',
        message: 'Step 2: Open INFRA and select ROAD. Place three roads to connect power.',
        completedBy: action => action.type === 'building:placed'
          && action.defId === 'road'
          && this.roadsPlacedDuringTutorial >= 3,
      },
      {
        id: 'paint_housing',
        message: 'Step 3: Open HOUSING and select HOUSING ZONE. Paint near the roads.',
        completedBy: action => action.type === 'zone:changed' && action.zone === 'housing',
      },
      {
        id: 'watch_growth',
        message: 'Step 4: Grow to 200 population to unlock SERVICES and the FIVE-YEAR PLAN.',
        completedBy: action => action.type === 'population:changed' && action.population >= 200,
      },
      {
        id: 'build_service',
        message: 'Step 5: Open SERVICES and select SCHOOL or HOSPITAL, then place it.',
        completedBy: action => action.type === 'building:placed'
          && (action.defId === 'school' || action.defId === 'hospital'),
      },
      {
        id: 'open_plan',
        message: 'Step 6: Select the FIVE-YEAR PLAN header to review your goals.',
        completedBy: action => action.type === 'plan:viewed',
      },
    ];

    // Start tutorial for new players
    if (!this.tutorialComplete && this.grid.getAllBuildings().length === 0) {
      this.startTutorial();
    }

    events.on('building:placed', ({ defId }) => {
      if (defId === 'road') this.roadsPlacedDuringTutorial++;
      this.handleAction({ type: 'building:placed', defId });
    });
    events.on('zone:changed', ({ zone }) => this.handleAction({ type: 'zone:changed', zone }));
    events.on('population:changed', ({ population }) => {
      this.handleAction({ type: 'population:changed', population });
    });
    events.on('plan:viewed', () => this.handleAction({ type: 'plan:viewed' }));
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

  }

  private handleAction(action: TutorialAction): void {
    if (!this.tutorialActive) return;
    if (this.currentStep >= this.steps.length) return;

    const step = this.steps[this.currentStep];
    if (step.completedBy(action)) {
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
