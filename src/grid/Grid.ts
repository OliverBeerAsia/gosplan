import { MAP_SIZE } from '../constants';
import { Cell, TerrainType } from './Cell';
import { PlacedBuilding } from '../buildings/BuildingTypes';

export class Grid {
  readonly size: number;
  private cells: Cell[][];

  constructor(size: number = MAP_SIZE) {
    this.size = size;
    this.cells = [];
    for (let gx = 0; gx < size; gx++) {
      this.cells[gx] = [];
      for (let gy = 0; gy < size; gy++) {
        this.cells[gx][gy] = {
          gx,
          gy,
          terrain: 'ground',
          elevation: 0,
          building: null,
          masterGx: -1,
          masterGy: -1,
          isMaster: false,
        };
      }
    }
  }

  inBounds(gx: number, gy: number): boolean {
    return gx >= 0 && gy >= 0 && gx < this.size && gy < this.size;
  }

  getCell(gx: number, gy: number): Cell | null {
    if (!this.inBounds(gx, gy)) return null;
    return this.cells[gx][gy];
  }

  setTerrain(gx: number, gy: number, terrain: TerrainType): void {
    const cell = this.getCell(gx, gy);
    if (cell) cell.terrain = terrain;
  }

  canPlace(gx: number, gy: number, width: number, height: number): boolean {
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        const cell = this.getCell(gx + dx, gy + dy);
        if (!cell) return false;
        if (cell.terrain === 'water') return false;
        if (cell.building) return false;
      }
    }
    return true;
  }

  placeBuilding(building: PlacedBuilding, width: number, height: number): void {
    const { gx, gy } = building;
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        const cell = this.cells[gx + dx][gy + dy];
        cell.building = building;
        cell.masterGx = gx;
        cell.masterGy = gy;
        cell.isMaster = (dx === 0 && dy === 0);
      }
    }
  }

  removeBuilding(gx: number, gy: number): PlacedBuilding | null {
    const cell = this.getCell(gx, gy);
    if (!cell || !cell.building) return null;

    // Find master
    const masterCell = this.getCell(cell.masterGx, cell.masterGy);
    if (!masterCell || !masterCell.building) return null;

    const building = masterCell.building;
    const mgx = cell.masterGx;
    const mgy = cell.masterGy;

    // Clear all cells of this building
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const c = this.cells[x][y];
        if (c.masterGx === mgx && c.masterGy === mgy && c.building) {
          c.building = null;
          c.masterGx = -1;
          c.masterGy = -1;
          c.isMaster = false;
        }
      }
    }

    return building;
  }

  getAllBuildings(): PlacedBuilding[] {
    const buildings: PlacedBuilding[] = [];
    for (let gx = 0; gx < this.size; gx++) {
      for (let gy = 0; gy < this.size; gy++) {
        const cell = this.cells[gx][gy];
        if (cell.isMaster && cell.building) {
          buildings.push(cell.building);
        }
      }
    }
    return buildings;
  }

  getMasterBuilding(gx: number, gy: number): PlacedBuilding | null {
    const cell = this.getCell(gx, gy);
    if (!cell || !cell.building) return null;
    const master = this.getCell(cell.masterGx, cell.masterGy);
    return master?.building ?? null;
  }
}
