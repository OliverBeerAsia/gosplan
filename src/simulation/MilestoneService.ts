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
  // Early population milestones (celebrate often in Era 1)
  { id: 'pop_25', type: 'population', threshold: 25, message: 'The first settlers arrive! Population: 25.' },
  { id: 'pop_50', type: 'population', threshold: 50, message: 'A small community takes shape! Population: 50.' },
  { id: 'pop_100', type: 'population', threshold: 100, message: 'The workers gather! Population reaches 100.' },
  { id: 'pop_150', type: 'population', threshold: 150, message: 'The settlement grows steadily. Population: 150.' },
  { id: 'pop_200', type: 'population', threshold: 200, message: 'A new era dawns! Population: 200. Industrialization begins!' },
  { id: 'pop_300', type: 'population', threshold: 300, message: 'The proletariat multiplies! Population: 300.' },
  { id: 'pop_500', type: 'population', threshold: 500, message: 'Comrade Planner, the city grows! Population: 500.' },
  { id: 'pop_750', type: 'population', threshold: 750, message: 'A thriving community! Population: 750.' },
  { id: 'pop_1000', type: 'population', threshold: 1000, message: 'The Central Committee commends your progress! Population: 1,000. Modernization begins!' },
  { id: 'pop_1500', type: 'population', threshold: 1500, message: 'A proper Soviet city takes form! Population: 1,500.' },
  { id: 'pop_2000', type: 'population', threshold: 2000, message: 'A true Soviet metropolis emerges! Population: 2,000.' },
  { id: 'pop_3000', type: 'population', threshold: 3000, message: 'Superpower status achieved! Population: 3,000. The Party HQ can now be built!' },
  { id: 'pop_5000', type: 'population', threshold: 5000, message: 'Glory to the city builders! Population: 5,000!' },
  { id: 'pop_10000', type: 'population', threshold: 10000, message: 'A great Soviet city stands! Population: 10,000!' },
  // Budget milestones
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
