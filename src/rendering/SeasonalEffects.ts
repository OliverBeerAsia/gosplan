import { TICKS_PER_YEAR } from '../constants';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function getSeason(week: number): Season {
  // Weeks 1-13: Winter, 14-26: Spring, 27-39: Summer, 40-52: Autumn
  if (week <= 13) return 'winter';
  if (week <= 26) return 'spring';
  if (week <= 39) return 'summer';
  return 'autumn';
}

/** Returns a tint color for terrain based on season */
export function getSeasonalTerrainTint(season: Season): number | null {
  switch (season) {
    case 'summer':
      return null; // no tint, full color
    case 'autumn':
      return 0xDDB870; // golden-orange warmth
    case 'winter':
      return 0xB0B8C8; // cool grey-blue desaturation
    case 'spring':
      return 0xC8E8B0; // fresh green tint
  }
}

export function isWinter(season: Season): boolean {
  return season === 'winter';
}
