import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { ERA_RESOURCE_STATS } from './UIProgressionManager';

function createEl(tag: string, attrs: Record<string, string> = {}, text = ''): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') el.className = v;
    else el.setAttribute(k, v);
  }
  if (text) el.textContent = text;
  return el;
}

function resourceItem(
  icon: string,
  label: string,
  dataRes: string,
  initValue: string,
  tooltip: string,
  priority: 'primary' | 'secondary'
): HTMLElement {
  const item = createEl('div', { className: `resource-item ${priority}` });
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
  private statItems: Map<string, HTMLElement> = new Map();
  private lastVisibleEra = 0;

  // Previous values for trend arrows
  private prevPop = 0;
  private prevBudget = 0;
  private prevHappiness = 50;

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    private events: EventBus,
    _simplified: boolean = false // kept for backward compat, ignored (era-driven now)
  ) {
    this.el = document.createElement('div');
    this.el.id = 'resource-bar';

    // Create all stat items (visibility controlled by era)
    const items: [string, string, string, string, string, 'primary' | 'secondary'][] = [
      ['\u2606', 'Population', 'pop', '50', 'Current population of your city', 'primary'],
      ['\u20BD', 'Budget', 'budget', '50,000', 'City treasury - income from industry and central planning', 'primary'],
      ['\u26A1', 'Power', 'power', '0/0 MW', 'Power demand / capacity in megawatts', 'primary'],
      ['\u263A', 'Happiness', 'happy', '50%', 'City-wide happiness affects population growth', 'primary'],
      ['\u2690', 'Demand', 'demand', 'Steady', 'Main growth signal. Positive means expand that zone; negative means hold.', 'secondary'],
      ['\u262D', 'Stability', 'order', '50% STABLE', 'Composite stability score (loyalty minus unrest). Breakdown in district panel.', 'secondary'],
      ['\u21C4', 'Access', 'mobility', '50% FAIR', 'Average of commute and service access. Breakdown in district panel.', 'secondary'],
    ];

    for (const [icon, label, dataRes, initValue, tooltip, priority] of items) {
      const item = resourceItem(icon, label, dataRes, initValue, tooltip, priority);
      this.statItems.set(dataRes, item);
      this.el.appendChild(item);
    }

    // Date is always visible
    const dateItem = resourceItem('\u2630', 'Date', 'date', 'W1 1980', 'Current week and year', 'secondary');
    this.statItems.set('date', dateItem);
    this.el.appendChild(dateItem);

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
    events.on('era:changed', () => this.updateStatVisibility());

    this.setSpeedActive(this.state.speed);
    this.updateStatVisibility();
  }

  /** Show/hide stats based on current era */
  private updateStatVisibility(): void {
    const era = this.state.currentEra;
    if (era === this.lastVisibleEra) return;
    this.lastVisibleEra = era;

    const visible = new Set(ERA_RESOURCE_STATS[era] ?? ERA_RESOURCE_STATS[4]);
    // Date is always visible
    visible.add('date');

    for (const [key, item] of this.statItems) {
      const wasHidden = item.style.display === 'none';
      const shouldShow = visible.has(key);
      item.style.display = shouldShow ? '' : 'none';

      // Pulse newly visible stats gold briefly
      if (shouldShow && wasHidden && era > 1) {
        item.classList.add('stat-unlock-pulse');
        window.setTimeout(() => item.classList.remove('stat-unlock-pulse'), 2000);
      }
    }
  }

  update(): void {
    this.popEl.textContent = this.state.population.toLocaleString();

    // Budget with projection
    const budgetStr = this.state.budget.toLocaleString() + '\u20BD';
    const netStr = this.state.lastTickNet >= 0
      ? `(+${this.state.lastTickNet}/wk)`
      : `(${this.state.lastTickNet}/wk)`;
    this.budgetEl.textContent = `${budgetStr} ${netStr}`;

    const powerDeficit = this.state.powerDemand > this.state.powerCapacity;
    this.powerEl.textContent = `${this.state.powerDemand}/${this.state.powerCapacity} MW${powerDeficit ? ' \u26A0' : ''}`;
    this.happyEl.textContent = this.formatHappiness();
    const demandSummary = this.summarizeDemand();
    this.demandEl.textContent = demandSummary.text;
    if (this.orderEl) {
      const stability = Math.max(0, Math.min(100, Math.round(this.state.cityLoyalty - this.state.unrestLevel * 0.5)));
      const stabilityLabel = stability >= 60 ? 'STABLE' : stability >= 35 ? 'SHAKY' : 'UNREST';
      this.orderEl.textContent = `${stability}% ${stabilityLabel}`;
    }
    if (this.mobilityEl) {
      const access = Math.max(0, Math.min(100, Math.round((this.state.commuteIndex + this.state.serviceAccessIndex) / 2)));
      const accessLabel = access >= 65 ? 'GOOD' : access >= 40 ? 'FAIR' : 'POOR';
      this.mobilityEl.textContent = `${access}% ${accessLabel}`;
    }

    const weekStr = `W${this.state.week}`;
    this.dateEl.textContent = `${weekStr} ${this.state.year}`;

    this.budgetEl.style.color = this.state.budget < 0 ? '#EF5350' : '#FFD700';
    const powerItem = this.powerEl.closest('.resource-item') as HTMLElement | null;
    if (powerItem) powerItem.classList.toggle('power-deficit', powerDeficit);
    this.powerEl.style.color = powerDeficit ? '#EF5350' : '#FFD700';
    this.happyEl.style.color = this.state.happiness < 30 ? '#EF5350' : this.state.happiness < 50 ? '#FFC107' : '#FFD700';
    this.demandEl.style.color = demandSummary.color;
    if (this.orderEl) {
      const stability = Math.max(0, Math.min(100, Math.round(this.state.cityLoyalty - this.state.unrestLevel * 0.5)));
      this.orderEl.style.color = stability < 35 ? '#EF5350' : stability < 60 ? '#FFC107' : '#FFD700';
    }
    if (this.mobilityEl) {
      const access = Math.max(0, Math.min(100, Math.round((this.state.commuteIndex + this.state.serviceAccessIndex) / 2)));
      this.mobilityEl.style.color = access < 40 ? '#EF5350' : access < 65 ? '#FFC107' : '#FFD700';
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
    const score = Math.round(this.state.happiness);
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
