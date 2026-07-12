import { EventBus } from '../core/EventBus';
import { ActiveCityEvent, GameStateData } from '../core/GameState';
import { activateModal } from './ModalFocus';

export class EventChoiceModal {
  private el: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private bodyEl: HTMLDivElement;
  private choicesEl: HTMLDivElement;
  private timerEl: HTMLDivElement;
  private currentEvent: ActiveCityEvent | null = null;
  private deactivateModal: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'event-modal';
    this.el.setAttribute('role', 'alertdialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'event-modal-title');
    this.el.setAttribute('aria-describedby', 'event-modal-body');
    this.el.setAttribute('aria-hidden', 'true');
    this.el.style.display = 'none';

    const panel = document.createElement('div');
    panel.id = 'event-modal-panel';
    panel.className = 'event-decree';
    this.el.appendChild(panel);

    const header = document.createElement('header');
    header.className = 'event-modal-header';
    panel.appendChild(header);

    const seal = document.createElement('div');
    seal.className = 'event-modal-seal';
    seal.setAttribute('aria-hidden', 'true');
    seal.textContent = '★';
    header.appendChild(seal);

    const heading = document.createElement('div');
    heading.className = 'event-modal-heading';
    header.appendChild(heading);

    const eyebrow = document.createElement('div');
    eyebrow.className = 'event-modal-eyebrow';
    eyebrow.textContent = 'Urgent Ministry Telegram';
    heading.appendChild(eyebrow);

    this.titleEl = document.createElement('h2');
    this.titleEl.id = 'event-modal-title';
    heading.appendChild(this.titleEl);

    this.bodyEl = document.createElement('div');
    this.bodyEl.id = 'event-modal-body';
    panel.appendChild(this.bodyEl);

    this.timerEl = document.createElement('div');
    this.timerEl.id = 'event-modal-timer';
    this.timerEl.setAttribute('aria-live', 'polite');
    panel.appendChild(this.timerEl);

    this.choicesEl = document.createElement('div');
    this.choicesEl.id = 'event-modal-choices';
    this.choicesEl.setAttribute('role', 'group');
    this.choicesEl.setAttribute('aria-label', 'Available ministry responses');
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
    this.el.setAttribute('aria-hidden', 'false');
    this.deactivateModal?.();
    this.deactivateModal = activateModal(this.el, {
      initialFocus: () => this.choicesEl.querySelector<HTMLButtonElement>('button'),
      onEscape: null,
    });
  }

  private hide(): void {
    this.currentEvent = null;
    this.el.style.display = 'none';
    this.el.setAttribute('aria-hidden', 'true');
    this.deactivateModal?.();
    this.deactivateModal = null;
    while (this.choicesEl.firstChild) this.choicesEl.removeChild(this.choicesEl.firstChild);
  }

  private renderChoices(event: ActiveCityEvent): void {
    while (this.choicesEl.firstChild) this.choicesEl.removeChild(this.choicesEl.firstChild);

    for (const [index, choice] of event.choices.entries()) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'event-choice-btn';
      btn.setAttribute('aria-label', `${choice.label}. ${choice.description}`);

      const tab = document.createElement('div');
      tab.className = 'event-choice-tab';
      tab.setAttribute('aria-hidden', 'true');
      tab.textContent = `Response ${String(index + 1).padStart(2, '0')}`;
      btn.appendChild(tab);

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
