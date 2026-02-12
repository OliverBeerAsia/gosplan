import { Graphics, Renderer, Sprite, Texture, Container } from 'pixi.js';
import { generateTerrainTextures } from './TerrainTextures';
import { generateBuildingTextures } from './BuildingTextures';
import { loadSpriteAtlasTextures } from './SpriteAtlasLoader';

const NON_BUILDING_KEYS = new Set([
  'ground', 'water', 'forest', 'hill', 'dirt',
  'ground_highlight', 'ground_invalid',
  'power_overlay', 'service_overlay',
]);

export class TextureFactory {
  private textures: Map<string, Texture> = new Map();
  private renderer!: Renderer;

  async generate(renderer: Renderer): Promise<void> {
    this.renderer = renderer;

    const terrain = generateTerrainTextures(renderer);
    const buildings = generateBuildingTextures(renderer);

    for (const [k, v] of terrain) this.textures.set(k, v);
    for (const [k, v] of buildings) this.textures.set(k, v);

    // Optional authored atlas overrides procedural textures when available.
    const atlas = await loadSpriteAtlasTextures('/assets/atlas/pixel-city.json');
    for (const [k, v] of atlas) {
      this.textures.set(k, v);
    }

    // Generate unpowered variants for all building-like textures.
    this.generateUnpoweredVariants(renderer);
  }

  private generateUnpoweredVariants(renderer: Renderer): void {
    for (const [key, tex] of this.textures) {
      if (key.endsWith('_unpowered')) continue;

      // Non-building overlays and terrain should not have dark variants.
      if (
        NON_BUILDING_KEYS.has(key) ||
        key.startsWith('zone_') ||
        key.startsWith('road_') ||
        key.startsWith('power_line_') ||
        key === 'road' ||
        key === 'power_line'
      ) {
        continue;
      }

      const container = new Container();

      const baseSprite = new Sprite(tex);
      container.addChild(baseSprite);

      const overlay = new Graphics();
      overlay.rect(0, 0, tex.width, tex.height);
      overlay.fill({ color: 0x000000, alpha: 0.35 });
      container.addChild(overlay);

      const unpoweredTex = renderer.generateTexture(container);
      this.textures.set(`${key}_unpowered`, unpoweredTex);
      container.destroy();
    }
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
