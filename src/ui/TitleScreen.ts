import { CampaignScenarioId } from '../core/GameState';
import { CAMPAIGN_SCENARIOS } from '../simulation/CampaignScenarios';

type LaunchAction<TArgs extends unknown[]> = (...args: TArgs) => void | Promise<void>;
type StatusLevel = 'info' | 'success' | 'warning' | 'error';

export class TitleScreen {
  private el: HTMLDivElement;
  private onNewCampaign: LaunchAction<[CampaignScenarioId]>;
  private onNewSandbox: LaunchAction<[]>;
  private onLoadGame: LaunchAction<[]> | null;
  private onSaveArchive: (() => boolean) | null;
  private onBeforeLaunch: (() => void | Promise<void>) | null;
  private mainMenuEl: HTMLDivElement;
  private startMenuEl: HTMLDivElement;
  private creditsEl: HTMLDivElement;
  private statusEl: HTMLDivElement;
  private actionButtons: HTMLButtonElement[] = [];
  private actionLocked = false;

  constructor(
    container: HTMLElement,
    onNewCampaign: LaunchAction<[CampaignScenarioId]>,
    onNewSandbox: LaunchAction<[]>,
    onLoadGame: LaunchAction<[]> | null,
    onSaveArchive: (() => boolean) | null,
    onBeforeLaunch: (() => void | Promise<void>) | null = null
  ) {
    this.onNewCampaign = onNewCampaign;
    this.onNewSandbox = onNewSandbox;
    this.onLoadGame = onLoadGame;
    this.onSaveArchive = onSaveArchive;
    this.onBeforeLaunch = onBeforeLaunch;

    this.el = document.createElement('div');
    this.el.id = 'title-screen';

    const frame = document.createElement('div');
    frame.className = 'title-command-frame';
    this.el.appendChild(frame);

    const topLabel = document.createElement('div');
    topLabel.className = 'title-command-headline';
    topLabel.textContent = 'Central Committee Planning Terminal';
    frame.appendChild(topLabel);

    const h1 = document.createElement('h1');
    h1.textContent = 'GOSPLAN';
    frame.appendChild(h1);

    const h2 = document.createElement('h2');
    h2.textContent = 'Soviet City Builder Directive Console';
    frame.appendChild(h2);

    const desk = document.createElement('div');
    desk.className = 'title-briefing-desk';
    frame.appendChild(desk);

    const dossier = document.createElement('div');
    dossier.className = 'title-briefing-dossier';
    desk.appendChild(dossier);

    const map = document.createElement('div');
    map.className = 'title-briefing-map';
    desk.appendChild(map);

    const portrait = document.createElement('div');
    portrait.className = 'title-briefing-portrait';
    desk.appendChild(portrait);

    const seal = document.createElement('div');
    seal.className = 'title-briefing-seal';
    desk.appendChild(seal);

    const pixelBanner = document.createElement('pre');
    pixelBanner.className = 'title-pixel-banner';
    pixelBanner.textContent = [
      '[]==[]==[]==[]==[]==[]==[]==[]==[]==[]',
      '||  RED BANNER TRANSMISSION ONLINE   ||',
      '||  CITIZEN DIRECTIVES AWAIT INPUT   ||',
      '[]==[]==[]==[]==[]==[]==[]==[]==[]==[]',
    ].join('\n');
    frame.appendChild(pixelBanner);

    this.mainMenuEl = document.createElement('div');
    this.mainMenuEl.className = 'title-menu is-visible';

    const startBtn = this.createCommandButton('START GAME', 'primary');
    startBtn.addEventListener('click', () => this.openStartMenu());
    this.mainMenuEl.appendChild(startBtn);

    if (this.onLoadGame) {
      const continueBtn = this.createCommandButton('CONTINUE', 'secondary');
      continueBtn.addEventListener('click', () => {
        void this.runAction(() => this.onLoadGame?.());
      });
      this.mainMenuEl.appendChild(continueBtn);
    } else {
      const continueBtn = this.createCommandButton('CONTINUE (NO SAVE)', 'muted');
      continueBtn.disabled = true;
      continueBtn.dataset.fixedDisabled = 'true';
      this.mainMenuEl.appendChild(continueBtn);
    }

    const saveBtn = this.createCommandButton('SAVE GAME', 'warning');
    saveBtn.addEventListener('click', () => {
      if (!this.onSaveArchive) {
        this.setStatus('Archive service unavailable.', 'warning');
        return;
      }
      const exported = this.onSaveArchive();
      this.setStatus(
        exported
          ? 'Save archive exported to your downloads folder.'
          : 'No local save detected. Use Ctrl+S in-game first.',
        exported ? 'success' : 'warning'
      );
    });
    this.mainMenuEl.appendChild(saveBtn);

    const creditsBtn = this.createCommandButton('CREDITS', 'secondary');
    creditsBtn.addEventListener('click', () => this.toggleCredits(true));
    this.mainMenuEl.appendChild(creditsBtn);
    frame.appendChild(this.mainMenuEl);

    this.startMenuEl = document.createElement('div');
    this.startMenuEl.className = 'title-menu';

    const startLead = document.createElement('div');
    startLead.className = 'title-menu-lead';
    startLead.textContent = 'Select a campaign scenario or launch sandbox autonomy.';
    this.startMenuEl.appendChild(startLead);

    const scenarioWrap = document.createElement('div');
    scenarioWrap.id = 'title-scenarios';

    for (const scenario of CAMPAIGN_SCENARIOS) {
      const btn = document.createElement('button');
      btn.className = 'title-btn title-scenario-btn';
      btn.title = scenario.subtitle;

      if (scenario.cardArt) {
        const art = document.createElement('div');
        art.className = 'title-scenario-art';
        art.style.backgroundImage = `url("${scenario.cardArt}")`;
        btn.appendChild(art);
      }

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
        void this.runAction(() => this.onNewCampaign(scenario.id));
      });
      scenarioWrap.appendChild(btn);
    }
    this.startMenuEl.appendChild(scenarioWrap);

    const startRow = document.createElement('div');
    startRow.className = 'title-start-row';

    const sandboxBtn = this.createCommandButton('SANDBOX AUTONOMY', 'primary');
    sandboxBtn.addEventListener('click', () => {
      void this.runAction(() => this.onNewSandbox());
    });
    startRow.appendChild(sandboxBtn);

    const backBtn = this.createCommandButton('BACK TO COMMANDS', 'muted');
    backBtn.addEventListener('click', () => this.openMainMenu());
    startRow.appendChild(backBtn);
    this.startMenuEl.appendChild(startRow);
    frame.appendChild(this.startMenuEl);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'title-status';
    frame.appendChild(this.statusEl);
    this.setStatus('Awaiting central committee directive.', 'info');

    this.creditsEl = document.createElement('div');
    this.creditsEl.id = 'title-credits';

    const creditsPanel = document.createElement('div');
    creditsPanel.className = 'title-credits-panel';
    this.creditsEl.appendChild(creditsPanel);

    const creditsTitle = document.createElement('h3');
    creditsTitle.textContent = 'Credits';
    creditsPanel.appendChild(creditsTitle);

    const creditsBody = document.createElement('div');
    creditsBody.className = 'title-credits-body';
    creditsBody.innerHTML = [
      '<p>DESIGN BUREAU: Gosplan Interactive Works</p>',
      '<p>VISUAL PROPAGANDA: Pixel District Art Collective</p>',
      '<p>SIMULATION COMMAND: Central Planning Algorithms Unit</p>',
      '<p>THANK YOU FOR BUILDING THE FUTURE COMRADE CITY.</p>',
    ].join('');
    creditsPanel.appendChild(creditsBody);

    const creditsClose = this.createCommandButton('RETURN', 'secondary');
    creditsClose.addEventListener('click', () => this.toggleCredits(false));
    creditsPanel.appendChild(creditsClose);
    this.el.appendChild(this.creditsEl);

    container.appendChild(this.el);
  }

  private createCommandButton(
    label: string,
    kind: 'primary' | 'secondary' | 'warning' | 'muted'
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `title-command-btn ${kind}`;
    btn.textContent = label;
    this.actionButtons.push(btn);
    return btn;
  }

  private setStatus(text: string, level: StatusLevel): void {
    this.statusEl.textContent = text;
    this.statusEl.dataset.level = level;
  }

  private openMainMenu(): void {
    this.mainMenuEl.classList.add('is-visible');
    this.startMenuEl.classList.remove('is-visible');
    this.setStatus('Awaiting central committee directive.', 'info');
  }

  private openStartMenu(): void {
    this.mainMenuEl.classList.remove('is-visible');
    this.startMenuEl.classList.add('is-visible');
    this.setStatus('Launch profile selected. Confirm scenario command.', 'info');
  }

  private toggleCredits(show: boolean): void {
    this.creditsEl.classList.toggle('is-visible', show);
    if (show) {
      this.setStatus('Cultural bureau dispatching credits roll.', 'info');
    } else {
      this.setStatus('Credits closed. Awaiting command.', 'info');
    }
  }

  private setActionAvailability(enabled: boolean): void {
    for (const btn of this.actionButtons) {
      if (btn.dataset.fixedDisabled === 'true') {
        btn.disabled = true;
        continue;
      }
      btn.disabled = !enabled;
    }
  }

  private async runAction(action: () => void | Promise<void>): Promise<void> {
    if (this.actionLocked) return;
    this.actionLocked = true;
    this.setActionAvailability(false);
    this.setStatus('Forwarding launch order to state planners...', 'info');

    try {
      if (this.onBeforeLaunch) {
        await this.onBeforeLaunch();
      }
      await action();
    } catch {
      this.setStatus('Operation failed. Inspect console logs and retry.', 'error');
    } finally {
      this.actionLocked = false;
      this.setActionAvailability(true);
    }
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  show(): void {
    this.toggleCredits(false);
    this.openMainMenu();
    this.el.style.display = 'flex';
  }
}
