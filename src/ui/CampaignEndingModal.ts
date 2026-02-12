import { EventBus } from '../core/EventBus';
import { GameStateData } from '../core/GameState';

export class CampaignEndingModal {
  private el: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private summaryEl: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private scenarioEl: HTMLDivElement;

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'campaign-ending-modal';
    this.el.style.display = 'none';

    const panel = document.createElement('div');
    panel.id = 'campaign-ending-panel';
    this.el.appendChild(panel);

    const header = document.createElement('div');
    header.id = 'campaign-ending-header';
    header.textContent = 'CAMPAIGN REPORT';
    panel.appendChild(header);

    this.titleEl = document.createElement('div');
    this.titleEl.id = 'campaign-ending-title';
    panel.appendChild(this.titleEl);

    this.summaryEl = document.createElement('div');
    this.summaryEl.id = 'campaign-ending-summary';
    panel.appendChild(this.summaryEl);

    this.scoreEl = document.createElement('div');
    this.scoreEl.id = 'campaign-ending-score';
    panel.appendChild(this.scoreEl);

    this.scenarioEl = document.createElement('div');
    this.scenarioEl.id = 'campaign-ending-scenario';
    panel.appendChild(this.scenarioEl);

    const actions = document.createElement('div');
    actions.id = 'campaign-ending-actions';

    const sandboxBtn = document.createElement('button');
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
  }

  private hide(): void {
    this.el.style.display = 'none';
  }
}
