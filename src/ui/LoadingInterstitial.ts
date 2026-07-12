import { LoadingMusic } from '../audio/LoadingMusic';
import { ArtRegistry } from '../graphics/ArtRegistry';
import { assetPath } from '../utils/assetPath';
import { activateModal } from './ModalFocus';

export type LoadingMode = 'campaign' | 'sandbox' | 'load';

interface InterstitialScene {
  title: string;
  caption: string;
  accent: string;
  manifestId: string;
  fallbackFile: string;
}

interface LoadingPlayOptions {
  minDurationMs?: number;
  skipAllowed?: boolean;
}

const INTERSTITIAL_SCENES: Record<LoadingMode, InterstitialScene> = {
  campaign: {
    title: 'Industrial Mobilization',
    caption: 'Factories, housing brigades, and transport offices prepare the next city directive.',
    accent: 'Five-Year Development Office',
    manifestId: 'loading.industrial_mobilization',
    fallbackFile: 'assets/art/loading/industrial-mobilization.webp',
  },
  sandbox: {
    title: 'City Plan in Transit',
    caption: 'Survey crews carry a new district plan from the drafting table to the winter frontier.',
    accent: 'Ministry of Urban Development',
    manifestId: 'loading.city_plan_in_transit',
    fallbackFile: 'assets/art/loading/city-plan-in-transit.webp',
  },
  load: {
    title: 'Orbital Survey',
    caption: 'State archives and satellite maps are reconciled before the planning office reopens.',
    accent: 'Central Cartographic Bureau',
    manifestId: 'loading.orbital_survey',
    fallbackFile: 'assets/art/loading/orbital-survey.webp',
  },
};

const MODE_LABEL: Record<LoadingMode, string> = {
  campaign: 'Campaign Directive',
  sandbox: 'Planning Mandate',
  load: 'City Archive',
};

const MODE_BRIEF: Record<LoadingMode, string> = {
  campaign: 'The Committee has issued a new development assignment.',
  sandbox: 'Full planning autonomy has been granted for this territory.',
  load: 'The latest municipal record is being prepared for review.',
};

const PROGRESS_STAGES = [
  { threshold: 72, label: 'Reviewing the district plan' },
  { threshold: 94, label: 'Preparing the planning office' },
  { threshold: 101, label: 'Opening the city dossier' },
];

export class LoadingInterstitial {
  private el: HTMLDivElement;
  private modeEl: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private captionEl: HTMLParagraphElement;
  private accentEl: HTMLDivElement;
  private briefEl: HTMLParagraphElement;
  private artEl: HTMLElement;
  private artImageEl: HTMLImageElement;
  private progressFillEl: HTMLDivElement;
  private progressValueEl: HTMLDivElement;
  private progressStatusEl: HTMLDivElement;
  private skipButtonEl: HTMLButtonElement;
  private timeoutIds: number[] = [];
  private activeCleanup: (() => void) | null = null;
  private deactivateModal: (() => void) | null = null;
  private music = new LoadingMusic();

  constructor(container: HTMLElement, private artRegistry?: ArtRegistry) {
    this.el = document.createElement('div');
    this.el.id = 'loading-interstitial';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'loading-scene-title');
    this.el.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('section');
    panel.className = 'loading-dossier';
    this.el.appendChild(panel);

    const heading = document.createElement('header');
    heading.className = 'loading-heading';
    panel.appendChild(heading);

    this.modeEl = document.createElement('div');
    this.modeEl.className = 'loading-mode';
    heading.appendChild(this.modeEl);

    this.accentEl = document.createElement('div');
    this.accentEl.className = 'loading-accent';
    heading.appendChild(this.accentEl);

    this.titleEl = document.createElement('h2');
    this.titleEl.id = 'loading-scene-title';
    this.titleEl.className = 'loading-title';
    heading.appendChild(this.titleEl);

    this.briefEl = document.createElement('p');
    this.briefEl.className = 'loading-brief';
    heading.appendChild(this.briefEl);

    this.artEl = document.createElement('figure');
    this.artEl.className = 'loading-art is-fallback';
    panel.appendChild(this.artEl);

