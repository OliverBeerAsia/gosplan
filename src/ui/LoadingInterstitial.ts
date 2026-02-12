export type LoadingMode = 'campaign' | 'sandbox' | 'load';

interface InterstitialCard {
  title: string;
  caption: string;
  ticker: string;
  art: string;
}

const INTERSTITIAL_CARDS: InterstitialCard[] = [
  {
    title: 'RED STAR ORBIT',
    caption: 'Satellite relay confirms production telemetry in all districts.',
    ticker: 'COSMODROME UPLINK',
    art: [
      '        ##        ',
      '      ######      ',
      '    ##########    ',
      '  ######..######  ',
      '######......######',
      '  ######..######  ',
      '    ##########    ',
      '      ######      ',
      '        ##        ',
    ].join('\n'),
  },
  {
    title: 'TRACTOR COLUMN',
    caption: 'Agrarian brigades cleared steel route for urban expansion.',
    ticker: 'MOTOR POOL SYNC',
    art: [
      '____________________________',
      '|[]|[][][]|==|[][][]|[]|==>',
      '  O----O      O----O       ',
      '____________________________',
      '  SUPPLY CONVOY IN MOTION  ',
    ].join('\n'),
  },
  {
    title: 'FACTORY WHISTLE',
    caption: 'Industrial output whistles ahead of current quarter projections.',
    ticker: 'FOUNDRY SIGNAL',
    art: [
      '     ||      ||      ||     ',
      '  ___||___ ___||___ ___||___',
      ' | [] [] | [] [] | [] [] |  ',
      '=|______|_______|_______|===',
      '      SMOKE STACK ARRAY      ',
    ].join('\n'),
  },
];

const MODE_LABEL: Record<LoadingMode, string> = {
  campaign: 'CAMPAIGN BRIEFING',
  sandbox: 'SANDBOX AUTONOMY',
  load: 'STATE ARCHIVE RESTORE',
};

const BOOT_LINES = [
  'ALLOCATING WORKER CADRES',
  'STAMPING FIVE-YEAR DIRECTIVES',
  'SYNCHRONIZING MINISTRY TELETYPE',
  'CALIBRATING CONCRETE ALLOCATION',
  'VERIFYING DISTRICT BLUEPRINTS',
];

export class LoadingInterstitial {
  private el: HTMLDivElement;
  private modeEl: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private captionEl: HTMLDivElement;
  private tickerEl: HTMLDivElement;
  private artEl: HTMLPreElement;
  private progressFillEl: HTMLDivElement;
  private introEl: HTMLDivElement;
  private progressValueEl: HTMLDivElement;
  private timeoutIds: number[] = [];

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'loading-interstitial';

    const panel = document.createElement('div');
    panel.className = 'loading-panel';
    this.el.appendChild(panel);

    this.modeEl = document.createElement('div');
    this.modeEl.className = 'loading-mode';
    panel.appendChild(this.modeEl);

    this.titleEl = document.createElement('div');
    this.titleEl.className = 'loading-title';
    panel.appendChild(this.titleEl);

    this.artEl = document.createElement('pre');
    this.artEl.className = 'loading-art';
    panel.appendChild(this.artEl);

    this.captionEl = document.createElement('div');
    this.captionEl.className = 'loading-caption';
    panel.appendChild(this.captionEl);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'loading-progress-track';
    panel.appendChild(progressTrack);

    this.progressFillEl = document.createElement('div');
    this.progressFillEl.className = 'loading-progress-fill';
    progressTrack.appendChild(this.progressFillEl);

    this.progressValueEl = document.createElement('div');
    this.progressValueEl.className = 'loading-progress-value';
    panel.appendChild(this.progressValueEl);

    this.tickerEl = document.createElement('div');
    this.tickerEl.className = 'loading-ticker';
    panel.appendChild(this.tickerEl);

    this.introEl = document.createElement('div');
    this.introEl.className = 'loading-intro-dialog';
    this.el.appendChild(this.introEl);

    container.appendChild(this.el);
  }

  async play(mode: LoadingMode): Promise<void> {
    this.clearTimers();

    const firstCardIdx = Math.floor(Math.random() * INTERSTITIAL_CARDS.length);
    const secondCardIdx =
      (firstCardIdx + 1 + Math.floor(Math.random() * (INTERSTITIAL_CARDS.length - 1))) %
      INTERSTITIAL_CARDS.length;

    this.applyCard(INTERSTITIAL_CARDS[firstCardIdx], mode);
    this.progressFillEl.style.width = '0%';
    this.progressValueEl.textContent = '0%';
    this.el.classList.add('visible');

    this.renderIntroMessage(mode);

    const durationMs = 1700 + Math.floor(Math.random() * 700);
    const swapPct = 42 + Math.floor(Math.random() * 22);
    const bootLine = BOOT_LINES[Math.floor(Math.random() * BOOT_LINES.length)];
    let swapped = false;

    await new Promise<void>((resolve) => {
      const started = performance.now();

      const tick = (): void => {
        const elapsed = performance.now() - started;
        const pct = Math.min(100, Math.floor((elapsed / durationMs) * 100));
        this.progressFillEl.style.width = `${pct}%`;
        this.progressValueEl.textContent = `${pct}%`;
        this.tickerEl.textContent = `${bootLine} // ${this.currentTicker}`;

        if (!swapped && pct >= swapPct) {
          this.applyCard(INTERSTITIAL_CARDS[secondCardIdx], mode);
          swapped = true;
        }

        if (pct >= 100) {
          const doneId = window.setTimeout(() => {
            this.hide();
            resolve();
          }, 240);
          this.timeoutIds.push(doneId);
          return;
        }

        const waitMs = 55 + Math.floor(Math.random() * 70);
        const id = window.setTimeout(tick, waitMs);
        this.timeoutIds.push(id);
      };

      tick();
    });
  }

  hide(): void {
    this.clearTimers();
    this.el.classList.remove('visible');
  }

  private currentTicker = '';

  private applyCard(card: InterstitialCard, mode: LoadingMode): void {
    this.modeEl.textContent = MODE_LABEL[mode];
    this.titleEl.textContent = card.title;
    this.artEl.textContent = card.art;
    this.captionEl.textContent = card.caption;
    this.currentTicker = card.ticker;
    this.tickerEl.textContent = card.ticker;
    this.renderIntroMessage(mode);
  }

  private renderIntroMessage(mode: LoadingMode): void {
    const region = mode === 'sandbox' ? 'Nikolskaya Expanse' : 'Logovia Outpost';
    const tone = mode === 'load' ? 'State archives recall' : 'Command insists';
    const lines = [
      'COMRADE PLANNER CHECKING IN:',
      tone + ' that you, engineer, secure ' + region + '.',
      'ISOLATED RURAL STRUCTURES REQUIRE SIX MONTHS OF STEEL & SPIRIT.',
      'MAINTAIN GRID, SUPPRESS DOUBTS, BROADCAST PROGRESS WIRELESSLY.',
    ];
    this.introEl.innerHTML = lines.map(line => `<span>${line}</span>`).join('<br/>');
  }

  private clearTimers(): void {
    for (const id of this.timeoutIds) {
      window.clearTimeout(id);
    }
    this.timeoutIds.length = 0;
  }
}
