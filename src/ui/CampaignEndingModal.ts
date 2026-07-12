import { EventBus } from '../core/EventBus';
import { GameStateData } from '../core/GameState';
import { activateModal } from './ModalFocus';

export class CampaignEndingModal {
  private el: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private summaryEl: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private scenarioEl: HTMLDivElement;
  private deactivateModal: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'campaign-ending-modal';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'campaign-ending-title');
    this.el.setAttribute('aria-describedby', 'campaign-ending-summary');
    this.el.setAttribute('aria-hidden', 'true');
    this.el.style.display = 'none';

    const panel = document.createElement('div');
    panel.id = 'campaign-ending-panel';
    panel.className = 'panel-shell panel-shell--gold';
    this.el.appendChild(panel);

    const header = document.createElement('div');
    header.id = 'campaign-ending-header';
    header.className = 'panel-shell-header';
    header.textContent = 'CAMPAIGN REPORT';
    panel.appendChild(header);

    this.titleEl = document.createElement('h2');
    this.titleEl.id = 'campaign-ending-title';
    this.titleEl.className = 'panel-shell-body';
    panel.appendChild(this.titleEl);

    this.summaryEl = document.createElement('div');
    this.summaryEl.id = 'campaign-ending-summary';
    this.summaryEl.className = 'panel-shell-body';
    panel.appendChild(this.summaryEl);

    this.scoreEl = document.createElement('div');
    this.scoreEl.id = 'campaign-ending-score';
    this.scoreEl.className = 'panel-shell-body';
    panel.appendChild(this.scoreEl);

    this.scenarioEl = document.createElement('div');
    this.scenarioEl.id = 'campaign-ending-scenario';
    this.scenarioEl.className = 'panel-shell-body';
    panel.appendChild(this.scenarioEl);

    const actions = document.createElement('div');
    actions.id = 'campaign-ending-actions';

    const sandboxBtn = document.createElement('button');
    sandboxBtn.type = 'button';
    sandboxBtn.className = 'campaign-ending-btn primary';
    sandboxBtn.textContent = 'CONTINUE AS SANDBOX';
    sandboxBtn.addEventListener('click', () => {
      this.events.emit('mode:changed', { mode: 'sandbox' });
      this.events.emit('speed:changed', { speed: 1 });
      this.events.emit('notification', {
        message: 'Campaign complete. Continuing under sandbox autonomy.',
        type: 'info',
      });
      this.hide();
    });
    actions.appendChild(sandboxBtn);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'campaign-ending-btn';
    closeBtn.textContent = 'CLOSE REPORT';
    closeBtn.addEventListener('click', () => this.hide());
    actions.appendChild(closeBtn);

    panel.appendChild(actions);

    container.appendChild(this.el);

    events.on('campaign:ended', ({ title, summary, score }) => {
      this.show(title, summary, score);
    });

    events.on('game:loaded', () => {
      if (this.state.mode === 'campaign' && this.state.campaignEnded) {
        this.show(
          this.state.campaignEndingTitle ?? 'Campaign Complete',
          this.state.campaignEndingSummary ?? 'The city reached its campaign evaluation window.',
          this.state.campaignScore
        );
      } else {
        this.hide();
      }
    });

    events.on('mode:changed', ({ mode }) => {
      if (mode === 'sandbox') {
        this.hide();
      }
    });
  }

  private show(title: string, summary: string, score: number): void {
    this.titleEl.textContent = title.toUpperCase();
    this.summaryEl.textContent = summary;
    this.scoreEl.textContent = `Planning Score: ${score}/100`;
    this.scenarioEl.textContent =
      `Scenario: ${this.state.campaignScenarioLabel} | Target Year: ${this.state.campaignTargetYear}`;
    this.el.style.display = 'flex';
    this.el.setAttribute('aria-hidden', 'false');
    this.deactivateModal?.();
    this.deactivateModal = activateModal(this.el, {
      initialFocus: () => this.el.querySelector<HTMLButtonElement>('button:not(:disabled)'),
      onEscape: () => this.hide(),
    });
  }

  private hide(): void {
    this.el.style.display = 'none';
    this.el.setAttribute('aria-hidden', 'true');
    this.deactivateModal?.();
    this.deactivateModal = null;
  }
}
