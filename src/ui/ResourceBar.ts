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
  private orderEl?: HTMLSpanElement;
  private mobilityEl?: HTMLSpanElement;
  private dateEl!: HTMLSpanElement;
  private trendEls: Record<string, HTMLSpanElement> = {};
  private speedControlEl!: HTMLDivElement;
  private simplified: boolean;

  // Previous values for trend arrows
  private prevPop = 0;
  private prevBudget = 0;
  private prevHappiness = 50;

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    private events: EventBus,
    simplified: boolean = false
  ) {
    this.simplified = simplified;
    this.el = document.createElement('div');
    this.el.id = 'resource-bar';

    this.el.appendChild(resourceItem('\u2606', 'Population', 'pop', '50', 'Current population of your city'));
    this.el.appendChild(resourceItem('\u20BD', 'Budget', 'budget', '50,000', 'City treasury - income from industry and central planning'));
    this.el.appendChild(resourceItem('\u26A1', 'Power', 'power', '0/0 MW', 'Power demand / capacity in megawatts'));
    this.el.appendChild(resourceItem('\u263A', 'Happiness', 'happy', '50%', 'City-wide happiness affects population growth'));
    this.el.appendChild(
      resourceItem(
        '\u2690',
        'Demand',
        'demand',
        'Steady',
        'Main growth signal. Positive means expand that zone; negative means hold.'
      )
    );
    if (!this.simplified) {
      this.el.appendChild(resourceItem('\u262D', 'Order', 'order', 'L50 U20', 'City loyalty and unrest pressure'));
      this.el.appendChild(resourceItem('\u21C4', 'Mobility', 'mobility', 'C45 S35', 'Commute index and service access index'));
    }
    this.el.appendChild(resourceItem('\u2630', 'Date', 'date', 'W1 1980', 'Current week and year'));

    // Speed controls
    this.speedControlEl = createEl('div', { id: 'speed-controls' }) as HTMLDivElement;
    const speeds = [
      { speed: '0', label: '\u23F8' },
      { speed: '1', label: '1x' },
      { speed: '2', label: '2x' },
      { speed: '4', label: '4x' },
    ];
    for (const s of speeds) {
      const btn = createEl('button', { className: 'speed-btn' }, s.label);
      btn.dataset.speed = s.speed;
      btn.addEventListener('click', () => {
        const speed = parseInt(s.speed);
        this.events.emit('speed:changed', { speed });
      });
      this.speedControlEl.appendChild(btn);
    }
    this.el.appendChild(this.speedControlEl);

    container.appendChild(this.el);

    this.popEl = this.el.querySelector('[data-res="pop"]')!;
    this.budgetEl = this.el.querySelector('[data-res="budget"]')!;
    this.powerEl = this.el.querySelector('[data-res="power"]')!;
    this.happyEl = this.el.querySelector('[data-res="happy"]')!;
    this.demandEl = this.el.querySelector('[data-res="demand"]')!;
    this.orderEl = this.el.querySelector('[data-res="order"]') ?? undefined;
    this.mobilityEl = this.el.querySelector('[data-res="mobility"]') ?? undefined;
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
    events.on('district:updated', () => this.update());
    events.on('commute:updated', () => this.update());
    events.on('speed:changed', ({ speed }) => this.setSpeedActive(speed));

    this.setSpeedActive(this.state.speed);
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
    this.happyEl.textContent = this.formatHappiness();
    const demandSummary = this.summarizeDemand();
    this.demandEl.textContent = demandSummary.text;
    if (this.orderEl) {
      this.orderEl.textContent = `L${this.state.cityLoyalty} U${this.state.unrestLevel}`;
    }
    if (this.mobilityEl) {
      this.mobilityEl.textContent = `C${this.state.commuteIndex} S${this.state.serviceAccessIndex}`;
    }

    const weekStr = `W${this.state.week}`;
    this.dateEl.textContent = `${weekStr} ${this.state.year}`;

    this.budgetEl.style.color = this.state.budget < 0 ? '#EF5350' : '#FFD700';
    this.powerEl.style.color = this.state.powerDemand > this.state.powerCapacity ? '#EF5350' : '#FFD700';
    this.happyEl.style.color = this.state.happiness < 30 ? '#EF5350' : this.state.happiness < 50 ? '#FFC107' : '#FFD700';
    this.demandEl.style.color = demandSummary.color;
    if (this.orderEl) {
      this.orderEl.style.color =
        this.state.unrestLevel > 60 ? '#EF5350' : this.state.cityLoyalty < 45 ? '#FFC107' : '#FFD700';
    }
    if (this.mobilityEl) {
      this.mobilityEl.style.color =
        this.state.commuteIndex < 45 || this.state.serviceAccessIndex < 40 ? '#FFC107' : '#FFD700';
    }

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

  private formatHappiness(): string {
    const score = this.state.happiness;
    if (score >= 70) return `${score}% HIGH`;
    if (score >= 55) return `${score}% GOOD`;
    if (score >= 40) return `${score}% FAIR`;
    return `${score}% LOW`;
  }

  private summarizeDemand(): { text: string; color: string } {
    const entries = [
      { label: 'Housing', value: this.state.residentialDemand },
      { label: 'Industry', value: this.state.industrialDemand },
      { label: 'Civic', value: this.state.civicDemand },
    ];

    const strongest = [...entries].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
    if (!strongest || Math.abs(strongest.value) < 12) {
      return { text: 'Stable', color: '#FFD700' };
    }
    if (strongest.value > 0) {
      return { text: `Need ${strongest.label}`, color: '#9FE870' };
    }
    if (strongest.value < -45) {
      return { text: `${strongest.label} Saturated`, color: '#EF5350' };
    }
    return { text: `${strongest.label} Slowdown`, color: '#FFC107' };
  }

  private setSpeedActive(speed: number): void {
    this.speedControlEl.querySelectorAll<HTMLButtonElement>('.speed-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.speed === String(speed));
    });
  }
}
