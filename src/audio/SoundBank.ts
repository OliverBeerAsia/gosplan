/**
 * Procedurally generated sound effects using Web Audio API.
 * No external audio files needed.
 */

export type SoundId =
  | 'place'
  | 'demolish'
  | 'invalid'
  | 'ui_click'
  | 'event_alert'
  | 'achievement'
  | 'milestone';

export class SoundBank {
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  play(id: SoundId, masterGain: GainNode): void {
    switch (id) {
      case 'place': this.playPlace(masterGain); break;
      case 'demolish': this.playDemolish(masterGain); break;
      case 'invalid': this.playInvalid(masterGain); break;
      case 'ui_click': this.playClick(masterGain); break;
      case 'event_alert': this.playEventAlert(masterGain); break;
      case 'achievement': this.playAchievement(masterGain); break;
      case 'milestone': this.playMilestone(masterGain); break;
    }
  }

  /** Satisfying placement "thunk" */
  private playPlace(dest: GainNode): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.15);

    // Extra click layer
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(800, now);
    click.frequency.exponentialRampToValueAtTime(200, now + 0.03);
    clickGain.gain.setValueAtTime(0.06, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    click.connect(clickGain);
    clickGain.connect(dest);
    click.start(now);
    click.stop(now + 0.05);
  }

  /** Crumbling demolish sound */
  private playDemolish(dest: GainNode): void {
    const now = this.ctx.currentTime;

    // Low rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.3);

    // Noise burst (via oscillator detune trick)
    for (let i = 0; i < 3; i++) {
      const n = this.ctx.createOscillator();
      const ng = this.ctx.createGain();
      n.type = 'square';
      n.frequency.setValueAtTime(150 + i * 80, now + i * 0.04);
      n.frequency.exponentialRampToValueAtTime(50, now + 0.15 + i * 0.03);
      ng.gain.setValueAtTime(0.04, now + i * 0.04);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + i * 0.03);
      n.connect(ng);
      ng.connect(dest);
      n.start(now + i * 0.04);
      n.stop(now + 0.25 + i * 0.03);
    }
  }

  /** Subtle buzzer for invalid placement */
  private playInvalid(dest: GainNode): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.setValueAtTime(140, now + 0.06);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Short UI click */
  private playClick(dest: GainNode): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  /** Distinctive chime for events */
  private playEventAlert(dest: GainNode): void {
    const now = this.ctx.currentTime;
    const notes = [440, 554, 659]; // A4, C#5, E5

    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], now + i * 0.12);
      gain.gain.setValueAtTime(0.001, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    }
  }

  /** Brief fanfare for achievements */
  private playAchievement(dest: GainNode): void {
    const now = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[i], now + i * 0.1);
      gain.gain.setValueAtTime(0.001, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.45);
    }
  }

  /** Celebratory milestone jingle */
  private playMilestone(dest: GainNode): void {
    const now = this.ctx.currentTime;
    // Soviet-style ascending major chord
    const notes = [262, 330, 392, 523, 659]; // C4 E4 G4 C5 E5

    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i < 3 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(notes[i], now + i * 0.08);
      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.09, now + i * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.55);
    }
  }
}
