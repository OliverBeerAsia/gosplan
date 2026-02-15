import { EventBus } from '../core/EventBus';
import { DistrictSnapshot, GameStateData } from '../core/GameState';

export class DistrictPanel {
  private el: HTMLDivElement;
  private headerEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'district-panel';
    this.el.className = 'panel-shell panel-shell--red';

    this.headerEl = document.createElement('div');
    this.headerEl.id = 'district-panel-header';
    this.headerEl.className = 'panel-shell-header';
    this.el.appendChild(this.headerEl);

    this.bodyEl = document.createElement('div');
    this.bodyEl.id = 'district-panel-body';
    this.bodyEl.className = 'panel-shell-body';
    this.el.appendChild(this.bodyEl);

    container.appendChild(this.el);

    events.on('district:updated', () => this.update());
    events.on('directive:changed', () => this.update());
    events.on('tick', () => this.update());
  }

  update(): void {
    this.headerEl.textContent = `DISTRICTS | LOYALTY ${this.state.cityLoyalty}% | UNREST ${this.state.unrestLevel}%`;

    while (this.bodyEl.firstChild) {
      this.bodyEl.removeChild(this.bodyEl.firstChild);
    }

    if (this.state.districtStats.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'district-empty';
      empty.textContent = 'Awaiting district census...';
      this.bodyEl.appendChild(empty);
      return;
    }

    for (const district of this.state.districtStats) {
      this.bodyEl.appendChild(this.renderDistrict(district));
    }
  }

  private renderDistrict(d: DistrictSnapshot): HTMLElement {
    const card = document.createElement('div');
    card.className = 'district-card';

    const title = document.createElement('div');
    title.className = 'district-title';
    title.textContent = `${d.label} • ${this.formatStyle(d.style)}`;
    card.appendChild(title);

    card.appendChild(this.metricRow('Service', d.serviceAccess));
    card.appendChild(this.metricRow('Commute', d.commute));
    card.appendChild(this.metricRow('Loyalty', d.loyalty));
    card.appendChild(this.metricRow('Unrest', d.unrestRisk, true));

    return card;
  }

  private metricRow(label: string, value: number, inverse: boolean = false): HTMLElement {
    const row = document.createElement('div');
    row.className = 'district-metric';

    const l = document.createElement('span');
    l.className = 'district-metric-label';
    l.textContent = label;
    row.appendChild(l);

    const bar = document.createElement('div');
    bar.className = 'district-metric-bar';
    const fill = document.createElement('div');
    fill.className = 'district-metric-fill';

    const pct = Math.max(0, Math.min(100, value));
    fill.style.width = `${pct}%`;
    fill.dataset.level = inverse
      ? (pct >= 65 ? 'danger' : pct >= 40 ? 'warn' : 'good')
      : (pct >= 60 ? 'good' : pct >= 40 ? 'warn' : 'danger');
    bar.appendChild(fill);

    const v = document.createElement('span');
    v.className = 'district-metric-value';
    v.textContent = `${value}`;

    row.appendChild(bar);
    row.appendChild(v);
    return row;
  }

  private formatStyle(style: DistrictSnapshot['style']): string {
    if (style === 'worker_housing') return 'Worker Housing';
    if (style === 'heavy_industry') return 'Heavy Industry';
    if (style === 'scientific_city') return 'Scientific City';
    return 'Historic Core';
  }
}
