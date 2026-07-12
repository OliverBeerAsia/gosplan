import { MAP_SIZE } from '../constants';
import { Cell, TerrainType, ZoneType } from './Cell';
import { PlacedBuilding } from '../buildings/BuildingTypes';

interface BuildingFootprint {
  gx: number;
  gy: number;
  width: number;
  height: number;
}

// Generated maps currently use a much smaller range. This cap is defensive for
// hand-edited or legacy save data so one corrupt value cannot move sprites far
// outside the camera and pointer-picking search area.
export const MAX_RENDER_ELEVATION = 8;

export class Grid {
  readonly size: number;
  private cells: Cell[][];
  private buildingsById = new Map<number, PlacedBuilding>();
  private footprintsById = new Map<number, BuildingFootprint>();
  private cachedMaxElevation: number | null = null;

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
          zone: 'none',
          serviceCoverage: 0,
          districtId: '',
          districtStyle: 'none',
          activityLevel: 0,
          unrestMarker: false,
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

  /**
   * Return a finite, integer elevation suitable for projection and comparison.
   * Water is always rendered at the shared water plane, including old saves.
   */
  getElevation(gx: number, gy: number): number {
    const cell = this.getCell(gx, gy);
    if (!cell || cell.terrain === 'water') return 0;
    const elevation = Number(cell.elevation);
    if (!Number.isFinite(elevation)) return 0;
    return Math.max(0, Math.min(MAX_RENDER_ELEVATION, Math.floor(elevation)));
  }

  getMaxElevation(): number {
    if (this.cachedMaxElevation !== null) return this.cachedMaxElevation;
    let max = 0;
    for (let gx = 0; gx < this.size; gx++) {
      for (let gy = 0; gy < this.size; gy++) {
        max = Math.max(max, this.getElevation(gx, gy));
      }
    }
    this.cachedMaxElevation = max;
    return this.cachedMaxElevation;
  }

  setElevation(gx: number, gy: number, elevation: number): void {
    const cell = this.getCell(gx, gy);
    if (!cell) return;
    cell.elevation = elevation;
    this.cachedMaxElevation = null;
  }

  /** Networks cannot cross a cliff until explicit ramp assets/rules exist. */
  canConnectAtEqualElevation(fromGx: number, fromGy: number, toGx: number, toGy: number): boolean {
    if (!this.inBounds(fromGx, fromGy) || !this.inBounds(toGx, toGy)) return false;
    return this.getElevation(fromGx, fromGy) === this.getElevation(toGx, toGy);
  }

  setTerrain(gx: number, gy: number, terrain: TerrainType): void {
    const cell = this.getCell(gx, gy);
    if (cell) {
      cell.terrain = terrain;
      this.cachedMaxElevation = null;
    }
  }

  setZone(gx: number, gy: number, zone: ZoneType): boolean {
    const cell = this.getCell(gx, gy);
    if (!cell) return false;

    // Zones only apply to empty cells; clearing a zone is always allowed.
    if (cell.building && zone !== 'none') return false;
    if (cell.zone === zone) return false;

    cell.zone = zone;
    return true;
  }

  getZone(gx: number, gy: number): ZoneType {
    const cell = this.getCell(gx, gy);
    return cell?.zone ?? 'none';
  }

  canPlace(gx: number, gy: number, width: number, height: number): boolean {
    return this.getPlacementRejection(gx, gy, width, height) === null;
  }

  /**
   * Compatibility predicate for reconstructing archived buildings. Saves made
   * before level-footprint placement existed may contain a building spanning
   * multiple elevations; those buildings remain loadable and render from their
   * master cell's elevation, but cannot be newly placed that way.
   */
  canRestoreFootprint(gx: number, gy: number, width: number, height: number): boolean {
    return this.getPlacementRejection(gx, gy, width, height, false) === null;
  }

  getPlacementRejection(
    gx: number,
    gy: number,
    width: number,
    height: number,
    requireLevel: boolean = true
  ): string | null {
    let footprintElevation: number | null = null;
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        const cell = this.getCell(gx + dx, gy + dy);
        if (!cell) return 'Out of bounds';
        if (cell.building) return 'Space occupied';
        if (!this.isBuildable(cell.terrain)) {
          if (cell.terrain === 'water') return 'Cannot build on water';
          if (cell.terrain === 'hill') return 'Cannot build on hills';
          if (cell.terrain === 'forest') return 'Clear forest first (demolish)';
          return 'Terrain not buildable';
        }
        if (requireLevel) {
          const elevation = this.getElevation(gx + dx, gy + dy);
          if (footprintElevation === null) {
            footprintElevation = elevation;
          } else if (elevation !== footprintElevation) {
            return 'Ground must be level';
          }
        }
      }
    }
    return null;
  }

  isBuildable(terrain: TerrainType): boolean {
    return terrain === 'ground' || terrain === 'dirt';
  }

  clearForest(gx: number, gy: number): boolean {
    const cell = this.getCell(gx, gy);
    if (!cell || cell.terrain !== 'forest') return false;
    cell.terrain = 'dirt';
    return true;
  }

  placeBuilding(building: PlacedBuilding, width: number, height: number): void {
    const { gx, gy } = building;
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        const cell = this.cells[gx + dx][gy + dy];
        cell.building = building;
        cell.zone = 'none';
        cell.masterGx = gx;
        cell.masterGy = gy;
        cell.isMaster = (dx === 0 && dy === 0);
      }
    }

    this.buildingsById.set(building.id, building);
    this.footprintsById.set(building.id, { gx, gy, width, height });
  }

  removeBuilding(gx: number, gy: number): PlacedBuilding | null {
    const cell = this.getCell(gx, gy);
    if (!cell || !cell.building) return null;

    // Find master
    const masterCell = this.getCell(cell.masterGx, cell.masterGy);
    if (!masterCell || !masterCell.building) return null;

    const building = masterCell.building;
    const footprint = this.footprintsById.get(building.id);
    if (!footprint) return null;

    // Clear only this footprint (O(width*height) instead of O(map^2)).
    for (let dx = 0; dx < footprint.width; dx++) {
      for (let dy = 0; dy < footprint.height; dy++) {
        const target = this.getCell(footprint.gx + dx, footprint.gy + dy);
        if (!target) continue;
        target.building = null;
        target.masterGx = -1;
        target.masterGy = -1;
        target.isMaster = false;
      }
    }

    this.buildingsById.delete(building.id);
    this.footprintsById.delete(building.id);

    return building;
  }

  getAllBuildings(): PlacedBuilding[] {
    return [...this.buildingsById.values()];
  }

  getMasterBuilding(gx: number, gy: number): PlacedBuilding | null {
    const cell = this.getCell(gx, gy);
    if (!cell || !cell.building) return null;
    const master = this.getCell(cell.masterGx, cell.masterGy);
    return master?.building ?? null;
  }

  getBuildingById(id: number): PlacedBuilding | null {
    return this.buildingsById.get(id) ?? null;
  }

  getBuildingFootprint(id: number): BuildingFootprint | null {
    return this.footprintsById.get(id) ?? null;
  }
}
