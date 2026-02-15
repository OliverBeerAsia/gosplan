import { Grid } from '../grid/Grid';
import { DEFAULT_UI_SETTINGS, GameStateData, createInitialState } from './GameState';
import { BuildingPlacer } from '../grid/BuildingPlacer';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { PlacedBuilding } from '../buildings/BuildingTypes';
import { TerrainType, ZoneType } from '../grid/Cell';
import { deriveSeed, hashStringToSeed } from './Rng';

const SAVE_KEY = 'gosplan_save';

interface SaveBuilding {
  defId: string;
  gx: number;
  gy: number;
  id: number;
}

interface SaveTerrainCell {
  gx: number;
  gy: number;
  terrain: TerrainType;
  elevation: number;
}

interface SaveZoneCell {
  gx: number;
  gy: number;
  zone: ZoneType;
}

interface SaveDataV1 {
  version: 1;
  state: GameStateData;
  buildings: SaveBuilding[];
  nextBuildingId: number;
  waterCells: [number, number][];
}

interface SaveDataV2 {
  version: 2;
  state: GameStateData;
  buildings: SaveBuilding[];
  nextBuildingId: number;
  terrainCells: SaveTerrainCell[];
}

interface SaveDataV3 {
  version: 3;
  state: GameStateData;
  buildings: SaveBuilding[];
  nextBuildingId: number;
  terrainCells: SaveTerrainCell[];
  zoneCells: SaveZoneCell[];
}

interface SaveDataV4 {
  version: 4;
  state: GameStateData;
  buildings: SaveBuilding[];
  nextBuildingId: number;
  terrainCells: SaveTerrainCell[];
  zoneCells: SaveZoneCell[];
}

type SaveData = SaveDataV1 | SaveDataV2 | SaveDataV3 | SaveDataV4;

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

  const terrainCells: SaveTerrainCell[] = [];
  const zoneCells: SaveZoneCell[] = [];

  for (let gx = 0; gx < grid.size; gx++) {
    for (let gy = 0; gy < grid.size; gy++) {
      const cell = grid.getCell(gx, gy);
      if (!cell) continue;

      if (cell.terrain !== 'ground' || cell.elevation !== 0) {
        terrainCells.push({ gx, gy, terrain: cell.terrain, elevation: cell.elevation });
      }

      if (cell.zone !== 'none') {
        zoneCells.push({ gx, gy, zone: cell.zone });
      }
    }
  }

  const data: SaveDataV4 = {
    version: 4,
    state: { ...state },
    buildings,
    nextBuildingId: placer.getNextId(),
    terrainCells,
    zoneCells,
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function exportSaveArchive(): boolean {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+$/, '');
  const blob = new Blob([raw], { type: 'application/json' });
  const href = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = href;
  link.download = `gosplan-save-${timestamp}.json`;
  (document.body || document.documentElement).appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);

  return true;
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

    if (data.version === 1) {
      for (const [gx, gy] of data.waterCells) {
        grid.setTerrain(gx, gy, 'water');
      }
    } else if (data.version === 2 || data.version === 3 || data.version === 4) {
      for (const t of data.terrainCells) {
        grid.setTerrain(t.gx, t.gy, t.terrain);
        const cell = grid.getCell(t.gx, t.gy);
        if (cell) cell.elevation = t.elevation;
      }

      if (data.version === 3 || data.version === 4) {
        for (const z of data.zoneCells) {
          grid.setZone(z.gx, z.gy, z.zone);
        }
      }
    } else {
      return null;
    }

    placer.setNextId(data.nextBuildingId);
    for (const b of data.buildings) {
      const def = registry.get(b.defId);
      if (!def) continue;
      if (!grid.canPlace(b.gx, b.gy, def.width, def.height)) continue;

      const building: PlacedBuilding = {
        defId: b.defId,
        gx: b.gx,
        gy: b.gy,
        powered: false,
        id: b.id,
      };
      grid.placeBuilding(building, def.width, def.height);
    }

    // Merge with fresh defaults to support forward-compatible state extension.
    const mergedState: GameStateData = {
      ...createInitialState(),
      ...data.state,
    };

    const legacy = data.state as Partial<GameStateData>;
    if (typeof legacy.rngSeed !== 'number' || typeof legacy.rngState !== 'number') {
      const fallbackSeed = hashStringToSeed(raw);
      mergedState.rngSeed = fallbackSeed;
      mergedState.rngState = fallbackSeed;
    }
    if (typeof legacy.mapSeed !== 'number') {
      mergedState.mapSeed = deriveSeed(mergedState.rngSeed, 0x4D4150);
    }
    mergedState.uiSettings = {
      ...DEFAULT_UI_SETTINGS,
      ...(legacy.uiSettings ?? {}),
    };

    return mergedState;
  } catch {
    return null;
  }
}
