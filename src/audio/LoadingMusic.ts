interface MelodyNote {
  midi: number;
  beats: number;
  gapBeats?: number;
}

// Short, low-fi phrase inspired by Soviet anthem motifs for loading ambience.
const THEME_NOTES: MelodyNote[] = [
  { midi: 60, beats: 1.0 },
  { midi: 64, beats: 0.75 },
  { midi: 67, beats: 0.75 },
  { midi: 72, beats: 1.5, gapBeats: 0.25 },
  { midi: 71, beats: 0.75 },
  { midi: 69, beats: 0.75 },
  { midi: 67, beats: 1.0, gapBeats: 0.2 },
  { midi: 64, beats: 0.9 },
  { midi: 60, beats: 1.2, gapBeats: 0.3 },
];

export class LoadingMusic {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: OscillatorNode[] = [];
  private stopTimer: number | null = null;

  async play(): Promise<void> {
    this.stop();

    const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    this.ctx = new Ctor();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0001;
    this.masterGain.connect(this.ctx.destination);

    // Gentle fade-in to keep it subtle.
    const now = this.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(0.0001, now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.06, now + 0.28);

    this.schedulePass(now + 0.03);
    this.schedulePass(now + 3.8);
  }

  stop(): void {
    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }

    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(Math.max(this.masterGain.gain.value, 0.0001), t);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    }

    for (const node of this.activeNodes) {
      try {
        node.stop();
      } catch {
        // no-op
      }
      node.disconnect();
    }
    this.activeNodes.length = 0;

    const closingCtx = this.ctx;
    this.ctx = null;
    this.masterGain = null;
    if (closingCtx) {
      this.stopTimer = window.setTimeout(() => {
        void closingCtx.close();
      }, 240);
    }
  }

  private schedulePass(startAt: number): void {
    if (!this.ctx || !this.masterGain) return;

    const tempo = 92; // old-school march tempo
    const secPerBeat = 60 / tempo;
    let cursor = startAt;

    for (const note of THEME_NOTES) {
      const dur = note.beats * secPerBeat;
      const gap = (note.gapBeats ?? 0.05) * secPerBeat;
      this.triggerNote(note.midi, cursor, dur);
      cursor += dur + gap;
    }
  }

  private triggerNote(midi: number, startAt: number, duration: number): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.value = this.midiToHz(midi);
    osc.detune.value = -3 + Math.random() * 6;

    filter.type = 'lowpass';
    filter.frequency.value = 1700;
    filter.Q.value = 0.6;

    noteGain.gain.setValueAtTime(0.0001, startAt);
    noteGain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.03);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
    this.activeNodes.push(osc);
  }

  private midiToHz(midi: number): number {
    return 440 * 2 ** ((midi - 69) / 12);
  }
}
