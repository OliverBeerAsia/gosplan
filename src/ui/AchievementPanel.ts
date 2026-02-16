import { EventBus } from '../core/EventBus';
import { GameStateData } from '../core/GameState';
import { AchievementService } from '../simulation/AchievementService';

interface AchievementView {
  id: string;
  title: string;
  description: string;
}

const ALL_ACHIEVEMENTS: AchievementView[] = AchievementService.getAll().map(a => ({
  id: a.id,
  title: a.title,
  description: a.description,
}));

export class AchievementPanel {
  readonly el: HTMLDivElement;
  private summaryEl: HTMLDivElement;
  private listEl: HTMLDivElement;

  constructor(
    private state: GameStateData,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'achievement-panel';

    const header = document.createElement('div');
    header.id = 'achievement-panel-header';
    header.className = 'panel-shell-header';
    header.textContent = 'STATE HONORS';
    this.el.appendChild(header);

    this.summaryEl = document.createElement('div');
    this.summaryEl.id = 'achievement-summary';
    this.summaryEl.className = 'panel-shell-body';
    this.el.appendChild(this.summaryEl);

    this.listEl = document.createElement('div');
    this.listEl.id = 'achievement-list';
    this.listEl.className = 'panel-shell-body';
    this.el.appendChild(this.listEl);

    events.on('achievement:unlocked', ({ id }) => this.update(id));
    events.on('game:loaded', () => this.update());
    events.on('tick', () => {
      if (this.state.totalTicks % 10 === 0) {
        this.update();
      }
    });

    this.update();
  }

  update(highlightId?: string): void {
    this.summaryEl.textContent =
      `Unlocked ${this.state.achievementsUnlocked.length}/${ALL_ACHIEVEMENTS.length}`;

    while (this.listEl.firstChild) {
      this.listEl.removeChild(this.listEl.firstChild);
    }

    for (const achievement of ALL_ACHIEVEMENTS) {
      const unlocked = this.state.achievementsUnlocked.includes(achievement.id);

      const row = document.createElement('div');
      row.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}${highlightId === achievement.id ? ' highlight' : ''}`;

      const title = document.createElement('div');
      title.className = 'achievement-title';
      title.textContent = achievement.title;
      row.appendChild(title);

      const desc = document.createElement('div');
      desc.className = 'achievement-desc';
      desc.textContent = achievement.description;
      row.appendChild(desc);

      this.listEl.appendChild(row);
    }
  }
}
