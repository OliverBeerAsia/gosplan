import { EventBus } from '../core/EventBus';
import { ActiveCityEvent, GameStateData } from '../core/GameState';

export class EventChoiceModal {
  private el: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private choicesEl: HTMLDivElement;
  private timerEl: HTMLDivElement;
  private currentEvent: ActiveCityEvent | null = null;

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'event-modal';
    this.el.style.display = 'none';

    const panel = document.createElement('div');
    panel.id = 'event-modal-panel';
    panel.className = 'panel-shell panel-shell--red';
    this.el.appendChild(panel);

    this.titleEl = document.createElement('div');
    this.titleEl.id = 'event-modal-title';
    this.titleEl.className = 'panel-shell-header';
    panel.appendChild(this.titleEl);

    this.bodyEl = document.createElement('div');
    this.bodyEl.id = 'event-modal-body';
    this.bodyEl.className = 'panel-shell-body';
    panel.appendChild(this.bodyEl);

    this.timerEl = document.createElement('div');
    this.timerEl.id = 'event-modal-timer';
    this.timerEl.className = 'panel-shell-body';
    panel.appendChild(this.timerEl);

    this.choicesEl = document.createElement('div');
    this.choicesEl.id = 'event-modal-choices';
    this.choicesEl.className = 'panel-shell-body';
    panel.appendChild(this.choicesEl);

    container.appendChild(this.el);

    events.on('event:triggered', ({ event }) => this.show(event));
    events.on('event:resolved', () => this.hide());
    events.on('tick', () => this.updateTimer());
    events.on('game:loaded', () => {
      if (this.state.activeEvent) {
        this.show(this.state.activeEvent);
      } else {
        this.hide();
      }
    });
  }

  private show(event: ActiveCityEvent): void {
    this.currentEvent = event;
    this.titleEl.textContent = event.title.toUpperCase();
    this.bodyEl.textContent = event.description;
    this.renderChoices(event);
    this.updateTimer();
    this.el.style.display = 'flex';
  }

  private hide(): void {
    this.currentEvent = null;
    this.el.style.display = 'none';
    while (this.choicesEl.firstChild) this.choicesEl.removeChild(this.choicesEl.firstChild);
  }

  private renderChoices(event: ActiveCityEvent): void {
    while (this.choicesEl.firstChild) this.choicesEl.removeChild(this.choicesEl.firstChild);

    for (const choice of event.choices) {
      const btn = document.createElement('button');
      btn.className = 'event-choice-btn';

      const label = document.createElement('div');
      label.className = 'event-choice-label';
      label.textContent = choice.label;
      btn.appendChild(label);

      const desc = document.createElement('div');
      desc.className = 'event-choice-desc';
      desc.textContent = choice.description;
      btn.appendChild(desc);

      btn.addEventListener('click', () => {
        if (!this.currentEvent) return;
        this.events.emit('event:choice:selected', {
          eventId: this.currentEvent.id,
          choiceId: choice.id,
        });
      });

      this.choicesEl.appendChild(btn);
    }
  }

  private updateTimer(): void {
    if (!this.currentEvent || this.el.style.display === 'none') return;
    const weeks = Math.max(0, this.currentEvent.deadlineTick - this.state.totalTicks);
    this.timerEl.textContent = `Response window: ${weeks} weeks`;
    this.timerEl.classList.toggle('critical', weeks <= 3);
  }
}
