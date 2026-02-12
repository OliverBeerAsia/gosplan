import { PlacedBuilding } from '../buildings/BuildingTypes';
import { DistrictStyle } from '../core/GameState';

export type TerrainType = 'ground' | 'water' | 'forest' | 'hill' | 'dirt';
export type ZoneType = 'none' | 'housing' | 'industry' | 'civic' | 'green';

export interface Cell {
  gx: number;
  gy: number;
  terrain: TerrainType;
  zone: ZoneType;
  serviceCoverage: number; // 0..100, updated by simulation
  districtId: string;
  districtStyle: DistrictStyle | 'none';
  activityLevel: number; // 0..100
  unrestMarker: boolean;
  elevation: number;
  building: PlacedBuilding | null;
  // For multi-tile buildings, slave cells point to the master cell
  masterGx: number;
  masterGy: number;
  isMaster: boolean;
}
