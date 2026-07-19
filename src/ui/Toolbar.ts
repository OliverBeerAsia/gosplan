import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { BuildingDef, BuildingCategory } from '../buildings/BuildingTypes';
import { EventBus } from '../core/EventBus';
import { GameStateData } from '../core/GameState';
import { ToolSnapshot, ToolType } from '../input/ToolController';
import { ZoneType } from '../grid/Cell';
import { audioManager } from '../audio/AudioManager';
import { ERA_TOOLBAR_CATEGORIES } from './UIProgressionManager';

type ToolCallback = (
  tool: ToolType,
  buildingId?: string,
  zone?: ZoneType,
  category?: BuildingCategory
) => void;

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
  private quickToolBar: HTMLDivElement;
  private demolishBtn: HTMLButtonElement;
  private inspectBtn: HTMLButtonElement;
  private helpEl: HTMLDivElement;
  private catBar!: HTMLDivElement;
  private lastEra = 0;
  private snapshot: ToolSnapshot | null = null;

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
        this.requestCategory(cat.id);
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

    this.demolishBtn = document.createElement('button');
    this.demolishBtn.className = 'quick-tool-btn destructive';
    this.demolishBtn.textContent = '\u2716 DEMOLISH';
    this.demolishBtn.title = 'Demolish (X)';
    this.demolishBtn.addEventListener('click', () => {
      audioManager.playSfx('ui_click');
      this.onToolSelect('demolish');
    });
    this.quickToolBar.appendChild(this.demolishBtn);

    this.inspectBtn = document.createElement('button');
    this.inspectBtn.className = 'quick-tool-btn';
    this.inspectBtn.textContent = '\u{1F50D} INSPECT';
    this.inspectBtn.title = 'Inspect (V)';
    this.inspectBtn.addEventListener('click', () => {
      audioManager.playSfx('ui_click');
      this.onToolSelect('select');
    });
    this.quickToolBar.appendChild(this.inspectBtn);

    this.el.appendChild(this.quickToolBar);

    this.helpEl = document.createElement('div');
    this.helpEl.className = 'help-text';
    this.helpEl.setAttribute('role', 'status');
    this.helpEl.setAttribute('aria-live', 'polite');
    this.el.appendChild(this.helpEl);

    container.appendChild(this.el);

    // All visible selection state is a projection of ToolController's snapshot.
    this.events.on('tool:selected', snapshot => this.renderToolState(snapshot));

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
      this.onToolSelect('select');
      return;
    }

    // Refresh building panel if open (buildings may have been added)
    if (this.activeCategory) {
      this.showBuildingPanel(this.activeCategory);
      if (this.snapshot) this.renderSelectedTool(this.snapshot);
    }
  }

  private requestCategory(catId: BuildingCategory): void {
    if (this.activeCategory === catId) {
      this.onToolSelect('select');
      return;
    }
    this.onToolSelect('select', undefined, undefined, catId);
  }

  private showBuildingPanel(catId: string): void {
    while (this.buildingPanel.firstChild) {
      this.buildingPanel.removeChild(this.buildingPanel.firstChild);
    }
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
    btn.dataset.zone = zone;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'building-name';
    nameSpan.textContent = label;
    btn.appendChild(nameSpan);

    const costSpan = document.createElement('span');
    costSpan.className = 'building-cost';
    costSpan.textContent = hint;
    btn.appendChild(costSpan);

    btn.addEventListener('click', () => {
      this.onToolSelect('zone', undefined, zone, this.activeCategory as BuildingCategory | undefined);
    });

    return btn;
  }

  cycleCategory(dir: number): void {
    const era = this.state?.currentEra ?? 4;
    const visible = new Set(ERA_TOOLBAR_CATEGORIES[era] ?? ERA_TOOLBAR_CATEGORIES[4]);
    const available = CATEGORIES.filter(cat => visible.has(cat.id));
    if (available.length === 0) return;

    const activeIndex = available.findIndex(cat => cat.id === this.activeCategory);
    const normalizedDir = dir < 0 ? -1 : 1;
    const nextIndex = activeIndex < 0
      ? (normalizedDir < 0 ? available.length - 1 : 0)
      : (activeIndex + normalizedDir + available.length) % available.length;
    this.requestCategory(available[nextIndex].id);
  }

  selectToolByName(name: string): void {
    if (name === 'demolish') {
      this.onToolSelect('demolish');
    } else if (name === 'select') {
      this.onToolSelect('select');
    } else {
      const def = this.registry.get(name);
      if (def) {
        this.onToolSelect('build', def.id, undefined, def.category);
      }
    }
  }

  clearSelection(): void {
    this.onToolSelect('select');
  }

  private createBuildingButton(def: BuildingDef): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'building-btn';
    btn.dataset.buildingId = def.id;

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
      this.onToolSelect('build', def.id, undefined, def.category);
    });

    return btn;
  }

  private renderToolState(snapshot: ToolSnapshot): void {
    this.snapshot = snapshot;

    if (this.activeCategory !== snapshot.category) {
      this.activeCategory = snapshot.category;
      if (snapshot.category) {
        this.showBuildingPanel(snapshot.category);
      } else {
        this.buildingPanel.classList.remove('visible');
      }
    }

    this.catBar.querySelectorAll<HTMLElement>('.category-btn').forEach(btn => {
      const active = btn.dataset.cat === snapshot.category;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    this.renderSelectedTool(snapshot);
    this.helpEl.textContent = snapshot.helpText;
    // The idle inspect prompts otherwise sit permanently mid-screen and
    // read as a stuck tooltip. Show help only when it names something
    // concrete (a selected tool, or a hovered building/amenity).
    const idleHelp = snapshot.tool === 'select'
      && (snapshot.helpText === 'Inspect buildings and city tiles'
        || snapshot.helpText === 'Inspect city tile');
    this.helpEl.style.display = idleHelp ? 'none' : '';
  }

  private renderSelectedTool(snapshot: ToolSnapshot): void {
    this.buildingPanel.querySelectorAll<HTMLElement>('.building-btn').forEach(btn => {
      const selected = snapshot.tool === 'build'
        ? btn.dataset.buildingId === snapshot.buildingId
        : snapshot.tool === 'zone' && btn.dataset.zone === snapshot.zone;
      btn.classList.toggle('selected', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });

    const demolishActive = snapshot.tool === 'demolish';
    const inspectActive = snapshot.tool === 'select';
    this.demolishBtn.classList.toggle('active', demolishActive);
    this.inspectBtn.classList.toggle('active', inspectActive);
    this.demolishBtn.setAttribute('aria-pressed', String(demolishActive));
    this.inspectBtn.setAttribute('aria-pressed', String(inspectActive));
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