    const fallback = document.createElement('div');
    fallback.className = 'loading-art-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    this.artEl.appendChild(fallback);

    const fallbackSheet = document.createElement('div');
    fallbackSheet.className = 'loading-fallback-sheet';
    fallback.appendChild(fallbackSheet);

    const fallbackHeader = document.createElement('div');
    fallbackHeader.className = 'loading-fallback-header';
    fallbackHeader.innerHTML = '<span>Form 17-B</span><strong>Municipal Development Dossier</strong><span>State Archive</span>';
    fallbackSheet.appendChild(fallbackHeader);

    const fallbackPlan = document.createElement('div');
    fallbackPlan.className = 'loading-fallback-plan';
    fallbackPlan.innerHTML = [
      '<span class="loading-fallback-block block-a"></span>',
      '<span class="loading-fallback-block block-b"></span>',
      '<span class="loading-fallback-block block-c"></span>',
      '<span class="loading-fallback-block block-d"></span>',
      '<span class="loading-fallback-road road-a"></span>',
      '<span class="loading-fallback-road road-b"></span>',
      '<span class="loading-fallback-label">District plan under review</span>',
    ].join('');
    fallbackSheet.appendChild(fallbackPlan);

    const fallbackFooter = document.createElement('div');
    fallbackFooter.className = 'loading-fallback-footer';
    fallbackFooter.innerHTML = '<span>Housing</span><span>Industry</span><span>Transit</span><strong>Approved</strong>';
    fallbackSheet.appendChild(fallbackFooter);

    this.artImageEl = document.createElement('img');
    this.artImageEl.className = 'loading-art-image';
    this.artImageEl.decoding = 'async';
    this.artImageEl.draggable = false;
    this.artImageEl.addEventListener('load', () => {
      this.artEl.classList.remove('is-fallback');
    });
    this.artImageEl.addEventListener('error', () => {
      this.artEl.classList.add('is-fallback');
    });
    this.artEl.appendChild(this.artImageEl);

    this.captionEl = document.createElement('p');
    this.captionEl.className = 'loading-caption';
    panel.appendChild(this.captionEl);

    const footer = document.createElement('footer');
    footer.className = 'loading-footer';
    panel.appendChild(footer);

    const progress = document.createElement('div');
    progress.className = 'loading-progress';
    footer.appendChild(progress);

    const progressMeta = document.createElement('div');
    progressMeta.className = 'loading-progress-meta';
    progress.appendChild(progressMeta);

    this.progressStatusEl = document.createElement('div');
    this.progressStatusEl.className = 'loading-progress-status';
    this.progressStatusEl.setAttribute('aria-live', 'polite');
    progressMeta.appendChild(this.progressStatusEl);

    this.progressValueEl = document.createElement('div');
    this.progressValueEl.className = 'loading-progress-value';
    progressMeta.appendChild(this.progressValueEl);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'loading-progress-track';
    progressTrack.setAttribute('role', 'progressbar');
    progressTrack.setAttribute('aria-label', 'Preparing city');
    progress.appendChild(progressTrack);

    this.progressFillEl = document.createElement('div');
    this.progressFillEl.className = 'loading-progress-fill';
    progressTrack.appendChild(this.progressFillEl);

    this.skipButtonEl = document.createElement('button');
    this.skipButtonEl.type = 'button';
    this.skipButtonEl.className = 'loading-skip';
    this.skipButtonEl.textContent = 'Press any key to skip';
    footer.appendChild(this.skipButtonEl);

