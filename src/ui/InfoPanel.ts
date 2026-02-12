import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { EventBus } from '../core/EventBus';
import { GameStateData } from '../core/GameState';
import { PlacedBuilding } from '../buildings/BuildingTypes';
import { ZoneType } from '../grid/Cell';
import { computeQueuePressure, queuePressureBand } from '../simulation/QueuePressureModel';

export class InfoPanel {
  private el: HTMLDivElement;
  private headerEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;

  private currentBuilding: PlacedBuilding | null = null;
  private currentTile: { gx: number; gy: number } | null = null;

  constructor(
    container: HTMLElement,
    private grid: Grid,
    private registry: BuildingRegistry,
    private state: GameStateData,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'info-panel';

    this.headerEl = document.createElement('div');
    this.headerEl.id = 'info-panel-header';
    this.el.appendChild(this.headerEl);

    this.bodyEl = document.createElement('div');
    this.bodyEl.id = 'info-panel-body';
    this.el.appendChild(this.bodyEl);

    container.appendChild(this.el);

    const refresh = () => {
      if (!this.el.classList.contains('visible')) return;

      if (this.currentBuilding) {
        this.show(this.currentBuilding);
      } else if (this.currentTile) {
        this.showTile(this.currentTile.gx, this.currentTile.gy);
      }
    };

    events.on('power:updated', refresh);
    events.on('demand:updated', refresh);
    events.on('service:updated', refresh);
  }

  show(building: PlacedBuilding): void {
    const def = this.registry.get(building.defId);
    if (!def) return;

    this.currentBuilding = building;
    this.currentTile = null;
    this.headerEl.textContent = def.name.toUpperCase();
    this.clearBody();

    this.appendParagraph(def.description, 'margin-bottom:8px;font-style:italic;opacity:0.8;font-size:12px');

    if (def.powerConsumption && !building.powered) {
      const warn = document.createElement('div');
      warn.style.cssText = 'background:#B71C1C;color:#FFF;padding:4px 8px;margin-bottom:8px;font-weight:700;font-size:12px;text-align:center';
      warn.textContent = 'NOT POWERED';
      this.bodyEl.appendChild(warn);

      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:11px;color:#FFC107;margin-bottom:8px;font-style:italic';
      hint.textContent = 'Connect to power grid via Roads or Power Lines';
      this.bodyEl.appendChild(hint);
    }

    const serviceCoverage = this.grid.getCell(building.gx, building.gy)?.serviceCoverage ?? 0;
    const queuePressure = this.estimateQueuePressure(building, serviceCoverage);

    const rows: [string, string, boolean?][] = [
      ['Size', `${def.width}x${def.height}`],
      ['Cost', `${def.cost.toLocaleString()}\u20BD`],
      ['Maintenance', `${def.maintenance}\u20BD/wk`],
      ['Service Cover', `${Math.round(serviceCoverage)}%`],
    ];

    if (queuePressure > 0) {
      const band = queuePressureBand(queuePressure).toUpperCase();
      rows.push(['Queue Press.', `${queuePressure}% (${band})`, queuePressure >= 70]);
    }

    if (def.housingCapacity) {
      rows.push(['Housing', `${def.housingCapacity}`]);
      rows.push(['Cost/Resident', `${(def.cost / def.housingCapacity).toFixed(1)}\u20BD`]);
    }

    if (def.powerGeneration) rows.push(['Power Gen', `+${def.powerGeneration} MW`]);
    if (def.powerConsumption) rows.push(['Power Use', `-${def.powerConsumption} MW`]);

    if (def.industrialOutput) {
      rows.push(['Output', `${def.industrialOutput}\u20BD/wk`]);
      const net = def.industrialOutput - def.maintenance;
      rows.push(['Net Profit', `${net >= 0 ? '+' : ''}${net}\u20BD/wk`]);
    }

    if (def.happinessBonus) rows.push(['Happiness', `+${def.happinessBonus}`]);
    if (def.serviceRadius) rows.push(['Radius', `${def.serviceRadius} tiles`]);
    rows.push(['Powered', building.powered ? 'YES' : 'NO', def.powerConsumption ? !building.powered : false]);

    for (const [label, value, warning] of rows) {
      this.appendRow(label, value, Boolean(warning));
    }

    this.el.classList.add('visible');
  }

