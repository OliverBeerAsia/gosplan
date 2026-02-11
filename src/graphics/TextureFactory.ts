import { Renderer, Texture } from 'pixi.js';
import { generateTerrainTextures } from './TerrainTextures';
import { generateBuildingTextures } from './BuildingTextures';

export class TextureFactory {
  private textures: Map<string, Texture> = new Map();

  generate(renderer: Renderer): void {
    const terrain = generateTerrainTextures(renderer);
    const buildings = generateBuildingTextures(renderer);

    for (const [k, v] of terrain) this.textures.set(k, v);
    for (const [k, v] of buildings) this.textures.set(k, v);
  }

  get(key: string): Texture {
    const t = this.textures.get(key);
    if (!t) throw new Error(`Texture not found: ${key}`);
    return t;
  }

  has(key: string): boolean {
    return this.textures.has(key);
  }
}
