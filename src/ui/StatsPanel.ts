import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { StatsSnapshot } from '../simulation/StatsCollector';

interface ChartDef {
  label: string;
  color: string;
  getValue: (s: StatsSnapshot) => number;
}

const CHARTS: ChartDef[] = [
  { label: 'POPULATION', color: '#66BB6A', getValue: s => s.population },
  { label: 'HAPPINESS', color: '#FFD700', getValue: s => s.happiness },
  { label: 'BUDGET', color: '#42A5F5', getValue: s => s.budget },
  { label: 'POWER (CAP / DEM)', color: '#EF5350', getValue: s => s.powerCapacity },
];

export class StatsPanel {
  private el: HTMLDivElement;
  private canvases: HTMLCanvasElement[] = [];
  private visible = false;
  private refreshCounter = 0;

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'stats-panel';
    this.el.className = 'panel-shell panel-shell--neutral';
    this.el.style.display = 'none';

    const header = document.createElement('div');
    header.className = 'stats-header panel-shell-header';
    header.textContent = 'CITY STATISTICS';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'stats-close';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);
    this.el.appendChild(header);

    const body = document.createElement('div');
    body.className = 'stats-body';

    for (const chart of CHARTS) {
      const wrap = document.createElement('div');
      wrap.className = 'stats-chart-wrap';

      const label = document.createElement('div');
      label.className = 'stats-chart-label';
      label.textContent = chart.label;
      label.style.color = chart.color;
      wrap.appendChild(label);

      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 60;
      canvas.className = 'stats-chart-canvas';
      wrap.appendChild(canvas);
      this.canvases.push(canvas);

      body.appendChild(wrap);
    }

    this.el.appendChild(body);
    container.appendChild(this.el);

    events.on('tick', () => {
      this.refreshCounter++;
      if (this.visible && this.refreshCounter % 8 === 0) {
        this.redraw();
      }
    });
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    this.visible = true;
    this.el.style.display = 'block';
    this.redraw();
  }

  hide(): void {
    this.visible = false;
    this.el.style.display = 'none';
  }

  private redraw(): void {
    const history = this.state.statsHistory;
    if (!history || history.length < 2) return;

    for (let i = 0; i < CHARTS.length; i++) {
      const chart = CHARTS[i];
      const canvas = this.canvases[i];
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Extract values
      let values: number[];
      if (chart.label === 'POWER (CAP / DEM)') {
        // Draw two lines for power
        this.drawLine(ctx, history.map(s => s.powerCapacity), w, h, '#66BB6A');
        this.drawLine(ctx, history.map(s => s.powerDemand), w, h, '#EF5350');
        continue;
      } else {
        values = history.map(chart.getValue);
      }

      this.drawLine(ctx, values, w, h, chart.color);
    }
  }

  private drawLine(ctx: CanvasRenderingContext2D, values: number[], w: number, h: number, color: string): void {
    if (values.length < 2) return;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = 4;
    const drawH = h - padding * 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < values.length; i++) {
      const x = (i / (values.length - 1)) * w;
      const y = padding + drawH - ((values[i] - min) / range) * drawH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();

    // Current value label
    const last = values[values.length - 1];
    ctx.fillStyle = color;
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    const formatted = last >= 1000 ? `${(last / 1000).toFixed(1)}k` : String(Math.round(last));
    ctx.fillText(formatted, w - 2, 10);
  }
}
