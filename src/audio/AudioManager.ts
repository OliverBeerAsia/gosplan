/**
 * Singleton audio manager for all game sounds.
 * Uses Web Audio API for procedural audio generation.
 */

import { SoundBank, SoundId } from './SoundBank';
import { EventBus } from '../core/EventBus';

const STORAGE_KEY = 'gosplan_audio_settings';

export interface AudioSettings {
  masterVolume: number; // 0-1
  sfxVolume: number;    // 0-1
  musicVolume: number;  // 0-1
}

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.5,
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private soundBank: SoundBank | null = null;
  private settings: AudioSettings;
  private initialized = false;
  private ambienceNodes: OscillatorNode[] = [];
  private ambienceActive = false;
  private lastPopTier = -1;

  constructor() {
    this.settings = this.loadSettings();
  }

  /** Initialize audio context (must be called after user interaction) */
  init(): void {
    if (this.initialized) return;

    try {
      const Ctor = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;

      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.connect(this.masterGain);

      this.soundBank = new SoundBank(this.ctx);
      this.applySettings();
      this.initialized = true;
    } catch {
      // Audio is best-effort
    }
  }

  /** Wire up event bus for automatic sound triggers */
  connectEvents(events: EventBus): void {
    events.on('building:placed', () => this.playSfx('place'));
    events.on('building:demolished', () => this.playSfx('demolish'));
    events.on('event:triggered', () => this.playSfx('event_alert'));
    events.on('achievement:unlocked', () => this.playSfx('achievement'));
  }

  playSfx(id: SoundId): void {
    if (!this.initialized || !this.soundBank || !this.sfxGain) return;
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume();
    }
    this.soundBank.play(id, this.sfxGain);
  }

  /** Update ambient city loop based on population */
  updateAmbience(population: number): void {
    if (!this.initialized || !this.ctx || !this.ambienceGain) return;

    const tier = population < 100 ? 0 : population < 500 ? 1 : population < 2000 ? 2 : 3;
    if (tier === this.lastPopTier) return;
    this.lastPopTier = tier;

    this.stopAmbience();

    if (tier === 0) return; // silence for empty city

    const now = this.ctx.currentTime;

    // Low hum base
    const hum = this.ctx.createOscillator();
    const humGain = this.ctx.createGain();
    const humFilter = this.ctx.createBiquadFilter();
    hum.type = 'sawtooth';
    hum.frequency.value = 55 + tier * 10;
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 200 + tier * 100;
    humFilter.Q.value = 0.5;
    humGain.gain.setValueAtTime(0.001, now);
    humGain.gain.linearRampToValueAtTime(0.015 + tier * 0.005, now + 2);
    hum.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(this.ambienceGain);
    hum.start(now);
    this.ambienceNodes.push(hum);

    // Wind/traffic layer for tier 2+
    if (tier >= 2) {
      const wind = this.ctx.createOscillator();
      const windGain = this.ctx.createGain();
      const windFilter = this.ctx.createBiquadFilter();
      wind.type = 'sawtooth';
      wind.frequency.value = 120;
      wind.detune.value = 7;
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 350;
      windFilter.Q.value = 0.3;
      windGain.gain.setValueAtTime(0.001, now);
      windGain.gain.linearRampToValueAtTime(0.008, now + 3);
      wind.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.ambienceGain);
      wind.start(now);
      this.ambienceNodes.push(wind);
    }

    // Busy city layer for tier 3
    if (tier >= 3) {
      const busy = this.ctx.createOscillator();
      const busyGain = this.ctx.createGain();
      const busyFilter = this.ctx.createBiquadFilter();
      busy.type = 'triangle';
      busy.frequency.value = 180;
      busy.detune.value = -5;
      busyFilter.type = 'lowpass';
      busyFilter.frequency.value = 250;
      busyGain.gain.setValueAtTime(0.001, now);
      busyGain.gain.linearRampToValueAtTime(0.006, now + 4);
      busy.connect(busyFilter);
      busyFilter.connect(busyGain);
      busyGain.connect(this.ambienceGain);
      busy.start(now);
      this.ambienceNodes.push(busy);
    }

    this.ambienceActive = true;
  }

  private stopAmbience(): void {
    for (const node of this.ambienceNodes) {
      try { node.stop(); } catch { /* no-op */ }
      node.disconnect();
    }
    this.ambienceNodes = [];
    this.ambienceActive = false;
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.applySettings();
    this.saveSettings();
  }

  private applySettings(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.masterVolume;
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.settings.sfxVolume;
    }
    if (this.musicGain) {
      this.musicGain.gain.value = this.settings.musicVolume;
    }
    if (this.ambienceGain) {
      this.ambienceGain.gain.value = this.settings.musicVolume * 0.7;
    }
  }

  private loadSettings(): AudioSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch { /* ignore */ }
  }

  destroy(): void {
    this.stopAmbience();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}

/** Global singleton */
export const audioManager = new AudioManager();
