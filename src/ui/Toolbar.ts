import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { BuildingDef, BuildingCategory } from '../buildings/BuildingTypes';
import { EventBus } from '../core/EventBus';
import { ToolType } from '../input/ToolController';
import { ZoneType } from '../grid/Cell';

type ToolCallback = (tool: ToolType, buildingId?: string, zone?: ZoneType) => void;

const CATEGORIES: { id: BuildingCategory | 'zones' | 'tools'; label: string }[] = [
  { id: 'residential', label: 'HOUSING' },
  { id: 'industrial', label: 'INDUSTRY' },
  { id: 'government', label: 'SERVICES' },
  { id: 'infrastructure', label: 'INFRA' },
  { id: 'decoration', label: 'DECOR' },
  { id: 'zones', label: 'ZONING' },
  { id: 'tools', label: 'TOOLS' },
];

export class Toolbar {
  private el: HTMLDivElement;
  private buildingPanel: HTMLDivElement;
  private activeCategory: string | null = null;
  private selectedBuildingBtn: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    private registry: BuildingRegistry,
    private events: EventBus,
    private onToolSelect: ToolCallback
  ) {
    this.el = document.createElement('div');
    this.el.id = 'toolbar';

    const catBar = document.createElement('div');
    catBar.id = 'toolbar-categories';

    for (const cat of CATEGORIES) {
      const btn = document.createElement('button');
      btn.className = 'category-btn';
      btn.textContent = cat.label;
      btn.dataset.cat = cat.id;
      btn.addEventListener('click', () => this.selectCategory(cat.id, catBar));
      catBar.appendChild(btn);
    }

    this.el.appendChild(catBar);

    this.buildingPanel = document.createElement('div');
    this.buildingPanel.id = 'building-panel';
    this.el.appendChild(this.buildingPanel);

    container.appendChild(this.el);
  }

  private selectCategory(catId: string, catBar: HTMLElement): void {
    if (this.activeCategory === catId) {
      this.activeCategory = null;
      this.buildingPanel.classList.remove('visible');
      catBar.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      this.onToolSelect('select');
      return;
    }

    this.activeCategory = catId;
    catBar.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    catBar.querySelector(`[data-cat="${catId}"]`)?.classList.add('active');

    this.showBuildingPanel(catId);
  }

  private showBuildingPanel(catId: string): void {
    while (this.buildingPanel.firstChild) {
      this.buildingPanel.removeChild(this.buildingPanel.firstChild);
    }
    this.selectedBuildingBtn = null;

    if (catId === 'tools') {
      this.showToolsPanel();
    } else if (catId === 'zones') {
      this.showZonesPanel();
    } else {
      const buildings = this.registry.getByCategory(catId);
      for (const def of buildings) {
        const btn = this.createBuildingButton(def);
        this.buildingPanel.appendChild(btn);
      }
    }

    this.buildingPanel.classList.add('visible');
  }

  private showZonesPanel(): void {
    const zoneDefs: { label: string; hint: string; zone: ZoneType }[] = [
      { label: 'HOUSING ZONE', hint: 'AUTO HOMES', zone: 'housing' },
      { label: 'INDUSTRY ZONE', hint: 'AUTO FACTORIES', zone: 'industry' },
      { label: 'CIVIC ZONE', hint: 'AUTO SERVICES', zone: 'civic' },
      { label: 'GREEN ZONE', hint: 'AUTO PARKS', zone: 'green' },
      { label: 'CLEAR ZONE', hint: 'ERASE MARKING', zone: 'none' },
    ];

    for (const zone of zoneDefs) {
      const btn = document.createElement('button');
      btn.className = 'building-btn';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = zone.label;
      btn.appendChild(nameSpan);

      const costSpan = document.createElement('span');
      costSpan.className = 'building-cost';
      costSpan.textContent = zone.hint;
      btn.appendChild(costSpan);

      btn.addEventListener('click', () => {
        if (this.selectedBuildingBtn) this.selectedBuildingBtn.classList.remove('selected');
        this.selectedBuildingBtn = btn;
        btn.classList.add('selected');
        this.onToolSelect('zone', undefined, zone.zone);
      });

      this.buildingPanel.appendChild(btn);
    }
  }

  private showToolsPanel(): void {
    const demBtn = document.createElement('button');
    demBtn.className = 'building-btn';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = 'DEMOLISH';
    demBtn.appendChild(nameSpan);
    const costSpan = document.createElement('span');
    costSpan.className = 'building-cost';
    costSpan.textContent = '50% REFUND';
    demBtn.appendChild(costSpan);
    demBtn.addEventListener('click', () => {
      if (this.selectedBuildingBtn) this.selectedBuildingBtn.classList.remove('selected');
      this.selectedBuildingBtn = demBtn;
      demBtn.classList.add('selected');
      this.onToolSelect('demolish');
    });
    this.buildingPanel.appendChild(demBtn);

    const selBtn = document.createElement('button');
    selBtn.className = 'building-btn';
    const selName = document.createElement('span');
    selName.textContent = 'INSPECT';
    selBtn.appendChild(selName);
    const selCost = document.createElement('span');
    selCost.className = 'building-cost';
    selCost.textContent = 'CLICK TO VIEW';
    selBtn.appendChild(selCost);
    selBtn.addEventListener('click', () => {
      if (this.selectedBuildingBtn) this.selectedBuildingBtn.classList.remove('selected');
      this.selectedBuildingBtn = selBtn;
      selBtn.classList.add('selected');
      this.onToolSelect('select');
    });
    this.buildingPanel.appendChild(selBtn);

    const svcBtn = document.createElement('button');
    svcBtn.className = 'building-btn';
    const svcName = document.createElement('span');
    svcName.textContent = 'SERVICE MAP';
    svcBtn.appendChild(svcName);
    const svcCost = document.createElement('span');
    svcCost.className = 'building-cost';
    svcCost.textContent = 'TOGGLE (C)';
    svcBtn.appendChild(svcCost);
    svcBtn.addEventListener('click', () => {
      this.events.emit('overlay:service:toggle', {});
    });
    this.buildingPanel.appendChild(svcBtn);
  }

  cycleCategory(dir: number): void {
    const catBar = this.el.querySelector('#toolbar-categories') as HTMLElement;
    if (!catBar) return;
    const idx = CATEGORIES.findIndex(c => c.id === this.activeCategory);
    let next = idx + dir;
    if (next < 0) next = CATEGORIES.length - 1;
    if (next >= CATEGORIES.length) next = 0;
    this.selectCategory(CATEGORIES[next].id, catBar);
  }

  selectToolByName(name: string): void {
    if (name === 'demolish') {
      this.onToolSelect('demolish');
    } else if (name === 'select') {
      this.onToolSelect('select');
    } else {
      const def = this.registry.get(name);
      if (def) {
        this.onToolSelect('build', def.id);
      }
    }
  }

  clearSelection(): void {
    if (this.selectedBuildingBtn) {
      this.selectedBuildingBtn.classList.remove('selected');
      this.selectedBuildingBtn = null;
    }
    const catBar = this.el.querySelector('#toolbar-categories') as HTMLElement;
    if (catBar) {
      catBar.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    }
    this.activeCategory = null;
    this.buildingPanel.classList.remove('visible');
  }

  private createBuildingButton(def: BuildingDef): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'building-btn';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = def.name.toUpperCase();
    btn.appendChild(nameSpan);

    const costSpan = document.createElement('span');
    costSpan.className = 'building-cost';
    costSpan.textContent = def.cost.toLocaleString() + '\u20BD';
    btn.appendChild(costSpan);

    btn.addEventListener('click', () => {
      if (this.selectedBuildingBtn) this.selectedBuildingBtn.classList.remove('selected');
      this.selectedBuildingBtn = btn;
      btn.classList.add('selected');
      this.onToolSelect('build', def.id);
    });

    return btn;
  }
}
