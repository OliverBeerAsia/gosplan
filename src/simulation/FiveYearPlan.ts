import { GameStateData, FiveYearPlan, FiveYearPlanGoal } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { FIVE_YEAR_PLAN_TICKS } from '../constants';
import { Grid } from '../grid/Grid';
import { BuildingRegistry } from '../buildings/BuildingRegistry';

const PLAN_TEMPLATES: (() => FiveYearPlanGoal[])[] = [
  // Plan 1: Basic housing and power (starts at Era 2, ~200 pop)
  () => [
    { description: 'House 300 comrades', type: 'population', target: 300, current: 0, completed: false },
    { description: 'Reach 50MW power capacity', type: 'power', target: 50, current: 0, completed: false },
  ],
  // Plan 2: Growth
  () => [
    { description: 'House 1,200 comrades', type: 'population', target: 1200, current: 0, completed: false },
    { description: 'Reach 100MW power capacity', type: 'power', target: 100, current: 0, completed: false },
    { description: 'Achieve 55% happiness', type: 'happiness', target: 55, current: 0, completed: false },
  ],
  // Plan 3: Industrialization
  () => [
    { description: 'House 5,000 comrades', type: 'population', target: 5000, current: 0, completed: false },
    { description: 'Industrial output of 1,000₽/week', type: 'industrial', target: 1000, current: 0, completed: false },
    { description: 'Housing for 8,000', type: 'housing', target: 8000, current: 0, completed: false },
  ],
  // Plan 4: Superpower
  () => [
    { description: 'House 10,000 comrades', type: 'population', target: 10000, current: 0, completed: false },
    { description: 'Reach 500MW power', type: 'power', target: 500, current: 0, completed: false },
    { description: 'Achieve 70% happiness', type: 'happiness', target: 70, current: 0, completed: false },
    { description: 'Industrial output of 3,000₽/week', type: 'industrial', target: 3000, current: 0, completed: false },
  ],
];

export class FiveYearPlanService {
  constructor(
    private grid: Grid,
    private registry: BuildingRegistry,
    private state: GameStateData,
    private events: EventBus
  ) {}

  tick(): void {
    if (this.state.mode === 'sandbox') return;

    // Five-Year Plans don't start until Era 2
    if (this.state.currentEra < 2) return;

    // Start first plan if none active
    if (!this.state.currentPlan) {
      this.startNextPlan();
    }

    const plan = this.state.currentPlan;
    if (!plan || !plan.active) return;

    // Update goal progress
    for (const goal of plan.goals) {
      switch (goal.type) {
        case 'population':
          goal.current = this.state.population;
          break;
        case 'power':
          goal.current = this.state.powerCapacity;
          break;
        case 'industrial':
          goal.current = this.state.industrialOutput;
          break;
        case 'housing':
          goal.current = this.state.housingCapacity;
          break;
        case 'happiness':
          goal.current = this.state.happiness;
          break;
      }
      goal.completed = goal.current >= goal.target;
    }

    // Check if plan period is over
    if (this.state.totalTicks >= plan.endTick) {
      this.evaluatePlan();
    }
  }

  private startNextPlan(): void {
    const idx = this.state.planIndex;
    const templateIdx = Math.min(idx, PLAN_TEMPLATES.length - 1);
    const goals = PLAN_TEMPLATES[templateIdx]();

    // Scale goals for later plans
    if (idx >= PLAN_TEMPLATES.length) {
      const scale = 1.5 ** (idx - PLAN_TEMPLATES.length + 1);
      for (const g of goals) {
        g.target = Math.floor(g.target * scale);
      }
    }

    this.state.currentPlan = {
      goals,
      startTick: this.state.totalTicks,
      endTick: this.state.totalTicks + FIVE_YEAR_PLAN_TICKS,
      active: true,
      index: idx,
    };

    this.events.emit('notification', {
      message: `Five-Year Plan ${idx + 1} has begun! Glory to the Soviet Union!`,
      type: 'info',
    });
  }

  private evaluatePlan(): void {
    const plan = this.state.currentPlan!;
    const allCompleted = plan.goals.every(g => g.completed);
    const anyCompleted = plan.goals.some(g => g.completed);

    // Extension mechanic: if any goals met but not all, grant one 26-week extension
    if (anyCompleted && !allCompleted && !this.state.planExtensionUsed) {
      this.state.planExtensionUsed = true;
      plan.endTick += 26; // half-year extension
      this.events.emit('notification', {
        message: `Five-Year Plan ${plan.index + 1}: Partial progress noted. The Committee grants a 6-month extension.`,
        type: 'warning',
      });
      return;
    }

    plan.active = false;

    if (allCompleted) {
      // Full success: enhanced bonus
      const bonus = 15000 + this.state.planIndex * 8000;
      this.state.budget += bonus;
      this.events.emit('notification', {
        message: `Five-Year Plan ${plan.index + 1} FULFILLED! +${bonus}₽ bonus! The Motherland is proud!`,
        type: 'success',
      });
    } else if (anyCompleted) {
      // Partial success
      this.events.emit('notification', {
        message: `Five-Year Plan ${plan.index + 1} partially met. The Party is watching, Comrade.`,
        type: 'warning',
      });
    } else {
      // Failure: reduced penalty (5% instead of 15%)
      const penalty = Math.floor(this.state.budget * 0.05);
      this.state.budget -= penalty;
      this.events.emit('notification', {
        message: `Five-Year Plan ${plan.index + 1} FAILED! -${penalty}₽ budget cut. Do better, Comrade!`,
        type: 'error',
      });
    }

    this.events.emit('plan:completed', { planIndex: plan.index, success: allCompleted });
    this.state.planIndex++;
    this.state.currentPlan = null;
    this.state.planExtensionUsed = false;
  }
}
