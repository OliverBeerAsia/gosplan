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

export class PlanPanel {
  private el: HTMLDivElement;
  private headerEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private collapsed = false;

  constructor(container: HTMLElement, private state: GameStateData, private events: EventBus) {
    this.el = document.createElement('div');
    this.el.id = 'plan-panel';
    this.el.className = 'panel-shell panel-shell--gold';

    this.headerEl = document.createElement('div');
    this.headerEl.id = 'plan-panel-header';
    this.headerEl.className = 'panel-shell-header';
    // Make header clickable for collapse/expand
    this.headerEl.style.cursor = 'pointer';
    this.headerEl.addEventListener('click', () => this.toggleCollapse());
    this.el.appendChild(this.headerEl);

    this.bodyEl = document.createElement('div');
    this.bodyEl.id = 'plan-panel-body';
    this.bodyEl.className = 'panel-shell-body';
    this.el.appendChild(this.bodyEl);

    container.appendChild(this.el);

    events.on('tick', () => this.update());
    events.on('era:changed', () => this.update());
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.bodyEl.style.display = this.collapsed ? 'none' : '';
  }

  setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
    this.bodyEl.style.display = this.collapsed ? 'none' : '';
  }

  update(): void {
    if (this.state.mode === 'sandbox') {
      while (this.headerEl.firstChild) this.headerEl.removeChild(this.headerEl.firstChild);
      const title = document.createElement('span');
      title.textContent = 'SANDBOX MODE';
      this.headerEl.appendChild(title);

      while (this.bodyEl.firstChild) this.bodyEl.removeChild(this.bodyEl.firstChild);
      const msg = document.createElement('div');
      msg.className = 'plan-goal-text';
      msg.textContent = this.state.activeDirective || 'No central directives in sandbox mode.';
      this.bodyEl.appendChild(msg);
      return;
    }

    if (this.state.campaignEnded) {
      while (this.headerEl.firstChild) this.headerEl.removeChild(this.headerEl.firstChild);
      const title = document.createElement('span');
      title.textContent = 'CAMPAIGN COMPLETE';
      this.headerEl.appendChild(title);

      while (this.bodyEl.firstChild) this.bodyEl.removeChild(this.bodyEl.firstChild);
      const msg = document.createElement('div');
      msg.className = 'plan-goal-text';
      msg.textContent = `Score ${this.state.campaignScore}/100 - ${this.state.campaignEndingTitle ?? 'Awaiting report'}.
Choose "Continue as Sandbox" to keep building without campaign directives.`;
      this.bodyEl.appendChild(msg);
      return;
    }

    // Era 1: show population progress toward unlocking Five-Year Plans
    if (this.state.currentEra < 2 && !this.state.currentPlan) {
      while (this.headerEl.firstChild) this.headerEl.removeChild(this.headerEl.firstChild);
      const title = document.createElement('span');
      title.textContent = `ERA 1: ${UIProgressionManager.getEraName(1).toUpperCase()}`;
      this.headerEl.appendChild(title);

      while (this.bodyEl.firstChild) this.bodyEl.removeChild(this.bodyEl.firstChild);

      const msg = document.createElement('div');
      msg.className = 'plan-goal-text';
      msg.textContent = 'Grow to 200 population to unlock Five-Year Plans';
      this.bodyEl.appendChild(msg);

      const barEl = document.createElement('div');
      barEl.className = 'plan-goal-bar';
      const fillEl = document.createElement('div');
      fillEl.className = 'plan-goal-fill';
      const target = ERA_THRESHOLDS[1]; // 200
      const pct = Math.min(100, (this.state.peakPopulation / target) * 100);
      fillEl.style.width = `${pct}%`;
      barEl.appendChild(fillEl);
      const labelEl = document.createElement('span');
      labelEl.className = 'plan-goal-label';
      labelEl.textContent = `${this.state.population}/${target}`;
      barEl.appendChild(labelEl);
      this.bodyEl.appendChild(barEl);

      const hint = document.createElement('div');
      hint.className = 'plan-goal-hint';
      hint.textContent = 'Build housing, roads, and power to attract citizens';
      this.bodyEl.appendChild(hint);
      return;
    }

    const plan = this.state.currentPlan;
    if (!plan) {
      this.headerEl.textContent = 'AWAITING DIRECTIVES';
      while (this.bodyEl.firstChild) this.bodyEl.removeChild(this.bodyEl.firstChild);
      if (this.state.activeDirective) {
        const msg = document.createElement('div');
        msg.className = 'plan-goal-text';
        msg.textContent = this.state.activeDirective;
        this.bodyEl.appendChild(msg);
      }
      return;
    }

    // Header
    while (this.headerEl.firstChild) this.headerEl.removeChild(this.headerEl.firstChild);
    const title = document.createElement('span');
    title.textContent = `FIVE-YEAR PLAN ${plan.index + 1}`;
    this.headerEl.appendChild(title);

    const ticksLeft = Math.max(0, plan.endTick - this.state.totalTicks);
    const weeksLeft = ticksLeft;
    const yearsLeft = Math.floor(weeksLeft / 52);
    const wLeft = weeksLeft % 52;
    const timeStr = yearsLeft > 0 ? `${yearsLeft}y ${wLeft}w` : `${wLeft}w`;
    const timer = document.createElement('span');
    timer.className = 'plan-panel-timer';
    timer.textContent = timeStr;
    if (ticksLeft < 52) {
      timer.classList.add('warning');
    }
    this.headerEl.appendChild(timer);

    // Goals
    while (this.bodyEl.firstChild) this.bodyEl.removeChild(this.bodyEl.firstChild);

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
      fillEl.className = 'plan-goal-fill' + (goal.completed ? ' completed' : '');
      const pct = Math.min(100, (goal.current / goal.target) * 100);
      fillEl.style.width = `${pct}%`;
      barEl.appendChild(fillEl);

      const labelEl = document.createElement('span');
      labelEl.className = 'plan-goal-label';
      labelEl.textContent = `${Math.floor(goal.current)}/${goal.target}`;
      barEl.appendChild(labelEl);

      goalEl.appendChild(barEl);

      // Hint below goal bar
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
}
