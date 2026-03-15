import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { ERA_THRESHOLDS } from '../constants';
import { UIProgressionManager } from './UIProgressionManager';

const GOAL_HINTS: Record<string, string> = {
  population: 'Paint Housing Zones, ensure power and happiness',
  power: 'Build Coal Power Plants (50MW each)',
  industrial: 'Paint Industry Zones near roads and power',
  housing: 'Build Kommunalka, Khrushchyovka, Stalinka, Panelak',
  happiness: 'Paint Green/Civic Zones and build services',
};

type PanelMode = 'sandbox' | 'campaign-ended' | 'era1' | 'awaiting' | 'plan';

export class PlanPanel {
  private el: HTMLDivElement;
  private headerEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private collapsed = false;

  // Cached DOM state to avoid full rebuilds every tick
  private currentMode: PanelMode | null = null;
  private cachedPlanIndex = -1;
  private cachedGoalCount = -1;

  // Cached mutable elements (updated in-place each tick)
  private titleSpan: HTMLSpanElement | null = null;
  private timerSpan: HTMLSpanElement | null = null;
  private messageEl: HTMLDivElement | null = null;
  private era1FillEl: HTMLDivElement | null = null;
  private era1LabelEl: HTMLSpanElement | null = null;
  private goalFills: HTMLDivElement[] = [];
  private goalLabels: HTMLSpanElement[] = [];

  constructor(container: HTMLElement, private state: GameStateData, private events: EventBus) {
    this.el = document.createElement('div');
    this.el.id = 'plan-panel';
    this.el.className = 'panel-shell panel-shell--gold';

    this.headerEl = document.createElement('div');
    this.headerEl.id = 'plan-panel-header';
    this.headerEl.className = 'panel-shell-header';
    this.headerEl.style.cursor = 'pointer';
    this.headerEl.addEventListener('click', () => this.toggleCollapse());
    this.el.appendChild(this.headerEl);

    this.bodyEl = document.createElement('div');
    this.bodyEl.id = 'plan-panel-body';
    this.bodyEl.className = 'panel-shell-body';
    this.el.appendChild(this.bodyEl);

    container.appendChild(this.el);

    events.on('tick', () => this.update());
    events.on('era:changed', () => { this.currentMode = null; this.update(); });
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.bodyEl.style.display = this.collapsed ? 'none' : '';
  }

  setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
    this.bodyEl.style.display = this.collapsed ? 'none' : '';
  }

  private getMode(): PanelMode {
    if (this.state.mode === 'sandbox') return 'sandbox';
    if (this.state.campaignEnded) return 'campaign-ended';
    if (this.state.currentEra < 2 && !this.state.currentPlan) return 'era1';
    if (!this.state.currentPlan) return 'awaiting';
    return 'plan';
  }

  private clearCached(): void {
    while (this.headerEl.firstChild) this.headerEl.removeChild(this.headerEl.firstChild);
    while (this.bodyEl.firstChild) this.bodyEl.removeChild(this.bodyEl.firstChild);
    this.titleSpan = null;
    this.timerSpan = null;
    this.messageEl = null;
    this.era1FillEl = null;
    this.era1LabelEl = null;
    this.goalFills = [];
    this.goalLabels = [];
  }

  private needsRebuild(): boolean {
    const mode = this.getMode();
    if (mode !== this.currentMode) return true;
    if (mode === 'plan') {
      const plan = this.state.currentPlan;
      if (!plan) return true;
      if (plan.index !== this.cachedPlanIndex) return true;
      if (plan.goals.length !== this.cachedGoalCount) return true;
    }
    return false;
  }

  update(): void {
    if (this.needsRebuild()) {
      this.rebuild();
    }
    this.refreshValues();
  }

  private rebuild(): void {
    const mode = this.getMode();
    this.currentMode = mode;
    this.clearCached();

    switch (mode) {
      case 'sandbox':
        this.buildSandbox();
        break;
      case 'campaign-ended':
        this.buildCampaignEnded();
        break;
      case 'era1':
        this.buildEra1();
        break;
      case 'awaiting':
        this.buildAwaiting();
        break;
      case 'plan':
        this.buildPlan();
        break;
    }
  }

  private buildSandbox(): void {
    this.titleSpan = document.createElement('span');
    this.titleSpan.textContent = 'SANDBOX MODE';
    this.headerEl.appendChild(this.titleSpan);

    this.messageEl = document.createElement('div');
    this.messageEl.className = 'plan-goal-text';
    this.bodyEl.appendChild(this.messageEl);
  }

  private buildCampaignEnded(): void {
    this.titleSpan = document.createElement('span');
    this.titleSpan.textContent = 'CAMPAIGN COMPLETE';
    this.headerEl.appendChild(this.titleSpan);

    this.messageEl = document.createElement('div');
    this.messageEl.className = 'plan-goal-text';
    this.bodyEl.appendChild(this.messageEl);
  }

  private buildEra1(): void {
    this.titleSpan = document.createElement('span');
    this.titleSpan.textContent = `ERA 1: ${UIProgressionManager.getEraName(1).toUpperCase()}`;
    this.headerEl.appendChild(this.titleSpan);

    const msg = document.createElement('div');
    msg.className = 'plan-goal-text';
    msg.textContent = 'Grow to 200 population to unlock Five-Year Plans';
    this.bodyEl.appendChild(msg);

    const barEl = document.createElement('div');
    barEl.className = 'plan-goal-bar';
    this.era1FillEl = document.createElement('div');
    this.era1FillEl.className = 'plan-goal-fill';
    barEl.appendChild(this.era1FillEl);
    this.era1LabelEl = document.createElement('span');
    this.era1LabelEl.className = 'plan-goal-label';
    barEl.appendChild(this.era1LabelEl);
    this.bodyEl.appendChild(barEl);

    const hint = document.createElement('div');
    hint.className = 'plan-goal-hint';
    hint.textContent = 'Build housing, roads, and power to attract citizens';
    this.bodyEl.appendChild(hint);
  }

  private buildAwaiting(): void {
    this.titleSpan = document.createElement('span');
    this.titleSpan.textContent = 'AWAITING DIRECTIVES';
    this.headerEl.appendChild(this.titleSpan);

    this.messageEl = document.createElement('div');
    this.messageEl.className = 'plan-goal-text';
    this.bodyEl.appendChild(this.messageEl);
  }

  private buildPlan(): void {
    const plan = this.state.currentPlan!;
    this.cachedPlanIndex = plan.index;
    this.cachedGoalCount = plan.goals.length;

    this.titleSpan = document.createElement('span');
    this.titleSpan.textContent = `FIVE-YEAR PLAN ${plan.index + 1}`;
    this.headerEl.appendChild(this.titleSpan);

    this.timerSpan = document.createElement('span');
    this.timerSpan.className = 'plan-panel-timer';
    this.headerEl.appendChild(this.timerSpan);

    this.goalFills = [];
    this.goalLabels = [];

    for (const goal of plan.goals) {
      const goalEl = document.createElement('div');
      goalEl.className = 'plan-goal';

      const textEl = document.createElement('div');
      textEl.className = 'plan-goal-text';
      textEl.textContent = goal.description;
      goalEl.appendChild(textEl);

      const barEl = document.createElement('div');
      barEl.className = 'plan-goal-bar';

      const fillEl = document.createElement('div');
      fillEl.className = 'plan-goal-fill';
      barEl.appendChild(fillEl);
      this.goalFills.push(fillEl);

      const labelEl = document.createElement('span');
      labelEl.className = 'plan-goal-label';
      barEl.appendChild(labelEl);
      this.goalLabels.push(labelEl);

      goalEl.appendChild(barEl);

      const hint = GOAL_HINTS[goal.type];
      if (hint) {
        const hintEl = document.createElement('div');
        hintEl.className = 'plan-goal-hint';
        hintEl.textContent = hint;
        goalEl.appendChild(hintEl);
      }

      this.bodyEl.appendChild(goalEl);
    }
  }

  /** Update only dynamic values — no DOM creation/destruction */
  private refreshValues(): void {
    switch (this.currentMode) {
      case 'sandbox':
        if (this.messageEl) {
          this.messageEl.textContent = this.state.activeDirective || 'No central directives in sandbox mode.';
        }
        break;

      case 'campaign-ended':
        if (this.messageEl) {
          this.messageEl.textContent = `Score ${this.state.campaignScore}/100 - ${this.state.campaignEndingTitle ?? 'Awaiting report'}.\nChoose "Continue as Sandbox" to keep building without campaign directives.`;
        }
        break;

      case 'era1': {
        const target = ERA_THRESHOLDS[1];
        const pct = Math.min(100, (this.state.peakPopulation / target) * 100);
        if (this.era1FillEl) this.era1FillEl.style.width = `${pct}%`;
        if (this.era1LabelEl) this.era1LabelEl.textContent = `${this.state.population}/${target}`;
        break;
      }

      case 'awaiting':
        if (this.messageEl) {
          this.messageEl.textContent = this.state.activeDirective || '';
        }
        break;

      case 'plan': {
        const plan = this.state.currentPlan;
        if (!plan) break;

        // Update timer
        if (this.timerSpan) {
          const ticksLeft = Math.max(0, plan.endTick - this.state.totalTicks);
          const yearsLeft = Math.floor(ticksLeft / 52);
          const wLeft = ticksLeft % 52;
          this.timerSpan.textContent = yearsLeft > 0 ? `${yearsLeft}y ${wLeft}w` : `${wLeft}w`;
          this.timerSpan.classList.toggle('warning', ticksLeft < 52);
        }

        // Update goal progress bars
        for (let i = 0; i < plan.goals.length; i++) {
          const goal = plan.goals[i];
          const fill = this.goalFills[i];
          const label = this.goalLabels[i];
          if (fill) {
            const pct = Math.min(100, (goal.current / goal.target) * 100);
            fill.style.width = `${pct}%`;
            fill.classList.toggle('completed', goal.completed);
          }
          if (label) {
            label.textContent = `${Math.floor(goal.current)}/${goal.target}`;
          }
        }
        break;
      }
    }
  }
}
