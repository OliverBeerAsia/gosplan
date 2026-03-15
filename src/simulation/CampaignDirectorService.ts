import { EventBus } from '../core/EventBus';
import { BulletinEntry, GameStateData } from '../core/GameState';
import { pushBulletinEntry } from '../core/Bulletin';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function planCompletionRatio(state: GameStateData): number {
  const plan = state.currentPlan;
  if (!plan || plan.goals.length === 0) return 0.5;

  let progress = 0;
  for (const goal of plan.goals) {
    const ratio = goal.target > 0 ? goal.current / goal.target : 0;
    progress += Math.max(0, Math.min(1, ratio));
  }
  return progress / plan.goals.length;
}

export class CampaignDirectorService {
  private tickCounter = 0;

  constructor(
    private state: GameStateData,
    private events: EventBus
  ) {}

  tick(): void {
    if (this.state.mode === 'sandbox') {
      this.setDirective('Sandbox autonomy: experiment with city layouts and policy outcomes.', 18);
      return;
    }

    this.tickCounter++;
    if (this.tickCounter % 6 !== 0) return;

    const budgetHealth = clamp(50 + this.state.budget / 4000, 0, 100);
    const powerBalance = clamp(50 + (this.state.powerCapacity - this.state.powerDemand) * 2, 0, 100);
    const planProgress = planCompletionRatio(this.state) * 100;
    const performance = clamp(
      budgetHealth * 0.2 +
      this.state.happiness * 0.30 +
      this.state.commuteIndex * 0.13 +
      this.state.serviceAccessIndex * 0.15 +
      powerBalance * 0.12 +
      planProgress * 0.1,
      0,
      100
    );

    const pressure = clamp(Math.round(100 - performance), 0, 100);
    this.state.performancePressure = pressure;

    const directive = this.pickDirective(pressure);
    this.setDirective(directive, pressure);
  }

  private pickDirective(pressure: number): string {
    if (this.state.powerDemand > this.state.powerCapacity) {
      return 'Emergency Electrification Drive: expand generation and connect every district.';
    }
    if (this.state.happiness < 35) {
      return 'Citizen Welfare Campaign: expand civic services and neighborhood support.';
    }
    if (this.state.residentialDemand > 40) {
      return 'Housing Acceleration Program: prioritize mass residential expansion.';
    }
    if (this.state.industrialDemand > 35) {
      return 'Steel and Concrete Push: increase industrial throughput and logistics.';
    }
    if (pressure < 30) {
      return 'Prestige Modernization Initiative: improve transit, culture, and scientific districts.';
    }
    return 'Balanced Five-Year Consolidation: maintain growth while avoiding deficits.';
  }

  private setDirective(directive: string, pressure: number): void {
    const directiveChanged = this.state.activeDirective !== directive;
    const pressureChanged = this.state.performancePressure !== pressure;
    if (!directiveChanged && !pressureChanged) return;

    this.state.activeDirective = directive;
    this.state.performancePressure = pressure;
    this.events.emit('directive:changed', { directive, pressure });

    if (!directiveChanged) {
      return;
    }

    const type = pressure >= 65 ? 'warning' : 'info';
    this.pushBulletin(`Central directive updated: ${directive}`, type);
    this.events.emit('notification', {
      message: `Directive updated: ${directive}`,
      type,
    });
  }

  private pushBulletin(text: string, level: BulletinEntry['level']): void {
    pushBulletinEntry(this.state, this.events, text, level, 'directive');
  }
}
