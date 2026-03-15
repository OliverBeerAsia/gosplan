import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { UIProgressionManager } from './UIProgressionManager';
import { BUILDING_ERA } from '../constants';

/**
 * Non-blocking banner that celebrates era transitions.
 * Auto-pauses briefly, shows new unlocks, then auto-dismisses or dismisses on input.
 */
export class EraUnlockOverlay {
  private overlay: HTMLDivElement;
  private previousSpeed = 1;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private container: HTMLElement,
    private state: GameStateData,
    private registry: BuildingRegistry,
    private events: EventBus
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'era-unlock-overlay';
    this.overlay.style.display = 'none';
    this.container.appendChild(this.overlay);

    // Click anywhere on backdrop to dismiss
    this.overlay.addEventListener('click', () => this.dismiss());

    this.events.on('era:changed', ({ era }) => {
      this.show(era);
    });
  }

  private show(era: number): void {
    // Auto-pause
    this.previousSpeed = this.state.speed;
    this.events.emit('speed:changed', { speed: 0 });

    const eraName = UIProgressionManager.getEraName(era);
    const unlocks = UIProgressionManager.getEraUnlocks(era);

    // Get newly unlocked buildings
    const newBuildings = this.registry.getAll()
      .filter(b => (BUILDING_ERA[b.id] ?? 1) === era)
      .map(b => b.name);

    while (this.overlay.firstChild) {
      this.overlay.removeChild(this.overlay.firstChild);
    }

    const content = document.createElement('div');
    content.className = 'era-unlock-content';
    // Stop clicks on content from bubbling to backdrop dismiss
    content.addEventListener('click', (e) => e.stopPropagation());

    const title = document.createElement('div');
    title.className = 'era-unlock-title';
    title.textContent = `ERA ${era}: ${eraName.toUpperCase()}`;
    content.appendChild(title);

    // Compact single-line summary of unlocks
    const items: string[] = [];
    if (newBuildings.length > 0) items.push(newBuildings.join(', '));
    for (const u of unlocks) items.push(u);

    if (items.length > 0) {
      const list = document.createElement('div');
      list.className = 'era-unlock-list';
      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'era-unlock-item';
        row.textContent = `\u2605 ${item}`;
        list.appendChild(row);
      }
      content.appendChild(list);
    }

    const hint = document.createElement('div');
    hint.className = 'era-unlock-hint';
    hint.textContent = 'Press any key or click to continue';
    content.appendChild(hint);

    this.overlay.appendChild(content);
    this.overlay.style.display = '';

    // Keyboard dismiss (any key)
    this.keyHandler = (e: KeyboardEvent) => {
      e.preventDefault();
      this.dismiss();
    };
    document.addEventListener('keydown', this.keyHandler);

    // Auto-dismiss after 6 seconds
    this.autoDismissTimer = setTimeout(() => this.dismiss(), 6000);
  }

  private dismiss(): void {
    if (this.overlay.style.display === 'none') return; // already dismissed
    this.overlay.style.display = 'none';

    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }

    // Resume at previous speed (at least 1x)
    const resumeSpeed = Math.max(1, this.previousSpeed);
    this.events.emit('speed:changed', { speed: resumeSpeed });
  }
}
