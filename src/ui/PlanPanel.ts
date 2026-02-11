import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';

export class PlanPanel {
  private el: HTMLDivElement;
  private headerEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;

  constructor(container: HTMLElement, private state: GameStateData, private events: EventBus) {
    this.el = document.createElement('div');
    this.el.id = 'plan-panel';

    this.headerEl = document.createElement('div');
    this.headerEl.id = 'plan-panel-header';
    this.el.appendChild(this.headerEl);

    this.bodyEl = document.createElement('div');
    this.bodyEl.id = 'plan-panel-body';
    this.el.appendChild(this.bodyEl);

    container.appendChild(this.el);

    events.on('tick', () => this.update());
  }

  update(): void {
    const plan = this.state.currentPlan;
    if (!plan) {
      this.headerEl.textContent = 'AWAITING DIRECTIVES';
      while (this.bodyEl.firstChild) this.bodyEl.removeChild(this.bodyEl.firstChild);
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
    timer.textContent = timeStr;
    timer.style.color = ticksLeft < 52 ? '#EF5350' : '#FFD700';
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
      this.bodyEl.appendChild(goalEl);
    }
  }
}
