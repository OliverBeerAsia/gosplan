import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { UIProgressionManager } from './UIProgressionManager';
import { BUILDING_ERA } from '../constants';

/**
 * Full-screen overlay that celebrates era transitions.
 * Auto-pauses, shows new buildings/features, then resumes on dismiss.
 */
export class EraUnlockOverlay {
  private overlay: HTMLDivElement;
  private previousSpeed = 1;

  constructor(
    private container: HTMLElement,
    private state: GameStateData,
    private registry: BuildingRegistry,
    private events: EventBus
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'era-unlock-overlay';
    this.overlay.style.display = 'none';
    this.container.appendChild(this.overlay);

    this.events.on('era:changed', ({ era }) => {
      this.show(era);
    });
  }

  private show(era: number): void {
    // Auto-pause
    this.previousSpeed = this.state.speed;
    this.events.emit('speed:changed', { speed: 0 });

    const eraName = UIProgressionManager.getEraName(era);
    const unlocks = UIProgressionManager.getEraUnlocks(era);

    // Get newly unlocked buildings
    const newBuildings = this.registry.getAll()
      .filter(b => (BUILDING_ERA[b.id] ?? 1) === era)
      .map(b => b.name);

    // Clear previous content safely
    while (this.overlay.firstChild) {
      this.overlay.removeChild(this.overlay.firstChild);
    }

    const content = document.createElement('div');
    content.className = 'era-unlock-content';

    const title = document.createElement('h2');
    title.className = 'era-unlock-title';
    title.textContent = `ERA ${era}: ${eraName.toUpperCase()}`;
    content.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'era-unlock-subtitle';
    subtitle.textContent = 'The city advances to a new stage of development!';
    content.appendChild(subtitle);

    if (newBuildings.length > 0) {
      const buildingSection = document.createElement('div');
      buildingSection.className = 'era-unlock-section';
      const bTitle = document.createElement('h3');
      bTitle.textContent = 'NEW BUILDINGS';
      buildingSection.appendChild(bTitle);
      const bList = document.createElement('div');
      bList.className = 'era-unlock-list';
      bList.textContent = newBuildings.join(' \u2022 ');
      buildingSection.appendChild(bList);
      content.appendChild(buildingSection);
    }

    if (unlocks.length > 0) {
      const featureSection = document.createElement('div');
      featureSection.className = 'era-unlock-section';
      const fTitle = document.createElement('h3');
      fTitle.textContent = 'NEW FEATURES';
      featureSection.appendChild(fTitle);
      for (const unlock of unlocks) {
        const item = document.createElement('div');
        item.className = 'era-unlock-feature';
        item.textContent = `\u2605 ${unlock}`;
        featureSection.appendChild(item);
      }
      content.appendChild(featureSection);
    }

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'era-unlock-dismiss';
    dismissBtn.textContent = 'CONTINUE';
    dismissBtn.addEventListener('click', () => this.dismiss());
    content.appendChild(dismissBtn);

    this.overlay.appendChild(content);
    this.overlay.style.display = '';

    // Also emit advisor congratulation
    this.events.emit('notification', {
      message: `Congratulations, Comrade! Your city has entered Era ${era}: ${eraName}!`,
      type: 'success',
    });
  }

  private dismiss(): void {
    this.overlay.style.display = 'none';
    // Resume at previous speed (at least 1x)
    const resumeSpeed = Math.max(1, this.previousSpeed);
    this.events.emit('speed:changed', { speed: resumeSpeed });
  }
}
