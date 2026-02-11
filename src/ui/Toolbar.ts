import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { BuildingDef, BuildingCategory } from '../buildings/BuildingTypes';
import { EventBus } from '../core/EventBus';
import { ToolType } from '../input/ToolController';

type ToolCallback = (tool: ToolType, buildingId?: string) => void;

const CATEGORIES: { id: BuildingCategory | 'tools'; label: string }[] = [
  { id: 'residential', label: 'HOUSING' },
  { id: 'industrial', label: 'INDUSTRY' },
  { id: 'government', label: 'SERVICES' },
  { id: 'infrastructure', label: 'INFRA' },
  { id: 'decoration', label: 'DECOR' },
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

    // Category bar
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

    // Building panel
    this.buildingPanel = document.createElement('div');
    this.buildingPanel.id = 'building-panel';
    this.el.appendChild(this.buildingPanel);

    container.appendChild(this.el);
  }

  private selectCategory(catId: string, catBar: HTMLElement): void {
    // Toggle
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
    // Clear
    while (this.buildingPanel.firstChild) {
      this.buildingPanel.removeChild(this.buildingPanel.firstChild);
    }
    this.selectedBuildingBtn = null;

    if (catId === 'tools') {
      this.showToolsPanel();
    } else {
      const buildings = this.registry.getByCategory(catId);
      for (const def of buildings) {
        const btn = this.createBuildingButton(def);
        this.buildingPanel.appendChild(btn);
      }
    }

    this.buildingPanel.classList.add('visible');
  }

  private showToolsPanel(): void {
    // Demolish button
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

    // Select button
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
