export type BuildingCategory = 'residential' | 'industrial' | 'government' | 'infrastructure' | 'decoration';

export interface BuildingDef {
  id: string;
  name: string;
  category: BuildingCategory;
  width: number;   // tiles in grid-x
  height: number;  // tiles in grid-y
  cost: number;    // rubles
  maintenance: number; // rubles per tick
  description: string;

  // Residential
  housingCapacity?: number;

  // Power
  powerGeneration?: number; // MW
  powerConsumption?: number; // MW

  // Services
  happinessBonus?: number;
  serviceRadius?: number;

  // Industrial
  industrialOutput?: number; // rubles per tick

  // Flags
  conductsPower?: boolean;
  isRoad?: boolean;
}

export interface PlacedBuilding {
  defId: string;
  gx: number;
  gy: number;
  powered: boolean;
  id: number; // unique instance id
}
