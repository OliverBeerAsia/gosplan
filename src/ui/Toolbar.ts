import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { BuildingDef, BuildingCategory } from '../buildings/BuildingTypes';
import { EventBus } from '../core/EventBus';
import { GameStateData } from '../core/GameState';
import { ToolType } from '../input/ToolController';
import { ZoneType } from '../grid/Cell';
import { audioManager } from '../audio/AudioManager';
import { ERA_TOOLBAR_CATEGORIES } from './UIProgressionManager';

type ToolCallback = (tool: ToolType, buildingId?: string, zone?: ZoneType) => void;

interface CategoryDef {
  id: BuildingCategory;
  label: string;
  zones?: { label: string; hint: string; zone: ZoneType }[];
}

const CATEGORIES: CategoryDef[] = [
  {
    id: 'residential',
    label: 'HOUSING',
    zones: [{ label: 'HOUSING ZONE', hint: 'AUTO HOMES', zone: 'housing' }],
  },
  {
    id: 'industrial',
    label: 'INDUSTRY',
    zones: [{ label: 'INDUSTRY ZONE', hint: 'AUTO FACTORIES', zone: 'industry' }],
  },
  {
    id: 'government',
    label: 'SERVICES',
    zones: [
      { label: 'CIVIC ZONE', hint: 'AUTO SERVICES', zone: 'civic' },
      { label: 'GREEN ZONE', hint: 'AUTO PARKS', zone: 'green' },
    ],
  },
  {
    id: 'infrastructure',
    label: 'INFRA',
    zones: [{ label: 'CLEAR ZONE', hint: 'ERASE MARKING', zone: 'none' }],
  },
  { id: 'decoration', label: 'DECOR' },
];

export class Toolbar {
  private el: HTMLDivElement;
  private buildingPanel: HTMLDivElement;
  private activeCategory: string | null = null;
  private selectedBuildingBtn: HTMLElement | null = null;
  private quickToolBar: HTMLDivElement;
  private catBar!: HTMLDivElement;
  private lastEra = 0;

  constructor(
    container: HTMLElement,
    private registry: BuildingRegistry,
    private events: EventBus,
    private onToolSelect: ToolCallback,
    private state?: GameStateData
  ) {
    this.el = document.createElement('div');
    this.el.id = 'toolbar';

    this.catBar = document.createElement('div') as HTMLDivElement;
    this.catBar.id = 'toolbar-categories';

    for (const cat of CATEGORIES) {
      const btn = document.createElement('button');
      btn.className = 'category-btn';
      btn.textContent = cat.label;
      btn.dataset.cat = cat.id;
      btn.addEventListener('click', () => {
        if (btn.classList.contains('category-btn--locked')) return;
        audioManager.playSfx('ui_click');
        this.selectCategory(cat.id, this.catBar);
      });
      this.catBar.appendChild(btn);
    }

    this.el.appendChild(this.catBar);

    // Listen for era changes to update category visibility
    this.events.on('era:changed', () => this.updateCategoryVisibility());

    this.buildingPanel = document.createElement('div');
    this.buildingPanel.id = 'building-panel';
    this.el.appendChild(this.buildingPanel);

    // Persistent quick-access tool bar (demolish + inspect)
    this.quickToolBar = document.createElement('div');
    this.quickToolBar.id = 'quick-tool-bar';

    const demBtn = document.createElement('button');
    demBtn.className = 'quick-tool-btn destructive';
    demBtn.textContent = '\u2716 DEMOLISH';
    demBtn.title = 'Demolish (X)';
    demBtn.addEventListener('click', () => {
      audioManager.playSfx('ui_click');
      this.onToolSelect('demolish');
    });
    this.quickToolBar.appendChild(demBtn);

    const insBtn = document.createElement('button');
    insBtn.className = 'quick-tool-btn';
    insBtn.textContent = '\u{1F50D} INSPECT';
    insBtn.title = 'Inspect (V)';
    insBtn.addEventListener('click', () => {
      audioManager.playSfx('ui_click');
      this.onToolSelect('select');
    });
    this.quickToolBar.appendChild(insBtn);

    this.el.appendChild(this.quickToolBar);

    container.appendChild(this.el);

    // Initial category visibility
    this.updateCategoryVisibility();
  }

