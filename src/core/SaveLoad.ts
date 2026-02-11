import { Grid } from '../grid/Grid';
import { GameStateData, createInitialState } from './GameState';
import { BuildingPlacer } from '../grid/BuildingPlacer';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { PlacedBuilding } from '../buildings/BuildingTypes';

const SAVE_KEY = 'gosplan_save';

interface SaveData {
  version: 1;
  state: GameStateData;
  buildings: {
    defId: string;
    gx: number;
    gy: number;
    id: number;
  }[];
  nextBuildingId: number;
  waterCells: [number, number][];
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function saveGame(grid: Grid, state: GameStateData, placer: BuildingPlacer): void {
  const buildings = grid.getAllBuildings().map(b => ({
    defId: b.defId,
    gx: b.gx,
    gy: b.gy,
    id: b.id,
  }));

  const waterCells: [number, number][] = [];
  for (let gx = 0; gx < grid.size; gx++) {
    for (let gy = 0; gy < grid.size; gy++) {
      const cell = grid.getCell(gx, gy);
      if (cell?.terrain === 'water') {
        waterCells.push([gx, gy]);
      }
    }
  }

  const data: SaveData = {
    version: 1,
    state: { ...state },
    buildings,
    nextBuildingId: placer.getNextId(),
    waterCells,
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame(
  grid: Grid,
  registry: BuildingRegistry,
  placer: BuildingPlacer
): GameStateData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const data: SaveData = JSON.parse(raw);
    if (data.version !== 1) return null;

    // Restore water
    for (const [gx, gy] of data.waterCells) {
      grid.setTerrain(gx, gy, 'water');
    }

    // Restore buildings
    placer.setNextId(data.nextBuildingId);
    for (const b of data.buildings) {
      const def = registry.get(b.defId);
      if (!def) continue;
      const building: PlacedBuilding = {
        defId: b.defId,
        gx: b.gx,
        gy: b.gy,
        powered: false,
        id: b.id,
      };
      grid.placeBuilding(building, def.width, def.height);
    }

    return data.state;
  } catch {
    return null;
  }
}
