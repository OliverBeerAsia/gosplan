import { EventBus } from './EventBus';
import { BulletinEntry, GameStateData } from './GameState';
import { nextGameRandomInt } from './Rng';

export function pushBulletinEntry(
  state: GameStateData,
  events: EventBus,
  text: string,
  level: BulletinEntry['level'],
  idPrefix: string = 'bulletin'
): BulletinEntry {
  const entry: BulletinEntry = {
    id: `${idPrefix}_${state.totalTicks}_${nextGameRandomInt(state, 10000)}`,
    tick: state.totalTicks,
    year: state.year,
    week: state.week,
    text,
    level,
  };

  state.bulletin.push(entry);
  if (state.bulletin.length > 60) {
    state.bulletin.splice(0, state.bulletin.length - 60);
  }

  events.emit('bulletin:added', { entry });
  return entry;
}