  showTile(gx: number, gy: number): void {
    const cell = this.grid.getCell(gx, gy);
    if (!cell) return;

    this.currentBuilding = null;
    this.currentTile = { gx, gy };
    this.headerEl.textContent = `SECTOR ${gx},${gy}`;
    this.clearBody();

    const zoneLabel = cell.zone === 'none' ? 'NONE' : cell.zone.toUpperCase();
    const demandValue = this.getZoneDemand(cell.zone);
    const roadAccess = this.hasAdjacentRoad(gx, gy);

    this.appendParagraph('Tile status and growth diagnostics for Soviet planning bureau.', 'margin-bottom:8px;font-style:italic;opacity:0.8;font-size:12px');
    this.appendRow('Terrain', cell.terrain.toUpperCase());
    this.appendRow('Zone', zoneLabel, cell.zone === 'none');
    this.appendRow('Service Cover', `${Math.round(cell.serviceCoverage)}%`, cell.serviceCoverage < 20);
    this.appendRow('Road Access', roadAccess ? 'YES' : 'NO', !roadAccess);
    this.appendRow('Power Grid', this.state.powerDemand <= this.state.powerCapacity ? 'STABLE' : 'DEFICIT', this.state.powerDemand > this.state.powerCapacity);

    if (cell.zone !== 'none') {
      this.appendRow('Demand', `${demandValue >= 0 ? '+' : ''}${demandValue}`, demandValue < 12);
    }

    const blockers = this.getGrowthBlockers(gx, gy);
    if (blockers.length > 0) {
      const blockWrap = document.createElement('div');
      blockWrap.style.cssText = 'margin-top:8px;padding:6px;background:rgba(183,28,28,0.2);border:1px solid #B71C1C';

      const title = document.createElement('div');
      title.style.cssText = 'font-size:11px;font-weight:700;color:#EF5350;margin-bottom:4px;text-transform:uppercase';
      title.textContent = 'Growth Blockers';
      blockWrap.appendChild(title);

      for (const blocker of blockers) {
        const line = document.createElement('div');
        line.style.cssText = 'font-size:11px;color:#EF9A9A;line-height:1.35';
        line.textContent = `• ${blocker}`;
        blockWrap.appendChild(line);
      }

      this.bodyEl.appendChild(blockWrap);
    } else if (cell.zone !== 'none' && !cell.building) {
      const ready = document.createElement('div');
      ready.style.cssText = 'margin-top:8px;padding:6px;background:rgba(85,139,47,0.2);border:1px solid #66BB6A;color:#A5D6A7;font-size:11px;font-weight:700;text-transform:uppercase';
      ready.textContent = 'Ready For Development';
      this.bodyEl.appendChild(ready);
    }

    this.el.classList.add('visible');
  }

  hide(): void {
    this.el.classList.remove('visible');
    this.currentBuilding = null;
    this.currentTile = null;
  }

  private clearBody(): void {
    while (this.bodyEl.firstChild) {
      this.bodyEl.removeChild(this.bodyEl.firstChild);
    }
  }

  private appendParagraph(text: string, style: string): void {
    const p = document.createElement('p');
    p.style.cssText = style;
    p.textContent = text;
    this.bodyEl.appendChild(p);
  }

  private appendRow(label: string, value: string, warning: boolean = false): void {
    const row = document.createElement('div');
    row.className = 'info-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'info-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'info-value';
    valueEl.textContent = value;
    if (warning) {
      valueEl.style.color = '#EF5350';
    }

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    this.bodyEl.appendChild(row);
  }

  private hasAdjacentRoad(gx: number, gy: number): boolean {
    const neighbors = [
      [gx, gy - 1],
      [gx + 1, gy],
      [gx, gy + 1],
      [gx - 1, gy],
    ];

    for (const [nx, ny] of neighbors) {
      const building = this.grid.getMasterBuilding(nx, ny);
      if (!building) continue;
      const def = this.registry.get(building.defId);
      if (def?.isRoad) return true;
    }

    return false;
  }

  private getZoneDemand(zone: ZoneType): number {
    switch (zone) {
      case 'housing': return this.state.residentialDemand;
      case 'industry': return this.state.industrialDemand;
      case 'civic':
      case 'green':
        return this.state.civicDemand;
      default:
        return 0;
    }
  }

  private getGrowthBlockers(gx: number, gy: number): string[] {
    const cell = this.grid.getCell(gx, gy);
    if (!cell) return ['Tile is out of bounds.'];

    const blockers: string[] = [];

    if (!this.grid.isBuildable(cell.terrain)) {
      blockers.push('Terrain is not buildable.');
    }

    if (cell.building) {
      blockers.push('Tile is occupied by existing structure.');
    }

    if (cell.zone === 'none') {
      blockers.push('No zone designation.');
      return blockers;
    }

    const demand = this.getZoneDemand(cell.zone);
    if (demand < 12) {
      blockers.push(`Demand too low for ${cell.zone} (${demand}).`);
    }

    if (!this.hasAdjacentRoad(gx, gy)) {
      blockers.push('No adjacent road access.');
    }

    if (this.state.powerDemand > this.state.powerCapacity) {
      blockers.push('City power deficit reduces growth.');
    }

    if ((cell.zone === 'housing' || cell.zone === 'civic') && cell.serviceCoverage < 20) {
      blockers.push('Service coverage below recommended threshold.');
    }

    return blockers;
  }

  private estimateQueuePressure(building: PlacedBuilding, localCoverage: number): number {
    const def = this.registry.get(building.defId);
    if (!def) return 0;
    return computeQueuePressure({
      eligible: def.category === 'government' || def.id === 'metro_station',
      civicDemand: this.state.civicDemand,
      residentialDemand: this.state.residentialDemand,
      localCoverage,
      budget: this.state.budget,
      powered: !def.powerConsumption || building.powered,
    });
  }
}
