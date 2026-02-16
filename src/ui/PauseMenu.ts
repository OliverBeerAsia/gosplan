import { EventBus } from '../core/EventBus';
import { GameStateData, GraphicsQuality, UiScalePreset } from '../core/GameState';
import { audioManager, AudioSettings } from '../audio/AudioManager';

export class PauseMenu {
  private el: HTMLDivElement;
  private visible = false;
  private prevSpeed = 1;

  constructor(
    private container: HTMLElement,
    private state: GameStateData,
    private events: EventBus,
    private onQuit: () => void
  ) {
    this.el = document.createElement('div');
    this.el.id = 'pause-menu';
    this.el.style.display = 'none';
    container.appendChild(this.el);
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;

    // Pause game
    this.prevSpeed = this.state.speed;
    if (this.state.speed > 0) {
      this.events.emit('speed:changed', { speed: 0 });
    }

    this.render();
    this.el.style.display = 'flex';
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.el.style.display = 'none';

    // Restore speed
    if (this.prevSpeed > 0) {
      this.events.emit('speed:changed', { speed: this.prevSpeed });
    }
  }

  private render(): void {
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);

    const panel = document.createElement('div');
    panel.id = 'pause-menu-panel';
    panel.className = 'panel-shell panel-shell--red';

    // Header
    const header = document.createElement('div');
    header.className = 'pause-menu-header panel-shell-header';
    header.textContent = 'GAME PAUSED';
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'pause-menu-body';

    // Resume
    body.appendChild(this.createButton('RESUME', 'primary', () => this.hide()));

    // Save
    body.appendChild(this.createButton('SAVE GAME', 'secondary', () => {
      this.events.emit('game:save:requested', {});
    }));

    // Settings section
    const settingsLabel = document.createElement('div');
    settingsLabel.className = 'pause-menu-section';
    settingsLabel.textContent = 'SETTINGS';
    body.appendChild(settingsLabel);

    // Graphics quality
    const gfxRow = this.createSettingRow('Graphics');
    const qualities: GraphicsQuality[] = ['low', 'medium', 'high'];
    for (const q of qualities) {
      const btn = document.createElement('button');
      btn.className = `pause-setting-btn${this.state.graphicsQuality === q ? ' active' : ''}`;
      btn.textContent = q.toUpperCase();
      btn.addEventListener('click', () => {
        this.events.emit('graphics:quality:changed', { quality: q });
        this.render();
      });
      gfxRow.appendChild(btn);
    }
    body.appendChild(gfxRow);

    // UI Scale
    const scaleRow = this.createSettingRow('UI Scale');
    const scales: UiScalePreset[] = ['normal', 'compact'];
    for (const s of scales) {
      const btn = document.createElement('button');
      btn.className = `pause-setting-btn${this.state.uiSettings.uiScale === s ? ' active' : ''}`;
      btn.textContent = s.toUpperCase();
      btn.addEventListener('click', () => {
        this.events.emit('ui:settings:changed', { settings: { uiScale: s } });
        this.render();
      });
      scaleRow.appendChild(btn);
    }
    body.appendChild(scaleRow);

    // Audio sliders
    const audioSettings = audioManager.getSettings();
    body.appendChild(this.createSlider('Master Volume', audioSettings.masterVolume, (v) => {
      audioManager.updateSettings({ masterVolume: v });
    }));
    body.appendChild(this.createSlider('SFX Volume', audioSettings.sfxVolume, (v) => {
      audioManager.updateSettings({ sfxVolume: v });
    }));
    body.appendChild(this.createSlider('Music Volume', audioSettings.musicVolume, (v) => {
      audioManager.updateSettings({ musicVolume: v });
    }));

    // Quit
    body.appendChild(this.createButton('QUIT TO TITLE', 'muted', () => {
      if (confirm('Unsaved progress will be lost. Are you sure?')) {
        this.hide();
        this.onQuit();
      }
    }));

    panel.appendChild(body);
    this.el.appendChild(panel);
  }

  private createButton(label: string, style: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `pause-menu-btn ${style}`;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private createSettingRow(label: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'pause-setting-row';
    const lbl = document.createElement('span');
    lbl.className = 'pause-setting-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    return row;
  }

  private createSlider(label: string, value: number, onChange: (v: number) => void): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'pause-slider-row';

    const lbl = document.createElement('span');
    lbl.className = 'pause-setting-label';
    lbl.textContent = label;
    row.appendChild(lbl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(Math.round(value * 100));
    slider.className = 'pause-slider';
    slider.addEventListener('input', () => {
      onChange(Number(slider.value) / 100);
    });
    row.appendChild(slider);

    return row;
  }
}