    container.appendChild(this.el);
    this.preloadSceneArt();
  }

  async play(mode: LoadingMode, opts: LoadingPlayOptions = {}): Promise<void> {
    this.clearTimers();
    this.deactivateModal?.();
    this.deactivateModal = null;
    void this.music.play();

    const reduceMotion = this.prefersReducedMotion();
    const scene = INTERSTITIAL_SCENES[mode] ?? INTERSTITIAL_SCENES.campaign;

    this.applyScene(scene, mode);
    this.setProgress(0);
    this.el.classList.add('visible');
    this.el.setAttribute('aria-hidden', 'false');

    const durationMs = Math.max(opts.minDurationMs ?? 0, reduceMotion ? 1200 : 4200);
    const skipAllowed = Boolean(opts.skipAllowed);
    let skipRequested = false;

    this.skipButtonEl.hidden = !skipAllowed;
    this.skipButtonEl.disabled = !skipAllowed;

    const onSkip = (): void => {
      if (!skipAllowed) return;
      skipRequested = true;
    };

    this.deactivateModal = activateModal(this.el, {
      initialFocus: skipAllowed ? this.skipButtonEl : this.el,
      onEscape: skipAllowed ? onSkip : null,
      onKeyDown: skipAllowed ? onSkip : undefined,
      restoreFocus: false,
    });

    if (skipAllowed) {
      this.el.addEventListener('pointerdown', onSkip);
      this.activeCleanup = () => {
        this.el.removeEventListener('pointerdown', onSkip);
        this.activeCleanup = null;
      };
    }

    await new Promise<void>((resolve) => {
      const started = performance.now();

      const tick = (): void => {
        const elapsed = performance.now() - started;
        const pct = skipRequested ? 100 : Math.min(100, Math.floor((elapsed / durationMs) * 100));
        this.setProgress(pct);

        if (pct >= 100) {
          const doneId = window.setTimeout(() => {
            this.hide();
            resolve();
          }, reduceMotion ? 80 : 300);
          this.timeoutIds.push(doneId);
          return;
        }

        const id = window.setTimeout(tick, reduceMotion ? 80 : 50);
        this.timeoutIds.push(id);
      };

      tick();
    });
  }

  hide(): void {
    this.clearTimers();
    this.music.stop();
    this.deactivateModal?.();
    this.deactivateModal = null;
    this.moveFocusOutsideInterstitial();
    this.el.classList.remove('visible');
    this.el.setAttribute('aria-hidden', 'true');
  }

  private applyScene(scene: InterstitialScene, mode: LoadingMode): void {
    this.modeEl.textContent = MODE_LABEL[mode];
    this.titleEl.textContent = scene.title;
    this.briefEl.textContent = MODE_BRIEF[mode];
    this.captionEl.textContent = scene.caption;
    this.accentEl.textContent = scene.accent;
    this.artEl.classList.add('is-fallback');
    this.artImageEl.alt = `${scene.title}: ${scene.caption}`;
    this.artImageEl.src = this.resolveSceneArt(scene);
  }

  private setProgress(pct: number): void {
    this.progressFillEl.style.width = `${pct}%`;
    this.progressValueEl.textContent = `${pct}%`;
    this.progressFillEl.parentElement?.setAttribute('aria-valuenow', String(pct));
    this.progressStatusEl.textContent = PROGRESS_STAGES.find(stage => pct < stage.threshold)?.label
      ?? PROGRESS_STAGES[PROGRESS_STAGES.length - 1].label;
  }

  private preloadSceneArt(): void {
    for (const scene of Object.values(INTERSTITIAL_SCENES)) {
      const image = new Image();
      image.decoding = 'async';
      image.src = this.resolveSceneArt(scene);
    }
  }

  private resolveSceneArt(scene: InterstitialScene): string {
    const manifestFile = this.artRegistry?.getLoading(scene.manifestId)?.file;
    return assetPath(manifestFile ?? scene.fallbackFile);
  }

  private clearTimers(): void {
    for (const id of this.timeoutIds) {
      window.clearTimeout(id);
    }
    this.timeoutIds.length = 0;
    this.activeCleanup?.();
  }

  private moveFocusOutsideInterstitial(): void {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement) || !this.el.contains(activeElement)) return;

    const gameContainer = this.el.closest<HTMLElement>('#game-container');
    const focusable = gameContainer
      ? Array.from(gameContainer.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
      )).find((candidate) => (
        !this.el.contains(candidate)
        && candidate.getClientRects().length > 0
        && !candidate.closest('[inert]')
        && candidate.getAttribute('aria-hidden') !== 'true'
      ))
      : undefined;
    const target = focusable ?? gameContainer ?? document.body;

    if (!target.hasAttribute('tabindex') && target !== document.body) {
      target.tabIndex = -1;
    }
    target.focus({ preventScroll: true });
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.classList.contains('reduced-motion');
  }
}
