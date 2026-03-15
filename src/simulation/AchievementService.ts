import { EventBus } from '../core/EventBus';
import { GameStateData } from '../core/GameState';
import { pushBulletinEntry } from '../core/Bulletin';

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  condition: (state: GameStateData) => boolean;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'power_grid_commissar',
    title: 'Power Grid Commissar',
    description: 'Reach 300MW power capacity.',
    condition: (s) => s.powerCapacity >= 300,
  },
  {
    id: 'people_first',
    title: 'People First',
    description: 'Maintain 70% happiness with at least 1,200 population.',
    condition: (s) => s.happiness >= 70 && s.population >= 1200,
  },
  {
    id: 'steel_titan',
    title: 'Steel Titan',
    description: 'Reach 2,500₽ industrial output per week.',
    condition: (s) => s.industrialOutput >= 2500,
  },
  {
    id: 'order_guardian',
    title: "People's Champion",
    description: 'Reach 80% city-wide happiness.',
    condition: (s) => s.happiness >= 80,
  },
  {
    id: 'modernist_mobility',
    title: 'Modernist Mobility',
    description: 'Reach commute and service access indexes of 70+.',
    condition: (s) => s.commuteIndex >= 70 && s.serviceAccessIndex >= 70,
  },
  {
    id: 'grand_planner',
    title: 'Grand Planner',
    description: 'Complete at least two Five-Year plans or finish a campaign above 70 score.',
    condition: (s) => s.planIndex >= 2 || (s.campaignEnded && s.campaignScore >= 70),
  },
];

export class AchievementService {
  private tickCounter = 0;

  constructor(
    private state: GameStateData,
    private events: EventBus
  ) {}

  tick(): void {
    this.tickCounter++;
    if (this.tickCounter % 3 !== 0) return;

    for (const achievement of ACHIEVEMENTS) {
      if (this.state.achievementsUnlocked.includes(achievement.id)) continue;
      if (!achievement.condition(this.state)) continue;

      this.state.achievementsUnlocked.push(achievement.id);
      this.events.emit('achievement:unlocked', {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
      });
      this.events.emit('notification', {
        message: `Achievement unlocked: ${achievement.title}`,
        type: 'success',
      });
      this.pushBulletin(
        `Achievement unlocked: ${achievement.title} - ${achievement.description}`,
        achievement.id
      );
    }
  }

  static getAll(): AchievementDef[] {
    return ACHIEVEMENTS;
  }

  private pushBulletin(text: string, achievementId: string): void {
    pushBulletinEntry(
      this.state,
      this.events,
      text,
      'success',
      `achievement_${achievementId}`
    );
  }
}
