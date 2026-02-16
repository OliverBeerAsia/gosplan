import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { pushBulletinEntry } from '../core/Bulletin';

interface MilestoneDef {
  id: string;
  type: 'population' | 'budget';
  threshold: number;
  message: string;
}

const MILESTONES: MilestoneDef[] = [
  { id: 'pop_100', type: 'population', threshold: 100, message: 'The workers gather! Population reaches 100.' },
  { id: 'pop_500', type: 'population', threshold: 500, message: 'Comrade Planner, the city grows! Population: 500.' },
  { id: 'pop_1000', type: 'population', threshold: 1000, message: 'The Central Committee commends your progress! Population: 1,000.' },
  { id: 'pop_2000', type: 'population', threshold: 2000, message: 'A true Soviet metropolis emerges! Population: 2,000.' },
  { id: 'pop_5000', type: 'population', threshold: 5000, message: 'Glory to the city builders! Population: 5,000!' },
  { id: 'pop_10000', type: 'population', threshold: 10000, message: 'A great Soviet city stands! Population: 10,000!' },
  { id: 'budget_10k', type: 'budget', threshold: 10000, message: 'Treasury surpasses 10,000\u20BD. The state coffers fill.' },
  { id: 'budget_50k', type: 'budget', threshold: 50000, message: 'Treasury surpasses 50,000\u20BD. Industrial output fuels the treasury.' },
  { id: 'budget_100k', type: 'budget', threshold: 100000, message: 'Treasury surpasses 100,000\u20BD! A monument to socialist economics.' },
];

export class MilestoneService {
  private triggered: Set<string>;
  private tickCounter = 0;

  constructor(
    private state: GameStateData,
    private events: EventBus
  ) {
    // Restore persisted milestones from game state
    this.triggered = new Set(state.milestonesTriggered ?? []);
  }

  tick(): void {
    this.tickCounter++;
    if (this.tickCounter % 4 !== 0) return;

    for (const m of MILESTONES) {
      if (this.triggered.has(m.id)) continue;

      const value = m.type === 'population' ? this.state.population : this.state.budget;
      if (value >= m.threshold) {
        this.triggered.add(m.id);
        this.state.milestonesTriggered = [...this.triggered];
        this.events.emit('notification', {
          message: m.message,
          type: 'success',
        });
        pushBulletinEntry(this.state, this.events, m.message, 'success', `milestone_${m.id}`);
      }
    }
  }
}
