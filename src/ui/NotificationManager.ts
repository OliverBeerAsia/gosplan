import { EventBus } from '../core/EventBus';

export class NotificationManager {
  private container: HTMLDivElement;

  constructor(parent: HTMLElement, private events: EventBus) {
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    parent.appendChild(this.container);

    events.on('notification', ({ message, type }) => {
      this.show(message, type);
    });
  }

  show(message: string, type: 'info' | 'warning' | 'success' | 'error'): void {
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = message;
    this.container.appendChild(el);

    // Auto-remove after animation
    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 4000);
  }
}
