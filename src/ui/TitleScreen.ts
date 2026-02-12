import { CampaignScenarioId } from '../core/GameState';
import { CAMPAIGN_SCENARIOS } from '../simulation/CampaignScenarios';

export class TitleScreen {
  private el: HTMLDivElement;
  private onNewCampaign: (scenario: CampaignScenarioId) => void;
  private onNewSandbox: () => void;
  private onLoadGame: (() => void) | null;

  constructor(
    container: HTMLElement,
    onNewCampaign: (scenario: CampaignScenarioId) => void,
    onNewSandbox: () => void,
    onLoadGame: (() => void) | null
  ) {
    this.onNewCampaign = onNewCampaign;
    this.onNewSandbox = onNewSandbox;
    this.onLoadGame = onLoadGame;

    this.el = document.createElement('div');
    this.el.id = 'title-screen';

    const h1 = document.createElement('h1');
    h1.textContent = 'GOSPLAN';
    this.el.appendChild(h1);

    const h2 = document.createElement('h2');
    h2.textContent = 'Soviet City Builder';
    this.el.appendChild(h2);

    // Star decoration
    const star = document.createElement('div');
    star.textContent = '\u2605';
    star.style.cssText = 'font-size:48px;color:#FFD700;margin-bottom:32px;';
    this.el.appendChild(star);

    const scenarioWrap = document.createElement('div');
    scenarioWrap.id = 'title-scenarios';

    for (const scenario of CAMPAIGN_SCENARIOS) {
      const btn = document.createElement('button');
      btn.className = 'title-btn title-scenario-btn';
      btn.title = scenario.subtitle;

      const label = document.createElement('div');
      label.className = 'title-scenario-label';
      label.textContent = scenario.label.toUpperCase();
      btn.appendChild(label);

      const sub = document.createElement('div');
      sub.className = 'title-scenario-subtitle';
      sub.textContent = scenario.subtitle;
      btn.appendChild(sub);

      const target = document.createElement('div');
      target.className = 'title-scenario-target';
      target.textContent = `Target Year ${scenario.targetYear}`;
      btn.appendChild(target);

      btn.addEventListener('click', () => {
        this.hide();
        this.onNewCampaign(scenario.id);
      });
      scenarioWrap.appendChild(btn);
    }
    this.el.appendChild(scenarioWrap);

    const sandboxBtn = document.createElement('button');
    sandboxBtn.className = 'title-btn';
    sandboxBtn.textContent = 'NEW SANDBOX';
    sandboxBtn.addEventListener('click', () => {
      this.hide();
      this.onNewSandbox();
    });
    this.el.appendChild(sandboxBtn);

    if (onLoadGame) {
      const loadBtn = document.createElement('button');
      loadBtn.className = 'title-btn';
      loadBtn.textContent = 'CONTINUE';
      loadBtn.addEventListener('click', () => {
        this.hide();
        this.onLoadGame?.();
      });
      this.el.appendChild(loadBtn);
    }

    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    subtitle.textContent = 'Select campaign scenario or start sandbox autonomy';
    this.el.appendChild(subtitle);

    container.appendChild(this.el);
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  show(): void {
    this.el.style.display = 'flex';
  }
}
