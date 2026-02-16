import { EventBus } from '../core/EventBus';
import { BulletinEntry, GameStateData } from '../core/GameState';

type NotificationType = 'info' | 'warning' | 'success' | 'error';

interface NotificationRecord {
  message: string;
  type: NotificationType;
  time: number;
  source: 'notification' | 'bulletin';
  timestamp?: string; // e.g. "W3 1980"
}

interface PendingNotification {
  message: string;
  type: NotificationType;
}

export class NotificationManager {
  private container: HTMLDivElement;
  private history: NotificationRecord[] = [];
  private historyPanel: HTMLDivElement | null = null;
  private historyVisible = false;
  private queue: PendingNotification[] = [];
  private activeKeys = new Set<string>();
  private lastShownByKey = new Map<string, number>();
  private lastInfoShownAt = 0;
  private maxVisibleToasts = 2;
  private maxHistory = 50;
  private maxQueueSize = 6;
  private duplicateWindowMs = 6000;
  private infoCooldownMs = 1200;
  private toastDurationMs = 4000;
  private knownBulletinIds = new Set<string>();

  constructor(parent: HTMLElement, private events: EventBus, private state: GameStateData) {
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    parent.appendChild(this.container);

    // History toggle button
    const histBtn = document.createElement('button');
    histBtn.id = 'notification-history-btn';
    histBtn.textContent = '\u2630';
    histBtn.title = 'Event Log';
    histBtn.addEventListener('click', () => this.toggleHistory());
    parent.appendChild(histBtn);

    events.on('notification', ({ message, type }) => {
      this.show(message, type);
    });

    // Seed known bulletin IDs from existing state
    for (const entry of this.state.bulletin) {
      this.knownBulletinIds.add(entry.id);
    }

    events.on('bulletin:added', () => this.syncBulletinToHistory());
    events.on('directive:changed', () => {
      if (this.historyVisible && this.historyPanel) {
        this.renderHistory();
      }
    });
  }

  private syncBulletinToHistory(): void {
    for (const entry of this.state.bulletin) {
      if (!this.knownBulletinIds.has(entry.id)) {
        this.knownBulletinIds.add(entry.id);
        this.history.push({
          message: entry.text,
          type: entry.level,
          time: Date.now(),
          source: 'bulletin',
          timestamp: `W${entry.week} ${entry.year}`,
        });
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }
      }
    }
    if (this.historyVisible && this.historyPanel) {
      this.renderHistory();
    }
  }

  show(message: string, type: NotificationType): void {
    const now = Date.now();

    // Add to history
    this.history.push({ message, type, time: now, source: 'notification' });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    // Update history panel if visible
    if (this.historyVisible && this.historyPanel) {
      this.renderHistory();
    }

    if (!this.shouldDisplay(message, type, now)) {
      return;
    }

    this.enqueue({ message, type });
    this.flushQueue();
  }

  private toggleHistory(): void {
    if (this.historyVisible && this.historyPanel) {
      this.historyPanel.remove();
      this.historyPanel = null;
      this.historyVisible = false;
      return;
    }

    // Sync any bulletin entries we haven't seen yet
    this.syncBulletinToHistory();

    this.historyPanel = document.createElement('div');
    this.historyPanel.id = 'notification-history';
    this.renderHistory();
    this.container.parentElement?.appendChild(this.historyPanel);
    this.historyVisible = true;
  }

  private renderHistory(): void {
    if (!this.historyPanel) return;
    while (this.historyPanel.firstChild) {
      this.historyPanel.removeChild(this.historyPanel.firstChild);
    }

    const title = document.createElement('div');
    title.className = 'notif-history-title';
    title.textContent = 'EVENT LOG';
    this.historyPanel.appendChild(title);

    // Show active directive as pinned header
    if (this.state.activeDirective) {
      const directive = document.createElement('div');
      directive.className = 'notif-history-directive';
      directive.textContent = `\u2691 ${this.state.activeDirective}`;
      this.historyPanel.appendChild(directive);
    }

    // Merge notification history with any bulletin entries not yet in history
    const allEntries = [...this.history];

    // Also pull in bulletin entries that predate our tracking
    for (const entry of this.state.bulletin) {
      const alreadyInHistory = allEntries.some(
        h => h.source === 'bulletin' && h.message === entry.text && h.timestamp === `W${entry.week} ${entry.year}`
      );
      if (!alreadyInHistory) {
        allEntries.push({
          message: entry.text,
          type: entry.level,
          time: 0, // old entries
          source: 'bulletin',
          timestamp: `W${entry.week} ${entry.year}`,
        });
      }
    }

    // Sort reverse chronological (newest first)
    allEntries.sort((a, b) => b.time - a.time);

    if (allEntries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'notif-history-empty';
      empty.textContent = 'No events yet';
      this.historyPanel.appendChild(empty);
      return;
    }

    // Show up to 50 entries
    const display = allEntries.slice(0, this.maxHistory);
    for (const rec of display) {
      const item = document.createElement('div');
      item.className = `notif-history-item ${rec.type}`;

      if (rec.timestamp || rec.source === 'bulletin') {
        const ts = document.createElement('span');
        ts.className = 'notif-history-time';
        ts.textContent = rec.timestamp || '';
        item.appendChild(ts);
      }

      const tag = document.createElement('span');
      tag.className = `notif-history-tag ${rec.source}`;
      tag.textContent = rec.source === 'bulletin' ? 'BULLETIN' : 'NOTICE';
      item.appendChild(tag);

      const text = document.createElement('span');
      text.className = 'notif-history-text';
      text.textContent = rec.message;
      item.appendChild(text);

      this.historyPanel.appendChild(item);
    }
  }

  private shouldDisplay(message: string, type: NotificationType, now: number): boolean {
    const key = this.messageKey(message, type);
    const lastShown = this.lastShownByKey.get(key);
    if (lastShown !== undefined && now - lastShown < this.duplicateWindowMs) {
      return false;
    }

    if (type === 'info' && now - this.lastInfoShownAt < this.infoCooldownMs) {
      return false;
    }

    if (this.activeKeys.has(key)) {
      return false;
    }

    if (this.queue.some(item => this.messageKey(item.message, item.type) === key)) {
      return false;
    }

    return true;
  }

  private enqueue(notification: PendingNotification): void {
    this.queue.push(notification);

    if (this.queue.length <= this.maxQueueSize) {
      return;
    }

    const firstInfoIdx = this.queue.findIndex(item => item.type === 'info');
    if (firstInfoIdx >= 0) {
      this.queue.splice(firstInfoIdx, 1);
      return;
    }

    this.queue.shift();
  }

  private flushQueue(): void {
    while (this.container.childElementCount < this.maxVisibleToasts && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) break;
      this.renderToast(next);
    }
  }

  private renderToast(notification: PendingNotification): void {
    const key = this.messageKey(notification.message, notification.type);
    const now = Date.now();
    this.lastShownByKey.set(key, now);
    if (notification.type === 'info') {
      this.lastInfoShownAt = now;
    }
    this.activeKeys.add(key);

    const el = document.createElement('div');
    el.className = `notification ${notification.type}`;
    el.textContent = notification.message;
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';

    const dismiss = (): void => {
      if (!el.parentNode) return;
      el.parentNode.removeChild(el);
      this.activeKeys.delete(key);
      this.flushQueue();
    };

    el.addEventListener('click', dismiss);
    this.container.appendChild(el);
    window.setTimeout(dismiss, this.toastDurationMs);
  }

  private messageKey(message: string, type: NotificationType): string {
    return `${type}:${message.trim()}`;
  }
}
