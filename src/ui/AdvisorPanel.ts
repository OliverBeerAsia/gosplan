import { EventBus } from '../core/EventBus';
import { GameStateData } from '../core/GameState';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { AdvisorService } from '../simulation/AdvisorService';

export class AdvisorPanel {
  private el: HTMLDivElement;
  private messageEl: HTMLDivElement;
  private advisorService: AdvisorService;
  private dismissedMessage: string | null = null;
  private dismissedAt = 0;
  private refreshCooldownMs = 30000; // 30s between dismissed advice and next

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    grid: Grid,
    registry: BuildingRegistry,
    private events: EventBus
  ) {
    this.advisorService = new AdvisorService(grid, registry, state);

    this.el = document.createElement('div');
    this.el.id = 'advisor-panel';
    this.el.className = 'panel-shell panel-shell--gold';
    this.el.style.display = 'none';

    const header = document.createElement('div');
    header.className = 'advisor-header panel-shell-header';
    header.textContent = '\u2606 COMRADE PLANNER';
    this.el.appendChild(header);

    this.messageEl = document.createElement('div');
    this.messageEl.className = 'advisor-message';
    this.el.appendChild(this.messageEl);

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'advisor-dismiss';
    dismissBtn.textContent = '\u2715';
    dismissBtn.title = 'Dismiss';
    dismissBtn.addEventListener('click', () => this.dismiss());
    this.el.appendChild(dismissBtn);

    container.appendChild(this.el);

    events.on('tick', () => this.update());
  }

  private update(): void {
    // Only update every few ticks to avoid flicker
    if (this.state.totalTicks % 8 !== 0) return;

    const advice = this.advisorService.getAdvice();

    if (!advice) {
      // Show "all good" briefly every minute or hide
      if (this.state.totalTicks % 52 < 4) {
        this.showMessage('Your city thrives, Comrade. Continue the great work.');
      } else {
        this.el.style.display = 'none';
      }
      return;
    }

    // Don't re-show dismissed advice too quickly
    if (advice === this.dismissedMessage && Date.now() - this.dismissedAt < this.refreshCooldownMs) {
      return;
    }

    this.showMessage(advice);
  }

  private showMessage(msg: string): void {
    this.messageEl.textContent = msg;
    this.el.style.display = 'flex';
  }

  private dismiss(): void {
    this.dismissedMessage = this.messageEl.textContent;
    this.dismissedAt = Date.now();
    this.el.style.display = 'none';
  }
}
