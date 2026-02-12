import { Grid } from '../grid/Grid';
import { TerrainType } from '../grid/Cell';
import { SimplexNoise, octaveNoise } from './SimplexNoise';

export class MapGenerator {
  private elevNoise: SimplexNoise;
  private moistNoise: SimplexNoise;
  private detailNoise: SimplexNoise;

  constructor(private seed: number = Math.random() * 65536) {
    this.elevNoise = new SimplexNoise(seed);
    this.moistNoise = new SimplexNoise(seed + 1000);
    this.detailNoise = new SimplexNoise(seed + 2000);
  }

  generate(grid: Grid): void {
    const size = grid.size;
    const elevation = this.generateElevation(size);
    const moisture = this.generateMoisture(size);

    // Pass 1: Assign terrain from elevation + moisture
    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        const e = elevation[gx][gy];
        const m = moisture[gx][gy];
        const terrain = this.classifyTerrain(e, m);
        grid.setTerrain(gx, gy, terrain);
        const cell = grid.getCell(gx, gy);
        if (cell) cell.elevation = Math.max(0, Math.floor(e * 2));
      }
    }

    // Pass 2: Carve rivers
    this.carveRivers(grid, elevation, size);

    // Pass 3: Smooth lakes - expand tiny water clusters, remove single-tile artifacts
    this.smoothWater(grid, size);

    // Pass 4: Clear starting zone near center
    this.clearStartingZone(grid, size);
  }

  private generateElevation(size: number): number[][] {
    const map: number[][] = [];
    for (let x = 0; x < size; x++) {
      map[x] = [];
      for (let y = 0; y < size; y++) {
        // 3-octave noise, scaled to create interesting terrain
        let val = octaveNoise(this.elevNoise, x, y, 3, 0.5, 2.0, 0.06);
        // Bias edges lower (island effect)
        const dx = (x - size / 2) / (size / 2);
        const dy = (y - size / 2) / (size / 2);
        const edgeDist = 1 - Math.max(Math.abs(dx), Math.abs(dy));
        val = val * 0.7 + edgeDist * 0.3;
        map[x][y] = val;
      }
    }
    return map;
  }

  private generateMoisture(size: number): number[][] {
    const map: number[][] = [];
    for (let x = 0; x < size; x++) {
      map[x] = [];
      for (let y = 0; y < size; y++) {
        map[x][y] = octaveNoise(this.moistNoise, x, y, 2, 0.5, 2.0, 0.08);
      }
    }
    return map;
  }

  private classifyTerrain(elevation: number, moisture: number): TerrainType {
    if (elevation < -0.15) return 'water';
    if (elevation > 0.55) return 'hill';
    if (elevation > 0.0 && moisture > 0.15) return 'forest';
    if (elevation < 0.05) return 'dirt'; // low-lying clearings
    return 'ground';
  }

  private carveRivers(grid: Grid, elevation: number[][], size: number): void {
    // 1-2 rivers via gradient descent from high to low terrain
    const numRivers = 1 + Math.floor(Math.random() * 2);
    for (let r = 0; r < numRivers; r++) {
      // Start from a high point near edge
      let sx: number, sy: number;
      let bestElev = -Infinity;
      for (let attempt = 0; attempt < 20; attempt++) {
        const edge = Math.floor(Math.random() * 4);
        let tx: number, ty: number;
        switch (edge) {
          case 0: tx = Math.floor(Math.random() * size); ty = 0; break;
          case 1: tx = Math.floor(Math.random() * size); ty = size - 1; break;
          case 2: tx = 0; ty = Math.floor(Math.random() * size); break;
          default: tx = size - 1; ty = Math.floor(Math.random() * size); break;
        }
        if (elevation[tx]?.[ty] !== undefined && elevation[tx][ty] > bestElev) {
          bestElev = elevation[tx][ty];
          sx = tx;
          sy = ty;
        }
      }

      // Gradient descent with wobble
      let cx = sx!;
      let cy = sy!;
      const visited = new Set<string>();
      for (let step = 0; step < size * 2; step++) {
        const key = `${cx},${cy}`;
        if (visited.has(key)) break;
        visited.add(key);

        if (!grid.inBounds(cx, cy)) break;

        // Set river tile (1-2 tiles wide)
        grid.setTerrain(cx, cy, 'water');
        // Random width expansion
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        if (Math.random() < 0.5) {
          const d = dirs[Math.floor(Math.random() * 4)];
          const nx = cx + d[0];
          const ny = cy + d[1];
          if (grid.inBounds(nx, ny)) {
            grid.setTerrain(nx, ny, 'water');
          }
        }

        // Find lowest neighbor (with wobble)
        let bestNx = cx, bestNy = cy;
        let bestE = Infinity;
        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!grid.inBounds(nx, ny)) continue;
          const e = elevation[nx][ny] + (Math.random() - 0.5) * 0.15;
          if (e < bestE) {
            bestE = e;
            bestNx = nx;
            bestNy = ny;
          }
        }

        if (bestNx === cx && bestNy === cy) break;
        cx = bestNx;
        cy = bestNy;
      }
    }
  }

  private smoothWater(grid: Grid, size: number): void {
    // Remove single isolated water tiles
    for (let gx = 0; gx < size; gx++) {
      for (let gy = 0; gy < size; gy++) {
        const cell = grid.getCell(gx, gy);
        if (!cell || cell.terrain !== 'water') continue;
        let waterNeighbors = 0;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const n = grid.getCell(gx + dx, gy + dy);
          if (n && n.terrain === 'water') waterNeighbors++;
        }
        if (waterNeighbors === 0) {
          grid.setTerrain(gx, gy, 'dirt');
        }
      }
    }

    // Expand small water clusters into lakes
    for (let gx = 1; gx < size - 1; gx++) {
      for (let gy = 1; gy < size - 1; gy++) {
        const cell = grid.getCell(gx, gy);
        if (!cell || cell.terrain !== 'ground') continue;
        let waterNeighbors = 0;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const n = grid.getCell(gx + dx, gy + dy);
          if (n && n.terrain === 'water') waterNeighbors++;
        }
        if (waterNeighbors >= 3) {
          grid.setTerrain(gx, gy, 'water');
        }
      }
    }
  }

  private clearStartingZone(grid: Grid, size: number): void {
    // Clear a buildable area near map center
    const cx = Math.floor(size / 2);
    const cy = Math.floor(size / 2);
    const radius = 5;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const gx = cx + dx;
        const gy = cy + dy;
        const cell = grid.getCell(gx, gy);
        if (!cell) continue;
        if (cell.terrain === 'water' || cell.terrain === 'hill' || cell.terrain === 'forest') {
          grid.setTerrain(gx, gy, 'ground');
          cell.elevation = 0;
        }
      }
    }
  }
}
