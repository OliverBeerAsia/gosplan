import { EventBus } from '../core/EventBus';
import { GameStateData } from '../core/GameState';

export class AmbienceOverlay {
  private el: HTMLDivElement;

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'ambience-overlay';
    container.appendChild(this.el);

    events.on('directive:changed', ({ pressure }) => {
      // Fast pressure feedback pulse when central directives tighten.
      if (pressure >= 65) {
        this.el.style.boxShadow = 'inset 0 0 120px rgba(183,28,28,0.25)';
        setTimeout(() => {
          this.el.style.boxShadow = 'none';
        }, 1200);
      }
    });
  }

  updateFrame(nowMs: number): void {
    const cycle = (nowMs * 0.000045) % (Math.PI * 2);
    const dayFactor = (Math.sin(cycle) + 1) * 0.5; // 0 night, 1 day
    const baseDarkness = 0.18 - dayFactor * 0.14;
    const unrestTint = Math.max(0, (this.state.unrestLevel - 45) / 100) * 0.12;

    const opacity = Math.max(0, Math.min(0.28, baseDarkness + unrestTint));
    this.el.style.opacity = opacity.toFixed(3);

    const red = this.state.unrestLevel > 60 ? 55 : 28;
    const green = this.state.unrestLevel > 60 ? 12 : 25;
    const blue = dayFactor > 0.55 ? 14 : 36;
    this.el.style.background = `linear-gradient(180deg, rgba(${red},${green},${blue},0.75), rgba(8,8,12,0.55))`;
  }
}
