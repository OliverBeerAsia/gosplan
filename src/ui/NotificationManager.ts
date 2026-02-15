import { EventBus } from '../core/EventBus';

interface NotificationRecord {
  message: string;
  type: string;
  time: number;
}

export class NotificationManager {
  private container: HTMLDivElement;
  private history: NotificationRecord[] = [];
  private historyPanel: HTMLDivElement | null = null;
  private historyVisible = false;
  private maxHistory = 50;

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

  show(message: string, type: 'info' | 'warning' | 'success' | 'error'): void {
    // Add to history
    this.history.push({ message, type, time: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    // Update history panel if visible
    if (this.historyVisible && this.historyPanel) {
      this.renderHistory();
    }

    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = message;
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';

    // Click to dismiss
    el.addEventListener('click', () => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });

    this.container.appendChild(el);

    // Auto-remove after animation
    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 4000);
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
}
