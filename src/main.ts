import './ui/styles/soviet-theme.css';
import { Game } from './core/Game';

async function main() {
  const container = document.getElementById('game-container');
  if (!container) throw new Error('No game container found');

  const game = new Game();
  await game.init(container);
}

main().catch(console.error);