  /** Update which toolbar categories are visible based on era */
  updateCategoryVisibility(): void {
    const era = this.state?.currentEra ?? 4;
    if (era === this.lastEra) return;

    const visible = new Set(ERA_TOOLBAR_CATEGORIES[era] ?? ERA_TOOLBAR_CATEGORIES[4]);

    this.catBar.querySelectorAll<HTMLElement>('.category-btn').forEach(btn => {
      const catId = btn.dataset.cat ?? '';
      const wasLocked = btn.classList.contains('category-btn--locked');
      const isAvailable = visible.has(catId);

      btn.classList.toggle('category-btn--locked', !isAvailable);

      // Flash gold on newly unlocked categories
      if (isAvailable && wasLocked && this.lastEra > 0) {
        btn.classList.add('category-unlock-flash');
        window.setTimeout(() => btn.classList.remove('category-unlock-flash'), 2500);
      }
    });

    this.lastEra = era;

    // If active category just got locked, close it
    if (this.activeCategory && !visible.has(this.activeCategory)) {
      this.clearSelection();
    }

    // Refresh building panel if open (buildings may have been added)
    if (this.activeCategory) {
      this.showBuildingPanel(this.activeCategory);
    }
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

    // Show buildings for this category (era-filtered)
    const era = this.state?.currentEra ?? 4;
    const buildings = this.registry.getAvailableByCategory(catId, era);
    for (const def of buildings) {
      const btn = this.createBuildingButton(def);
      this.buildingPanel.appendChild(btn);
    }

    // Append inline zone buttons for this category
    const catDef = CATEGORIES.find(c => c.id === catId);
    if (catDef?.zones) {
      for (const zone of catDef.zones) {
        const btn = this.createZoneButton(zone.label, zone.hint, zone.zone);
        this.buildingPanel.appendChild(btn);
      }
    }

    this.buildingPanel.classList.add('visible');
  }

  private createZoneButton(label: string, hint: string, zone: ZoneType): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'building-btn zone-btn';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'building-name';
    nameSpan.textContent = label;
    btn.appendChild(nameSpan);

    const costSpan = document.createElement('span');
    costSpan.className = 'building-cost';
    costSpan.textContent = hint;
    btn.appendChild(costSpan);

    btn.addEventListener('click', () => {
      if (this.selectedBuildingBtn) this.selectedBuildingBtn.classList.remove('selected');
      this.selectedBuildingBtn = btn;
      btn.classList.add('selected');
      this.onToolSelect('zone', undefined, zone);
    });

    return btn;
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
    nameSpan.className = 'building-name';
    nameSpan.textContent = def.name.toUpperCase();
    btn.appendChild(nameSpan);

    const costSpan = document.createElement('span');
    costSpan.className = 'building-cost';
    costSpan.textContent = def.cost.toLocaleString() + '\u20BD';
    btn.appendChild(costSpan);

    // Rich tooltip on hover
    const tooltip = this.createRichTooltip(def);
    btn.appendChild(tooltip);
    btn.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; });
    btn.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

    btn.addEventListener('click', () => {
      if (this.selectedBuildingBtn) this.selectedBuildingBtn.classList.remove('selected');
      this.selectedBuildingBtn = btn;
      btn.classList.add('selected');
      this.onToolSelect('build', def.id);
    });

    return btn;
  }

  private createRichTooltip(def: BuildingDef): HTMLDivElement {
    const tip = document.createElement('div');
    tip.className = 'building-rich-tooltip';
    tip.style.display = 'none';

    const title = document.createElement('div');
    title.className = 'brt-title';
    title.textContent = `${def.name} (${def.width}x${def.height})`;
    tip.appendChild(title);

    const desc = document.createElement('div');
    desc.className = 'brt-desc';
    desc.textContent = def.description;
    tip.appendChild(desc);

    const stats = document.createElement('div');
    stats.className = 'brt-stats';

    const addStat = (label: string, value: string): void => {
      const row = document.createElement('div');
      row.className = 'brt-stat-row';
      const labelEl = document.createElement('span');
      labelEl.className = 'brt-stat-label';
      labelEl.textContent = label;
      const valueEl = document.createElement('span');
      valueEl.className = 'brt-stat-value';
      valueEl.textContent = value;
      row.appendChild(labelEl);
      row.appendChild(valueEl);
      stats.appendChild(row);
    };

    addStat('Cost', `${def.cost.toLocaleString()}\u20BD`);
    addStat('Upkeep', `${def.maintenance}\u20BD/wk`);

    if (def.housingCapacity) addStat('Housing', `${def.housingCapacity} citizens`);
    if (def.powerGeneration) addStat('Power', `+${def.powerGeneration} MW`);
    if (def.powerConsumption) addStat('Power', `-${def.powerConsumption} MW`);
    if (def.industrialOutput) addStat('Output', `${def.industrialOutput}\u20BD/wk`);
    if (def.happinessBonus) addStat('Happiness', `+${def.happinessBonus}`);
    if (def.serviceRadius) addStat('Radius', `${def.serviceRadius} tiles`);

    tip.appendChild(stats);

    // Requirements line
    const reqs: string[] = [];
    if (def.powerConsumption) reqs.push('Power');
    if (def.roadAccessRequired !== false && !def.isRoad && !def.conductsPower) reqs.push('Road');
    if (reqs.length > 0) {
      const reqLine = document.createElement('div');
      reqLine.className = 'brt-reqs';
      reqLine.textContent = `Needs: ${reqs.join(', ')}`;
      tip.appendChild(reqLine);
    }

    return tip;
  }
}
