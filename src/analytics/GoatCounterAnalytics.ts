import { EventBus } from '../core/EventBus';
import { CampaignScenarioId, GameMode } from '../core/GameState';

type GoatCounterCountPayload = {
  path: string;
  title?: string;
  event?: boolean;
};

type GoatCounterGlobal = {
  count?: (payload: GoatCounterCountPayload) => void;
};

type RuntimeAnalyticsConfig = {
  goatcounterEndpoint?: string;
  enabled?: boolean;
  debug?: boolean;
};

declare global {
  interface Window {
    goatcounter?: GoatCounterGlobal;
    __GOSPLAN_ANALYTICS__?: RuntimeAnalyticsConfig;
  }
}

interface GoatCounterConfig {
  endpoint: string;
  enabled: boolean;
  debug: boolean;
}

const GOATCOUNTER_SCRIPT_SRC = 'https://gc.zgo.at/count.js';
const MAX_QUEUED_EVENTS = 120;

export class GoatCounterAnalytics {
  private enabled = false;
  private debug = false;
  private ready = false;
  private listenersBound = false;
  private queued: GoatCounterCountPayload[] = [];
  private lastSentAtByKey = new Map<string, number>();

  constructor(private events: EventBus) {}

  init(): void {
    const cfg = this.readConfig();
    this.enabled = cfg.enabled;
    this.debug = cfg.debug;

    if (!cfg.enabled || !cfg.endpoint) {
      return;
    }

    this.bindEventListeners();
    this.ensureScript(cfg.endpoint);
    this.track('session/start', 'GOSPLAN session started', 0);
  }

  trackGameStart(
    mode: GameMode,
    scenarioId: CampaignScenarioId,
    loadSave: boolean
  ): void {
    const source = loadSave ? 'load' : 'new';
    this.track(
      `game/start/${this.slug(mode)}/${this.slug(scenarioId)}/${source}`,
      `Game started (${mode}, ${scenarioId}, ${source})`,
      0
    );
  }

  private bindEventListeners(): void {
    if (this.listenersBound) return;
    this.listenersBound = true;

    this.events.on('building:placed', ({ defId }) => {
      this.track(`building/placed/${this.slug(defId)}`, `Building placed: ${defId}`, 0);
    });

    this.events.on('building:demolished', ({ building }) => {
      this.track(`building/demolished/${this.slug(building.defId)}`, `Building demolished: ${building.defId}`, 0);
    });

    this.events.on('placement:rejected', ({ reason, buildingId }) => {
      this.track(
        `building/rejected/${this.slug(buildingId)}/${this.slug(reason)}`,
        `Placement rejected: ${buildingId} (${reason})`,
        4000
      );
    });

    this.events.on('mode:changed', ({ mode }) => {
      this.track(`mode/changed/${this.slug(mode)}`, `Mode changed to ${mode}`, 1200);
    });

    this.events.on('plan:completed', ({ planIndex, success }) => {
      this.track(
        `plan/completed/${success ? 'success' : 'failed'}`,
        `Five-Year plan ${planIndex} ${success ? 'success' : 'failed'}`,
        0
      );
    });

    this.events.on('campaign:ended', ({ endingId, score }) => {
      this.track(
        `campaign/ended/${this.slug(endingId)}`,
        `Campaign ended: ${endingId} (${Math.round(score)})`,
        0
      );
    });

    this.events.on('achievement:unlocked', ({ id, title }) => {
      this.track(
        `achievement/unlocked/${this.slug(id)}`,
        `Achievement unlocked: ${title}`,
        0
      );
    });

    this.events.on('event:choice:selected', ({ eventId, choiceId }) => {
      this.track(
        `event/choice/${this.slug(eventId)}/${this.slug(choiceId)}`,
        `Event choice selected: ${eventId}/${choiceId}`,
        0
      );
    });

    this.events.on('tutorial:completed', () => {
      this.track('tutorial/completed', 'Tutorial completed', 0);
    });

    this.events.on('game:saved', () => {
      this.track('game/saved', 'Game saved', 1500);
    });
  }

  private readConfig(): GoatCounterConfig {
    const runtime = window.__GOSPLAN_ANALYTICS__ ?? {};
    const metaEndpoint = document
      .querySelector<HTMLMetaElement>('meta[name="goatcounter-endpoint"]')
      ?.content
      ?.trim();
    const metaDebug = document
      .querySelector<HTMLMetaElement>('meta[name="goatcounter-debug"]')
      ?.content
      ?.trim();

    const endpoint = (runtime.goatcounterEndpoint ?? metaEndpoint ?? '').trim();
    const enabled = runtime.enabled ?? endpoint.length > 0;
    const debug = runtime.debug ?? (metaDebug === '1' || metaDebug === 'true');
    return { endpoint, enabled, debug };
  }

  private ensureScript(endpoint: string): void {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gosplan-goatcounter="1"]');
    if (existing) {
      this.awaitReady();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = GOATCOUNTER_SCRIPT_SRC;
    script.dataset.gosplanGoatcounter = '1';
    script.dataset.goatcounter = endpoint;
    script.dataset.goatcounterSettings = JSON.stringify({
      no_onload: true,
      no_events: true,
      allow_local: this.isLocalHost(),
    });
    script.addEventListener('load', () => this.awaitReady());
    document.head.appendChild(script);
    this.awaitReady();
  }

  private awaitReady(): void {
    if (typeof window.goatcounter?.count === 'function') {
      this.ready = true;
      this.flushQueued();
      return;
    }

    window.setTimeout(() => this.awaitReady(), 200);
  }

  private track(path: string, title: string, dedupeMs: number): void {
    if (!this.enabled) return;

    const normalizedPath = this.normalizePath(path);
    const key = `${normalizedPath}:${title}`;
    if (dedupeMs > 0) {
      const now = Date.now();
      const last = this.lastSentAtByKey.get(key) ?? 0;
      if (now - last < dedupeMs) {
        return;
      }
      this.lastSentAtByKey.set(key, now);
    }

    const payload: GoatCounterCountPayload = {
      path: normalizedPath,
      title,
      event: true,
    };

    if (this.ready && typeof window.goatcounter?.count === 'function') {
      window.goatcounter.count(payload);
      if (this.debug) {
        console.info('[analytics]', payload.path, payload.title ?? '');
      }
      return;
    }

    if (this.queued.length >= MAX_QUEUED_EVENTS) {
      this.queued.shift();
    }
    this.queued.push(payload);
  }

  private flushQueued(): void {
    if (!this.ready || typeof window.goatcounter?.count !== 'function') {
      return;
    }
    while (this.queued.length > 0) {
      const payload = this.queued.shift();
      if (!payload) break;
      window.goatcounter.count(payload);
      if (this.debug) {
        console.info('[analytics]', payload.path, payload.title ?? '');
      }
    }
  }

  private normalizePath(rawPath: string): string {
    const parts = rawPath
      .split('/')
      .map(part => this.slug(part))
      .filter(Boolean);
    return `gosplan/${parts.join('/')}`;
  }

  private slug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72);
  }

  private isLocalHost(): boolean {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }
}
