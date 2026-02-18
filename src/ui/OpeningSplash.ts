import { assetPath } from '../utils/assetPath';

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

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'opening-splash';

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

    const commandDeck = document.createElement('div');
    commandDeck.className = 'opening-splash-command-deck';
    panel.appendChild(commandDeck);

    const heading = document.createElement('div');
    heading.className = 'opening-splash-heading';
    commandDeck.appendChild(heading);

    const title = document.createElement('div');
    title.className = 'opening-splash-title';
    title.textContent = 'GOSPLAN CENTRAL DIRECTIVE';
    heading.appendChild(title);

    const line = document.createElement('div');
    line.className = 'opening-splash-line';
    line.textContent = 'AUTHENTICATING DISTRICT TELEMETRY RELAY';
    heading.appendChild(line);

    const controls = document.createElement('div');
    controls.className = 'opening-splash-controls';
    commandDeck.appendChild(controls);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'opening-splash-progress-track';
    controls.appendChild(progressTrack);

    this.progressEl = document.createElement('div');
    this.progressEl.className = 'opening-splash-progress-fill';
    progressTrack.appendChild(this.progressEl);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'opening-splash-status';
    controls.appendChild(this.statusEl);

    this.startButtonEl = document.createElement('button');
    this.startButtonEl.className = 'opening-splash-start-btn';
    this.startButtonEl.type = 'button';
    this.startButtonEl.textContent = 'SYNCING...';
    this.startButtonEl.disabled = true;
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

    this.clearTimers();
    this.progressEl.style.width = '0%';
    this.startButtonEl.disabled = true;
    this.startButtonEl.classList.remove('ready');
    this.startButtonEl.textContent = 'SYNCING...';
    this.statusEl.textContent = skipAllowed ? 'PRESS ANY KEY TO FAST-FORWARD' : 'ESTABLISHING LINK';
    this.el.classList.add('visible');

    if (skipAllowed) {
      const onSkip = (): void => {
        skipRequested = true;
      };
      window.addEventListener('keydown', onSkip);
      this.el.addEventListener('pointerdown', onSkip);
      this.cleanupHandlers.push(() => {
        window.removeEventListener('keydown', onSkip);
        this.el.removeEventListener('pointerdown', onSkip);
      });
    }

    await new Promise<void>((resolve) => {
      const startedAt = performance.now();
      const tick = (): void => {
        const elapsed = performance.now() - startedAt;
        const pct = skipRequested ? 100 : Math.min(100, Math.floor((elapsed / durationMs) * 100));
        this.progressEl.style.width = `${pct}%`;
        this.statusEl.textContent = pct < 100
          ? (skipAllowed ? 'PRESS ANY KEY TO FAST-FORWARD' : 'ESTABLISHING LINK')
          : (requireStartButton ? 'PRESS START TO CONTINUE' : 'LINK CONFIRMED');

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
      this.startButtonEl.textContent = 'ENTER COMMAND TERMINAL';

      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = (): void => {
          if (settled) return;
          settled = true;
          resolve();
        };
        const onClick = (): void => finish();
        const onKey = (event: KeyboardEvent): void => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          finish();
        };

        this.startButtonEl.addEventListener('click', onClick);
        window.addEventListener('keydown', onKey);
        this.cleanupHandlers.push(() => {
          this.startButtonEl.removeEventListener('click', onClick);
          window.removeEventListener('keydown', onKey);
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
