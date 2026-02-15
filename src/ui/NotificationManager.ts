import { EventBus } from '../core/EventBus';

type NotificationType = 'info' | 'warning' | 'success' | 'error';

interface NotificationRecord {
  message: string;
  type: NotificationType;
  time: number;
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

  constructor(parent: HTMLElement, private events: EventBus) {
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    parent.appendChild(this.container);

    // History toggle button
    const histBtn = document.createElement('button');
    histBtn.id = 'notification-history-btn';
    histBtn.textContent = '\u2630';
    histBtn.title = 'Notification History';
    histBtn.addEventListener('click', () => this.toggleHistory());
    parent.appendChild(histBtn);

    events.on('notification', ({ message, type }) => {
      this.show(message, type);
    });
  }

  show(message: string, type: NotificationType): void {
    const now = Date.now();

    // Add to history
    this.history.push({ message, type, time: now });
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
    title.textContent = 'NOTIFICATIONS';
    this.historyPanel.appendChild(title);

    if (this.history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'notif-history-empty';
      empty.textContent = 'No notifications yet';
      this.historyPanel.appendChild(empty);
      return;
    }

    // Show in reverse chronological order
    for (let i = this.history.length - 1; i >= 0; i--) {
      const rec = this.history[i];
      const item = document.createElement('div');
      item.className = `notif-history-item ${rec.type}`;
      item.textContent = rec.message;
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
