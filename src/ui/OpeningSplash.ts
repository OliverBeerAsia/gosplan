export interface OpeningSplashOptions {
  durationMs?: number;
  skipAllowed?: boolean;
}

export class OpeningSplash {
  private el: HTMLDivElement;
  private statusEl: HTMLDivElement;
  private progressEl: HTMLDivElement;
  private timeoutIds: number[] = [];
  private activeCleanup: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'opening-splash';

    const panel = document.createElement('div');
    panel.className = 'opening-splash-panel';
    this.el.appendChild(panel);

    const hero = document.createElement('img');
    hero.className = 'opening-splash-hero';
    hero.src = '/assets/ui/opening-home.png';
    hero.alt = 'Gosplan opening home screen artwork';
    panel.appendChild(hero);

    const title = document.createElement('div');
    title.className = 'opening-splash-title';
    title.textContent = 'GOSPLAN CENTRAL DIRECTIVE';
    panel.appendChild(title);

    const line = document.createElement('div');
    line.className = 'opening-splash-line';
    line.textContent = 'AUTHENTICATING DISTRICT TELEMETRY RELAY';
    panel.appendChild(line);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'opening-splash-progress-track';
    panel.appendChild(progressTrack);

    this.progressEl = document.createElement('div');
    this.progressEl.className = 'opening-splash-progress-fill';
    progressTrack.appendChild(this.progressEl);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'opening-splash-status';
    panel.appendChild(this.statusEl);

    container.appendChild(this.el);
  }

  async play(options: OpeningSplashOptions = {}): Promise<void> {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.classList.contains('reduced-motion');
    const durationMs = Math.max(900, options.durationMs ?? (reduceMotion ? 900 : 2200));
    const skipAllowed = Boolean(options.skipAllowed);
    let skipRequested = false;

    this.clearTimers();
    this.progressEl.style.width = '0%';
    this.statusEl.textContent = skipAllowed ? 'PRESS ANY KEY TO SKIP' : 'ESTABLISHING LINK';
    this.el.classList.add('visible');

    const onSkip = (): void => {
      skipRequested = true;
    };
    if (skipAllowed) {
      window.addEventListener('keydown', onSkip);
      this.el.addEventListener('pointerdown', onSkip);
      this.activeCleanup = () => {
        window.removeEventListener('keydown', onSkip);
        this.el.removeEventListener('pointerdown', onSkip);
        this.activeCleanup = null;
      };
    }

    await new Promise<void>((resolve) => {
      const startedAt = performance.now();
      const tick = (): void => {
        const elapsed = performance.now() - startedAt;
        const pct = skipRequested ? 100 : Math.min(100, Math.floor((elapsed / durationMs) * 100));
        this.progressEl.style.width = `${pct}%`;
        this.statusEl.textContent = pct < 100
          ? (skipAllowed ? 'PRESS ANY KEY TO SKIP' : 'ESTABLISHING LINK')
          : 'LINK CONFIRMED';

        if (pct >= 100) {
          const doneId = window.setTimeout(() => {
            this.hide();
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
    this.activeCleanup?.();
  }
}
