import { CampaignScenarioId } from '../core/GameState';
import { CAMPAIGN_SCENARIOS } from '../simulation/CampaignScenarios';
import { activateModal } from './ModalFocus';

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
  private creditsCloseEl: HTMLButtonElement;
  private statusEl: HTMLDivElement;
  private actionButtons: HTMLButtonElement[] = [];
  private actionLocked = false;
  private deactivateCreditsModal: (() => void) | null = null;

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

    const frame = document.createElement('main');
    frame.className = 'title-dossier-frame';
    this.el.appendChild(frame);

    const heading = document.createElement('header');
    heading.className = 'title-bureau-header';
    frame.appendChild(heading);

    const headingCopy = document.createElement('div');
    headingCopy.className = 'title-bureau-heading';
    heading.appendChild(headingCopy);

    const eyebrow = document.createElement('div');
    eyebrow.className = 'title-bureau-eyebrow';
    eyebrow.textContent = 'State Committee for Urban Development';
    headingCopy.appendChild(eyebrow);

    const h1 = document.createElement('h1');
    h1.textContent = 'GOSPLAN';
    headingCopy.appendChild(h1);

    const h2 = document.createElement('h2');
    h2.textContent = 'Municipal Planning Dossier';
    headingCopy.appendChild(h2);

    const stamp = document.createElement('div');
    stamp.className = 'title-bureau-stamp';
    stamp.setAttribute('aria-hidden', 'true');
    stamp.textContent = 'Approved for Planning';
    heading.appendChild(stamp);

    this.mainMenuEl = document.createElement('div');
    this.mainMenuEl.className = 'title-menu title-main-menu is-visible';
    this.mainMenuEl.setAttribute('aria-hidden', 'false');

    const mainLead = document.createElement('div');
    mainLead.className = 'title-menu-lead';
    mainLead.textContent = 'Choose a bureau service to begin your session.';
    this.mainMenuEl.appendChild(mainLead);

    const actionGrid = document.createElement('div');
    actionGrid.className = 'title-action-grid';
    this.mainMenuEl.appendChild(actionGrid);

    const startBtn = this.createActionButton('Open planning dossier', 'primary');
    startBtn.addEventListener('click', () => this.openStartMenu());
    actionGrid.appendChild(startBtn);

    if (this.onLoadGame) {
      const continueBtn = this.createActionButton('Restore archived city', 'secondary');
      continueBtn.addEventListener('click', () => {
        void this.runAction(() => this.onLoadGame?.());
      });
      actionGrid.appendChild(continueBtn);
    } else {
      const continueBtn = this.createActionButton('No archived city found', 'muted');
      continueBtn.disabled = true;
      continueBtn.dataset.fixedDisabled = 'true';
      actionGrid.appendChild(continueBtn);
    }

    const saveBtn = this.createActionButton('Export local city archive', 'warning');
    saveBtn.addEventListener('click', () => {
      if (!this.onSaveArchive) {
        this.setStatus('Archive service unavailable.', 'warning');
        return;
      }
      const exported = this.onSaveArchive();
      this.setStatus(
        exported
          ? 'City archive exported to your downloads folder.'
          : 'No local city record found. Save in-game first.',
        exported ? 'success' : 'warning'
      );
    });
    actionGrid.appendChild(saveBtn);

    const creditsBtn = this.createActionButton('Production credits', 'secondary');
    creditsBtn.addEventListener('click', () => this.toggleCredits(true));
    actionGrid.appendChild(creditsBtn);
    frame.appendChild(this.mainMenuEl);

    this.startMenuEl = document.createElement('div');
    this.startMenuEl.className = 'title-menu title-start-menu';
    this.startMenuEl.setAttribute('aria-hidden', 'true');

    const startLead = document.createElement('div');
    startLead.className = 'title-menu-lead';
    startLead.textContent = 'Select a development mandate or request unrestricted planning authority.';
    this.startMenuEl.appendChild(startLead);

    const scenarioWrap = document.createElement('div');
    scenarioWrap.id = 'title-scenarios';

    for (const scenario of CAMPAIGN_SCENARIOS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'title-scenario-card';
      btn.title = scenario.label;
      btn.setAttribute(
        'aria-label',
        `${scenario.label}. ${scenario.subtitle} Target year ${scenario.targetYear}.`
      );
      this.actionButtons.push(btn);

      const art = document.createElement('div');
      art.className = 'title-scenario-art';
      btn.appendChild(art);

      if (scenario.cardArt) {
        const image = document.createElement('img');
        image.src = scenario.cardArt;
        image.alt = '';
        image.decoding = 'async';
        image.draggable = false;
        image.addEventListener('error', () => art.classList.add('is-fallback'));
        art.appendChild(image);
      } else {
        art.classList.add('is-fallback');
      }

      const copy = document.createElement('div');
      copy.className = 'title-scenario-copy';
      btn.appendChild(copy);

      const label = document.createElement('div');
      label.className = 'title-scenario-label';
      label.textContent = scenario.label;
      copy.appendChild(label);

      const subtitle = document.createElement('div');
      subtitle.className = 'title-scenario-subtitle';
      subtitle.textContent = scenario.subtitle;
      copy.appendChild(subtitle);

      const target = document.createElement('div');
      target.className = 'title-scenario-target';
      target.textContent = `Planning horizon ${scenario.targetYear}`;
      copy.appendChild(target);

      btn.addEventListener('click', () => {
        void this.runAction(() => this.onNewCampaign(scenario.id));
      });
      scenarioWrap.appendChild(btn);
    }
    this.startMenuEl.appendChild(scenarioWrap);

    const startRow = document.createElement('div');
    startRow.className = 'title-start-row';

    const sandboxBtn = this.createActionButton('Begin unrestricted survey', 'primary');
    sandboxBtn.addEventListener('click', () => {
      void this.runAction(() => this.onNewSandbox());
    });
    startRow.appendChild(sandboxBtn);

    const backBtn = this.createActionButton('Return to bureau desk', 'muted');
    backBtn.addEventListener('click', () => this.openMainMenu(true));
    startRow.appendChild(backBtn);
    this.startMenuEl.appendChild(startRow);
    frame.appendChild(this.startMenuEl);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'title-status';
    this.statusEl.setAttribute('aria-live', 'polite');
    frame.appendChild(this.statusEl);
    this.setStatus('Choose an assignment to begin.', 'info');

    this.creditsEl = document.createElement('div');
    this.creditsEl.id = 'title-credits';
    this.creditsEl.setAttribute('role', 'dialog');
    this.creditsEl.setAttribute('aria-modal', 'true');
    this.creditsEl.setAttribute('aria-labelledby', 'title-credits-heading');
    this.creditsEl.setAttribute('aria-hidden', 'true');

    const creditsPanel = document.createElement('div');
    creditsPanel.className = 'title-credits-panel';
    this.creditsEl.appendChild(creditsPanel);

    const creditsTitle = document.createElement('h3');
    creditsTitle.id = 'title-credits-heading';
    creditsTitle.textContent = 'Production Credits';
    creditsPanel.appendChild(creditsTitle);

    const creditsBody = document.createElement('div');
    creditsBody.className = 'title-credits-body';
    creditsBody.innerHTML = [
      '<p>Design Bureau: Gosplan Interactive Works</p>',
      '<p>Visual Art: Pixel District Art Collective</p>',
      '<p>Simulation Office: Central Planning Algorithms Unit</p>',
      '<p>Thank you for building the future city.</p>',
    ].join('');
    creditsPanel.appendChild(creditsBody);

    this.creditsCloseEl = this.createActionButton('Return to bureau', 'secondary');
    this.creditsCloseEl.addEventListener('click', () => this.toggleCredits(false));
    creditsPanel.appendChild(this.creditsCloseEl);
    this.el.appendChild(this.creditsEl);

    this.el.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (
        !this.creditsEl.classList.contains('is-visible')
        && this.startMenuEl.classList.contains('is-visible')
      ) {
        this.openMainMenu(true);
      }
    });

    container.appendChild(this.el);
  }

  private createActionButton(
    label: string,
    kind: 'primary' | 'secondary' | 'warning' | 'muted'
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `title-action-btn ${kind}`;
    btn.textContent = label;
    this.actionButtons.push(btn);
    return btn;
  }

  private setStatus(text: string, level: StatusLevel): void {
    this.statusEl.textContent = text;
    this.statusEl.dataset.level = level;
  }

  private openMainMenu(moveFocus = false): void {
    this.mainMenuEl.classList.add('is-visible');
    this.mainMenuEl.setAttribute('aria-hidden', 'false');
    this.startMenuEl.classList.remove('is-visible');
    this.startMenuEl.setAttribute('aria-hidden', 'true');
    this.setStatus('Choose an assignment to begin.', 'info');
    if (moveFocus) this.focusFirstButton(this.mainMenuEl);
  }

  private openStartMenu(): void {
    this.mainMenuEl.classList.remove('is-visible');
    this.mainMenuEl.setAttribute('aria-hidden', 'true');
    this.startMenuEl.classList.add('is-visible');
    this.startMenuEl.setAttribute('aria-hidden', 'false');
    this.setStatus('Choose a development mandate.', 'info');
    this.focusFirstButton(this.startMenuEl);
  }

  private toggleCredits(show: boolean): void {
    if (this.creditsEl.classList.contains('is-visible') === show) return;
    this.creditsEl.classList.toggle('is-visible', show);
    this.creditsEl.setAttribute('aria-hidden', String(!show));
    if (show) {
      this.setStatus('Production credits open.', 'info');
      this.deactivateCreditsModal = activateModal(this.creditsEl, {
        initialFocus: this.creditsCloseEl,
        onEscape: () => this.toggleCredits(false),
      });
    } else {
      this.setStatus('Production credits closed.', 'info');
      this.deactivateCreditsModal?.();
      this.deactivateCreditsModal = null;
    }
  }

  private focusFirstButton(container: HTMLElement): void {
    container.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
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
    this.setStatus('Preparing the planning office...', 'info');

    try {
      if (this.onBeforeLaunch) {
        await this.onBeforeLaunch();
      }
      await action();
    } catch {
      this.setStatus('The planning office could not open. Please try again.', 'error');
    } finally {
      this.actionLocked = false;
      this.setActionAvailability(true);
    }
  }

  hide(): void {
    this.toggleCredits(false);
    this.el.style.display = 'none';
  }

  show(): void {
    this.toggleCredits(false);
    this.openMainMenu();
    this.el.style.display = 'flex';
  }
}
