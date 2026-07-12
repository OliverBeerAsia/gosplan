import { EventBus } from '../core/EventBus';
import { GameStateData, GraphicsQuality, UiScalePreset } from '../core/GameState';
import { audioManager } from '../audio/AudioManager';
import { AchievementPanel } from './AchievementPanel';
import { activateModal } from './ModalFocus';

/** Escape remains owned by the dialog; every other key stays native/inert. */
export function shouldSuppressGameplayShortcut(pauseOpen: boolean, key: string): boolean {
  return pauseOpen && key !== 'Escape';
}

export function shouldBlockSpeedChange(pauseOpen: boolean, speed: number): boolean {
  return pauseOpen && speed > 0;
}

export class PauseMenu {
  private el: HTMLDivElement;
  private visible = false;
  private prevSpeed = 1;
  private achievementPanel: AchievementPanel;
  private deactivateModal: (() => void) | null = null;
  private sliderId = 0;

  constructor(
    private container: HTMLElement,
    private state: GameStateData,
    private events: EventBus,
    private onQuit: () => void
  ) {
    this.achievementPanel = new AchievementPanel(state, events);
    this.el = document.createElement('div');
    this.el.id = 'pause-menu';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'pause-menu-title');
    this.el.setAttribute('aria-hidden', 'true');
    this.el.style.display = 'none';
    container.appendChild(this.el);

    // A late overlay/system event must never resume simulation behind the modal.
    events.on('speed:changed', ({ speed }) => {
      if (!shouldBlockSpeedChange(this.visible, speed)) return;
      this.state.speed = 0;
      queueMicrotask(() => {
        if (this.visible && this.state.speed !== 0) {
          this.state.speed = 0;
        }
        if (this.visible) this.events.emit('speed:changed', { speed: 0 });
      });
    });
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

  isOpen(): boolean {
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
    this.el.setAttribute('aria-hidden', 'false');
    this.deactivateModal = activateModal(this.el, {
      initialFocus: () => this.el.querySelector<HTMLButtonElement>('button:not(:disabled)'),
      onEscape: () => this.hide(),
    });
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.el.style.display = 'none';
    this.el.setAttribute('aria-hidden', 'true');
    this.deactivateModal?.();
    this.deactivateModal = null;

    // Restore speed
    if (this.prevSpeed > 0) {
      this.events.emit('speed:changed', { speed: this.prevSpeed });
    }
  }

  private render(): void {
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
    this.sliderId = 0;

    const panel = document.createElement('div');
    panel.id = 'pause-menu-panel';
    panel.className = 'pause-dossier';

    // Header
    const header = document.createElement('header');
    header.className = 'pause-menu-header';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'pause-menu-eyebrow';
    eyebrow.textContent = 'Municipal Planning Dossier';
    header.appendChild(eyebrow);

    const title = document.createElement('h2');
    title.id = 'pause-menu-title';
    title.textContent = 'Planning Session Paused';
    header.appendChild(title);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'pause-menu-body';

    // Resume
    body.appendChild(this.createButton('Return to city plan', 'primary', () => this.hide()));

    // Save
    body.appendChild(this.createButton('Save city dossier', 'secondary', () => {
      this.events.emit('game:save:requested', {});
    }));

    // Achievement section (header is inside AchievementPanel)
    this.achievementPanel.update();
    body.appendChild(this.achievementPanel.el);

    // Settings section
    const settingsLabel = document.createElement('div');
    settingsLabel.className = 'pause-menu-section';
    settingsLabel.textContent = 'Planning Office Settings';
    body.appendChild(settingsLabel);

    // Graphics quality
    const gfxRow = this.createSettingRow('Graphics');
    const qualities: GraphicsQuality[] = ['low', 'medium', 'high'];
    for (const q of qualities) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pause-setting-btn${this.state.graphicsQuality === q ? ' active' : ''}`;
      btn.textContent = q.toUpperCase();
      btn.setAttribute('aria-pressed', String(this.state.graphicsQuality === q));
      btn.dataset.pauseSetting = `graphics-${q}`;
      btn.addEventListener('click', () => {
        this.events.emit('graphics:quality:changed', { quality: q });
        this.render();
        this.focusSetting(`graphics-${q}`);
      });
      gfxRow.appendChild(btn);
    }
    body.appendChild(gfxRow);

    // UI Scale
    const scaleRow = this.createSettingRow('UI Scale');
    const scales: UiScalePreset[] = ['normal', 'compact'];
    for (const s of scales) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pause-setting-btn${this.state.uiSettings.uiScale === s ? ' active' : ''}`;
      btn.textContent = s.toUpperCase();
      btn.setAttribute('aria-pressed', String(this.state.uiSettings.uiScale === s));
      btn.dataset.pauseSetting = `scale-${s}`;
      btn.addEventListener('click', () => {
        this.events.emit('ui:settings:changed', { settings: { uiScale: s } });
        this.render();
        this.focusSetting(`scale-${s}`);
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
    const exitSection = document.createElement('div');
    exitSection.className = 'pause-menu-exit';

    const exitNote = document.createElement('div');
    exitNote.className = 'pause-menu-caution-note';
    exitNote.textContent = 'Leaving the planning desk may discard unsaved city work.';
    exitSection.appendChild(exitNote);

    exitSection.appendChild(this.createButton('Return to title office', 'caution', () => {
      if (confirm('Unsaved progress will be lost. Are you sure?')) {
        this.hide();
        this.onQuit();
      }
    }));
    body.appendChild(exitSection);

    panel.appendChild(body);
    this.el.appendChild(panel);
  }

  private focusSetting(setting: string): void {
    this.el.querySelector<HTMLButtonElement>(`[data-pause-setting="${setting}"]`)?.focus();
  }

  private createButton(label: string, style: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pause-menu-btn ${style}`;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private createSettingRow(label: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'pause-setting-row';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', label);
    const lbl = document.createElement('span');
    lbl.className = 'pause-setting-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    return row;
  }

  private createSlider(label: string, value: number, onChange: (v: number) => void): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'pause-slider-row';

    const lbl = document.createElement('label');
    lbl.className = 'pause-setting-label';
    lbl.textContent = label;

    const slider = document.createElement('input');
    const sliderId = `pause-slider-${this.sliderId++}`;
    slider.type = 'range';
    slider.id = sliderId;
    slider.min = '0';
    slider.max = '100';
    slider.value = String(Math.round(value * 100));
    slider.className = 'pause-slider';
    lbl.htmlFor = sliderId;
    row.appendChild(lbl);
    slider.addEventListener('input', () => {
      onChange(Number(slider.value) / 100);
    });
    row.appendChild(slider);

    return row;
  }
}
