import { EventBus } from '../core/EventBus';
import { BulletinEntry, GameStateData } from '../core/GameState';

export class BulletinPanel {
  private el: HTMLDivElement;
  private headerEl: HTMLDivElement;
  private listEl: HTMLDivElement;
  private directiveEl: HTMLDivElement;

  constructor(
    container: HTMLElement,
    private state: GameStateData,
    private events: EventBus
  ) {
    this.el = document.createElement('div');
    this.el.id = 'bulletin-panel';

    this.headerEl = document.createElement('div');
    this.headerEl.id = 'bulletin-panel-header';
    this.headerEl.textContent = 'STATE BULLETIN';
    this.el.appendChild(this.headerEl);

    this.directiveEl = document.createElement('div');
    this.directiveEl.id = 'bulletin-directive';
    this.el.appendChild(this.directiveEl);

    this.listEl = document.createElement('div');
    this.listEl.id = 'bulletin-list';
    this.el.appendChild(this.listEl);

    container.appendChild(this.el);

    events.on('directive:changed', () => this.update());
    events.on('bulletin:added', () => this.update());
    events.on('tick', () => this.update());
  }

  update(): void {
    this.directiveEl.textContent = `Directive: ${this.state.activeDirective}`;
    while (this.listEl.firstChild) {
      this.listEl.removeChild(this.listEl.firstChild);
    }

    const entries = this.state.bulletin.slice(-8).reverse();
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'bulletin-empty';
      empty.textContent = 'No bulletin updates yet.';
      this.listEl.appendChild(empty);
      return;
    }

    for (const entry of entries) {
      this.listEl.appendChild(this.renderEntry(entry));
    }
  }

  private renderEntry(entry: BulletinEntry): HTMLElement {
    const item = document.createElement('div');
    item.className = `bulletin-item ${entry.level}`;

    const ts = document.createElement('span');
    ts.className = 'bulletin-time';
    ts.textContent = `W${entry.week} ${entry.year}`;
    item.appendChild(ts);

    const text = document.createElement('span');
    text.className = 'bulletin-text';
    text.textContent = entry.text;
    item.appendChild(text);

    return item;
  }
}
