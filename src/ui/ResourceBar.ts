import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';

function createEl(tag: string, attrs: Record<string, string> = {}, text = ''): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') el.className = v;
    else el.setAttribute(k, v);
  }
  if (text) el.textContent = text;
  return el;
}

function resourceItem(icon: string, label: string, dataRes: string, initValue: string): HTMLElement {
  const item = createEl('div', { className: 'resource-item' });
  const iconEl = createEl('span', { className: 'resource-icon' }, icon);
  const wrap = createEl('div');
  const labelEl = createEl('div', { className: 'resource-label' }, label);
  const valueEl = createEl('span', { className: 'resource-value' }, initValue);
  valueEl.dataset.res = dataRes;
  wrap.appendChild(labelEl);
  wrap.appendChild(valueEl);
  item.appendChild(iconEl);
  item.appendChild(wrap);
  return item;
}

export class ResourceBar {
  private el: HTMLDivElement;
  private popEl!: HTMLSpanElement;
  private budgetEl!: HTMLSpanElement;
  private powerEl!: HTMLSpanElement;
  private happyEl!: HTMLSpanElement;
  private dateEl!: HTMLSpanElement;

  constructor(container: HTMLElement, private state: GameStateData, private events: EventBus) {
    this.el = document.createElement('div');
    this.el.id = 'resource-bar';

    this.el.appendChild(resourceItem('\u2606', 'Population', 'pop', '0'));
    this.el.appendChild(resourceItem('\u20BD', 'Budget', 'budget', '50,000'));
    this.el.appendChild(resourceItem('\u26A1', 'Power', 'power', '0/0 MW'));
    this.el.appendChild(resourceItem('\u263A', 'Happiness', 'happy', '50%'));
    this.el.appendChild(resourceItem('\u2630', 'Date', 'date', 'W1 1980'));

    // Speed controls
    const speedDiv = createEl('div', { id: 'speed-controls' });
    const speeds = [
      { speed: '0', label: '\u23F8' },
      { speed: '1', label: '1x' },
      { speed: '2', label: '2x' },
      { speed: '4', label: '4x' },
    ];
    for (const s of speeds) {
      const btn = createEl('button', { className: 'speed-btn' + (s.speed === '1' ? ' active' : '') }, s.label);
      btn.dataset.speed = s.speed;
      btn.addEventListener('click', () => {
        const speed = parseInt(s.speed);
        this.events.emit('speed:changed', { speed });
        speedDiv.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      speedDiv.appendChild(btn);
    }
    this.el.appendChild(speedDiv);

    container.appendChild(this.el);

    this.popEl = this.el.querySelector('[data-res="pop"]')!;
    this.budgetEl = this.el.querySelector('[data-res="budget"]')!;
    this.powerEl = this.el.querySelector('[data-res="power"]')!;
    this.happyEl = this.el.querySelector('[data-res="happy"]')!;
    this.dateEl = this.el.querySelector('[data-res="date"]')!;

    events.on('tick', () => this.update());
    events.on('budget:changed', () => this.update());
    events.on('population:changed', () => this.update());
    events.on('power:updated', () => this.update());
    events.on('happiness:changed', () => this.update());
  }

  update(): void {
    this.popEl.textContent = this.state.population.toLocaleString();
    this.budgetEl.textContent = this.state.budget.toLocaleString() + '\u20BD';
    this.powerEl.textContent = `${this.state.powerDemand}/${this.state.powerCapacity} MW`;
    this.happyEl.textContent = `${this.state.happiness}%`;

    const weekStr = `W${this.state.week}`;
    this.dateEl.textContent = `${weekStr} ${this.state.year}`;

    this.budgetEl.style.color = this.state.budget < 0 ? '#EF5350' : '#FFD700';
    this.powerEl.style.color = this.state.powerDemand > this.state.powerCapacity ? '#EF5350' : '#FFD700';
    this.happyEl.style.color = this.state.happiness < 30 ? '#EF5350' : this.state.happiness < 50 ? '#FFC107' : '#FFD700';
  }
}
