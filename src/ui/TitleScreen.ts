export class TitleScreen {
  private el: HTMLDivElement;
  private onNewGame: () => void;
  private onLoadGame: (() => void) | null;

  constructor(container: HTMLElement, onNewGame: () => void, onLoadGame: (() => void) | null) {
    this.onNewGame = onNewGame;
    this.onLoadGame = onLoadGame;

    this.el = document.createElement('div');
    this.el.id = 'title-screen';

    const h1 = document.createElement('h1');
    h1.textContent = 'GOSPLAN';
    this.el.appendChild(h1);

    const h2 = document.createElement('h2');
    h2.textContent = 'Soviet City Builder';
    this.el.appendChild(h2);

    // Star decoration
    const star = document.createElement('div');
    star.textContent = '\u2605';
    star.style.cssText = 'font-size:48px;color:#FFD700;margin-bottom:32px;';
    this.el.appendChild(star);

    const newBtn = document.createElement('button');
    newBtn.className = 'title-btn';
    newBtn.textContent = 'NEW CITY';
    newBtn.addEventListener('click', () => {
      this.hide();
      this.onNewGame();
    });
    this.el.appendChild(newBtn);

    if (onLoadGame) {
      const loadBtn = document.createElement('button');
      loadBtn.className = 'title-btn';
      loadBtn.textContent = 'CONTINUE';
      loadBtn.addEventListener('click', () => {
        this.hide();
        this.onLoadGame?.();
      });
      this.el.appendChild(loadBtn);
    }

    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    subtitle.textContent = 'Build the workers\u2019 paradise \u2022 1980';
    this.el.appendChild(subtitle);

    container.appendChild(this.el);
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  show(): void {
    this.el.style.display = 'flex';
  }
}
