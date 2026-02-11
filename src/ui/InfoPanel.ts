import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { PlacedBuilding } from '../buildings/BuildingTypes';

export class InfoPanel {
  private el: HTMLDivElement;
  private headerEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;

  constructor(container: HTMLElement, private grid: Grid, private registry: BuildingRegistry, private events: EventBus) {
    this.el = document.createElement('div');
    this.el.id = 'info-panel';

    this.headerEl = document.createElement('div');
    this.headerEl.id = 'info-panel-header';
    this.el.appendChild(this.headerEl);

    this.bodyEl = document.createElement('div');
    this.bodyEl.id = 'info-panel-body';
    this.el.appendChild(this.bodyEl);

    container.appendChild(this.el);
  }

  show(building: PlacedBuilding): void {
    const def = this.registry.get(building.defId);
    if (!def) return;

    this.headerEl.textContent = def.name.toUpperCase();

    // Build body with safe DOM methods
    while (this.bodyEl.firstChild) {
      this.bodyEl.removeChild(this.bodyEl.firstChild);
    }

    const desc = document.createElement('p');
    desc.style.cssText = 'margin-bottom:8px;font-style:italic;opacity:0.8;font-size:12px';
    desc.textContent = def.description;
    this.bodyEl.appendChild(desc);

    const rows: [string, string][] = [
      ['Size', `${def.width}x${def.height}`],
      ['Cost', `${def.cost.toLocaleString()}\u20BD`],
      ['Maintenance', `${def.maintenance}\u20BD/wk`],
    ];

    if (def.housingCapacity) rows.push(['Housing', `${def.housingCapacity}`]);
    if (def.powerGeneration) rows.push(['Power Gen', `+${def.powerGeneration} MW`]);
    if (def.powerConsumption) rows.push(['Power Use', `-${def.powerConsumption} MW`]);
    if (def.industrialOutput) rows.push(['Output', `${def.industrialOutput}\u20BD/wk`]);
    if (def.happinessBonus) rows.push(['Happiness', `+${def.happinessBonus}`]);
    rows.push(['Powered', building.powered ? 'YES' : 'NO']);

    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'info-row';
      const labelEl = document.createElement('span');
      labelEl.className = 'info-label';
      labelEl.textContent = label;
      const valueEl = document.createElement('span');
      valueEl.className = 'info-value';
      valueEl.textContent = value;
      row.appendChild(labelEl);
      row.appendChild(valueEl);
      this.bodyEl.appendChild(row);
    }

    this.el.classList.add('visible');
  }

  hide(): void {
    this.el.classList.remove('visible');
  }
}
