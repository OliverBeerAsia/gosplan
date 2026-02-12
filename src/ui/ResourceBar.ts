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

function resourceItem(icon: string, label: string, dataRes: string, initValue: string, tooltip: string): HTMLElement {
  const item = createEl('div', { className: 'resource-item' });
  item.title = tooltip;
  const iconEl = createEl('span', { className: 'resource-icon' }, icon);
  const wrap = createEl('div');
  const labelEl = createEl('div', { className: 'resource-label' }, label);
  const valueEl = createEl('span', { className: 'resource-value' }, initValue);
  valueEl.dataset.res = dataRes;
  const trendEl = createEl('span', { className: 'resource-trend' });
  trendEl.dataset.trend = dataRes;
  wrap.appendChild(labelEl);
  const valRow = createEl('div', { className: 'resource-value-row' });
  valRow.appendChild(valueEl);
  valRow.appendChild(trendEl);
  wrap.appendChild(valRow);
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
  private demandEl!: HTMLSpanElement;
  private dateEl!: HTMLSpanElement;
  private trendEls: Record<string, HTMLSpanElement> = {};

  // Previous values for trend arrows
  private prevPop = 0;
  private prevBudget = 0;
  private prevHappiness = 50;

  constructor(container: HTMLElement, private state: GameStateData, private events: EventBus) {
    this.el = document.createElement('div');
    this.el.id = 'resource-bar';

    this.el.appendChild(resourceItem('\u2606', 'Population', 'pop', '50', 'Current population of your city'));
    this.el.appendChild(resourceItem('\u20BD', 'Budget', 'budget', '50,000', 'City treasury - income from industry and central planning'));
    this.el.appendChild(resourceItem('\u26A1', 'Power', 'power', '0/0 MW', 'Power demand / capacity in megawatts'));
    this.el.appendChild(resourceItem('\u263A', 'Happiness', 'happy', '50%', 'City-wide happiness affects population growth'));
    this.el.appendChild(resourceItem('\u2690', 'Demand', 'demand', 'R0 I0 C0', 'Zoning demand: Housing / Industry / Civic'));
    this.el.appendChild(resourceItem('\u2630', 'Date', 'date', 'W1 1980', 'Current week and year'));

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
    this.demandEl = this.el.querySelector('[data-res="demand"]')!;
    this.dateEl = this.el.querySelector('[data-res="date"]')!;

    // Collect trend elements
    this.el.querySelectorAll('[data-trend]').forEach(el => {
      const key = (el as HTMLElement).dataset.trend!;
      this.trendEls[key] = el as HTMLSpanElement;
    });

    events.on('tick', () => this.update());
    events.on('budget:changed', () => this.update());
    events.on('population:changed', () => this.update());
    events.on('power:updated', () => this.update());
    events.on('happiness:changed', () => this.update());
    events.on('demand:updated', () => this.update());
  }

  update(): void {
    this.popEl.textContent = this.state.population.toLocaleString();

    // Budget with projection
    const budgetStr = this.state.budget.toLocaleString() + '\u20BD';
    const netStr = this.state.lastTickNet >= 0
      ? `(+${this.state.lastTickNet}/wk)`
      : `(${this.state.lastTickNet}/wk)`;
    this.budgetEl.textContent = `${budgetStr} ${netStr}`;

    this.powerEl.textContent = `${this.state.powerDemand}/${this.state.powerCapacity} MW`;
    this.happyEl.textContent = `${this.state.happiness}%`;
    const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
    this.demandEl.textContent =
      `R${fmt(this.state.residentialDemand)} I${fmt(this.state.industrialDemand)} C${fmt(this.state.civicDemand)}`;

    const weekStr = `W${this.state.week}`;
    this.dateEl.textContent = `${weekStr} ${this.state.year}`;

    this.budgetEl.style.color = this.state.budget < 0 ? '#EF5350' : '#FFD700';
    this.powerEl.style.color = this.state.powerDemand > this.state.powerCapacity ? '#EF5350' : '#FFD700';
    this.happyEl.style.color = this.state.happiness < 30 ? '#EF5350' : this.state.happiness < 50 ? '#FFC107' : '#FFD700';
    this.demandEl.style.color = this.state.residentialDemand + this.state.industrialDemand + this.state.civicDemand < 0
      ? '#EF5350'
      : '#FFD700';

    // Trend arrows
    this.setTrend('pop', this.state.population, this.prevPop);
    this.setTrend('happy', this.state.happiness, this.prevHappiness);
    this.setTrend('budget', this.state.budget, this.prevBudget);

    this.prevPop = this.state.population;
    this.prevBudget = this.state.budget;
    this.prevHappiness = this.state.happiness;
  }

  private setTrend(key: string, current: number, prev: number): void {
    const el = this.trendEls[key];
    if (!el) return;
    if (current > prev) {
      el.textContent = '\u25B2';
      el.style.color = '#66BB6A';
    } else if (current < prev) {
      el.textContent = '\u25BC';
      el.style.color = '#EF5350';
    } else {
      el.textContent = '';
    }
  }
}
