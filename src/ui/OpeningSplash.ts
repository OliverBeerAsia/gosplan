import { assetPath } from '../utils/assetPath';
import { activateModal } from './ModalFocus';

export interface OpeningSplashOptions {
  durationMs?: number;
  skipAllowed?: boolean;
  requireStartButton?: boolean;
}

export class OpeningSplash {
  private el: HTMLDivElement;
  private statusEl: HTMLDivElement;
  private progressEl: HTMLDivElement;
  private startButtonEl: HTMLButtonElement;
  private timeoutIds: number[] = [];
  private cleanupHandlers: Array<() => void> = [];
  private deactivateModal: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'opening-splash';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'opening-splash-title');
    this.el.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('div');
    panel.className = 'opening-splash-panel';
    this.el.appendChild(panel);

    const hero = document.createElement('img');
    hero.className = 'opening-splash-hero';
    const heroFallbackSrc = assetPath('assets/ui/opening-home.png');
    hero.src = assetPath('assets/ui/opening-home.webp');
    hero.addEventListener('error', () => {
      hero.src = heroFallbackSrc;
    }, { once: true });
    hero.alt = 'Gosplan opening home screen artwork';
    panel.appendChild(hero);

    const dossier = document.createElement('div');
    dossier.className = 'opening-splash-dossier';
    panel.appendChild(dossier);

    const heading = document.createElement('div');
    heading.className = 'opening-splash-heading';
    dossier.appendChild(heading);

    const title = document.createElement('h1');
    title.id = 'opening-splash-title';
    title.className = 'opening-splash-title';
    title.textContent = 'State Committee for Urban Development';
    heading.appendChild(title);

    const line = document.createElement('div');
    line.className = 'opening-splash-line';
    line.textContent = 'Municipal planning dossier prepared for review';
    heading.appendChild(line);

    const controls = document.createElement('div');
    controls.className = 'opening-splash-controls';
    dossier.appendChild(controls);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'opening-splash-progress-track';
    progressTrack.setAttribute('role', 'progressbar');
    progressTrack.setAttribute('aria-label', 'Preparing planning dossier');
    progressTrack.setAttribute('aria-valuemin', '0');
    progressTrack.setAttribute('aria-valuemax', '100');
    controls.appendChild(progressTrack);

    this.progressEl = document.createElement('div');
    this.progressEl.className = 'opening-splash-progress-fill';
    progressTrack.appendChild(this.progressEl);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'opening-splash-status';
    this.statusEl.id = 'opening-splash-status';
    this.statusEl.setAttribute('aria-live', 'polite');
    controls.appendChild(this.statusEl);

    this.startButtonEl = document.createElement('button');
    this.startButtonEl.className = 'opening-splash-start-btn';
    this.startButtonEl.type = 'button';
    this.startButtonEl.textContent = 'Preparing dossier...';
    this.startButtonEl.disabled = true;
    this.startButtonEl.setAttribute('aria-describedby', 'opening-splash-status');
    controls.appendChild(this.startButtonEl);

    container.appendChild(this.el);
  }

  async play(options: OpeningSplashOptions = {}): Promise<void> {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.classList.contains('reduced-motion');
    const durationMs = Math.max(1200, options.durationMs ?? (reduceMotion ? 1200 : 2600));
    const skipAllowed = Boolean(options.skipAllowed);
    const requireStartButton = options.requireStartButton ?? true;
    let skipRequested = false;
    const onSkip = (): void => {
      if (skipAllowed) skipRequested = true;
    };

    this.clearTimers();
    this.progressEl.style.width = '0%';
    this.startButtonEl.disabled = true;
    this.startButtonEl.classList.remove('ready');
    this.startButtonEl.textContent = 'Preparing dossier...';
    this.statusEl.textContent = skipAllowed
      ? 'Press any key to advance the briefing'
      : 'Reviewing district plans';
    this.el.classList.add('visible');
    this.el.setAttribute('aria-hidden', 'false');
    this.deactivateModal?.();
    this.deactivateModal = activateModal(this.el, {
      initialFocus: this.el,
      onEscape: skipAllowed ? onSkip : null,
      onKeyDown: skipAllowed ? onSkip : undefined,
    });

    if (skipAllowed) {
      this.el.addEventListener('pointerdown', onSkip);
      this.cleanupHandlers.push(() => {
        this.el.removeEventListener('pointerdown', onSkip);
      });
    }

    await new Promise<void>((resolve) => {
      const startedAt = performance.now();
      const tick = (): void => {
        const elapsed = performance.now() - startedAt;
        const pct = skipRequested ? 100 : Math.min(100, Math.floor((elapsed / durationMs) * 100));
        this.progressEl.style.width = `${pct}%`;
        this.progressEl.parentElement?.setAttribute('aria-valuenow', String(pct));
        this.statusEl.textContent = pct < 100
          ? (skipAllowed ? 'Press any key to advance the briefing' : 'Reviewing district plans')
          : (requireStartButton ? 'Planning dossier ready for review' : 'Planning bureau open');

        if (pct >= 100) {
          const doneId = window.setTimeout(() => {
            resolve();
          }, reduceMotion ? 80 : 180);
          this.timeoutIds.push(doneId);
          return;
        }

        const id = window.setTimeout(tick, reduceMotion ? 70 : 40);
        this.timeoutIds.push(id);
      };

      tick();
    });

    if (requireStartButton) {
      this.startButtonEl.disabled = false;
      this.startButtonEl.classList.add('ready');
      this.startButtonEl.textContent = 'Open planning bureau';

      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = (): void => {
          if (settled) return;
          settled = true;
          resolve();
        };
        const onClick = (): void => finish();

        this.startButtonEl.addEventListener('click', onClick);
        this.cleanupHandlers.push(() => {
          this.startButtonEl.removeEventListener('click', onClick);
        });

        const focusId = window.setTimeout(() => {
          this.startButtonEl.focus();
        }, reduceMotion ? 30 : 140);
        this.timeoutIds.push(focusId);
      });
    }

    this.hide();
  }

  hide(): void {
    this.clearTimers();
    this.el.classList.remove('visible');
    this.el.setAttribute('aria-hidden', 'true');
    this.deactivateModal?.();
    this.deactivateModal = null;
  }

  private clearTimers(): void {
    for (const id of this.timeoutIds) {
      window.clearTimeout(id);
    }
    this.timeoutIds.length = 0;
    for (const cleanup of this.cleanupHandlers) {
      cleanup();
    }
    this.cleanupHandlers.length = 0;
  }
}
