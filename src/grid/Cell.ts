import { PlacedBuilding } from '../buildings/BuildingTypes';

export type TerrainType = 'ground' | 'water';

export interface Cell {
  gx: number;
  gy: number;
  terrain: TerrainType;
  elevation: number;
  building: PlacedBuilding | null;
  // For multi-tile buildings, slave cells point to the master cell
  masterGx: number;
  masterGy: number;
  isMaster: boolean;
}
