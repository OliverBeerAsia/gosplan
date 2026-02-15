import { Graphics, Renderer, Sprite, Texture, Container } from 'pixi.js';
import { generateTerrainTextures } from './TerrainTextures';
import { generateBuildingTextures } from './BuildingTextures';
import { loadSpriteAtlasTextures } from './SpriteAtlasLoader';
import { assetPath } from '../utils/assetPath';

type DistrictStyle = 'worker_housing' | 'heavy_industry' | 'scientific_city' | 'historic_core';

const DISTRICT_STYLES: DistrictStyle[] = [
  'worker_housing',
  'heavy_industry',
  'scientific_city',
  'historic_core',
];

const NON_BUILDING_KEYS = new Set([
  'ground', 'water', 'forest', 'hill', 'dirt',
  'ground_highlight', 'ground_invalid',
  'power_overlay', 'service_overlay',
]);

function isNonBuildingTextureKey(key: string): boolean {
  if (NON_BUILDING_KEYS.has(key)) return true;
  if (key.startsWith('zone_')) return true;
  if (key.startsWith('road_')) return true;
  if (key.startsWith('power_line_')) return true;
  if (key.startsWith('terrain_')) return true;
  if (key.startsWith('ground_')) return true;
  if (key.startsWith('water_')) return true;
  if (key.startsWith('forest_')) return true;
  if (key.startsWith('hill_')) return true;
  if (key.startsWith('dirt_')) return true;
  if (key.startsWith('prop_')) return true;
  if (key.startsWith('queue_')) return true;
  if (key === 'road' || key === 'power_line') return true;
  return false;
}

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
    const atlas = await loadSpriteAtlasTextures(assetPath('assets/atlas/pixel-city.json'));
    for (const [k, v] of atlas) {
      this.textures.set(k, v);
    }

    // Procedural style variants keep districts from looking copy-pasted.
    this.generateStylisticBuildingVariants(renderer);
    this.generateDistrictBuildingVariants(renderer);

    // Generate unpowered variants for all building-like textures.
    this.generateUnpoweredVariants(renderer);
  }

  private generateStylisticBuildingVariants(renderer: Renderer): void {
    const keys = [...this.textures.keys()];
    for (const key of keys) {
      if (isNonBuildingTextureKey(key)) continue;
      if (key.endsWith('_unpowered')) continue;
      if (key.includes('_var')) continue;

      const tex = this.textures.get(key);
      if (!tex) continue;

      const warmKey = `${key}_var1`;
      if (!this.textures.has(warmKey)) {
        this.textures.set(warmKey, this.createVariantTexture(renderer, tex, 'warm'));
      }

      const coolKey = `${key}_var2`;
      if (!this.textures.has(coolKey)) {
        this.textures.set(coolKey, this.createVariantTexture(renderer, tex, 'cool'));
      }
    }
  }

  private createVariantTexture(
    renderer: Renderer,
    source: Texture,
    mood: 'warm' | 'cool'
  ): Texture {
    const container = new Container();
    const base = new Sprite(source);
    container.addChild(base);

    const tone = new Graphics();
    tone.rect(0, 0, source.width, source.height);
    tone.fill({
      color: mood === 'warm' ? 0x6A5644 : 0x6E7C8E,
      alpha: mood === 'warm' ? 0.12 : 0.1,
    });
    container.addChild(tone);

    const accents = new Graphics();
    if (mood === 'warm') {
      for (let i = 0; i < 8; i++) {
        const x = 4 + (i * 11) % Math.max(8, source.width - 8);
        const y = 6 + (i * 7) % Math.max(8, source.height - 8);
        accents.circle(x, y, 1.1);
        accents.fill({ color: 0x3B2F25, alpha: 0.18 });
      }
    } else {
      accents.rect(2, 6, Math.max(4, source.width - 4), 2);
      accents.fill({ color: 0xB71C1C, alpha: 0.25 });
      accents.rect(2, 12, Math.max(4, source.width - 10), 1);
      accents.fill({ color: 0xD9C87A, alpha: 0.22 });
    }
    container.addChild(accents);

    const tex = renderer.generateTexture(container);
    container.destroy();
    return tex;
  }

  private generateDistrictBuildingVariants(renderer: Renderer): void {
    const keys = [...this.textures.keys()];
    for (const key of keys) {
      if (isNonBuildingTextureKey(key)) continue;
      if (key.endsWith('_unpowered')) continue;
      if (key.includes('_district_')) continue;

      const tex = this.textures.get(key);
      if (!tex) continue;

      for (const style of DISTRICT_STYLES) {
        const districtKey = `${key}_district_${style}`;
        if (this.textures.has(districtKey)) continue;
        this.textures.set(districtKey, this.createDistrictVariantTexture(renderer, tex, style));
      }
    }
  }

  private createDistrictVariantTexture(
    renderer: Renderer,
    source: Texture,
    style: DistrictStyle
  ): Texture {
    const container = new Container();
    const base = new Sprite(source);
    container.addChild(base);

    const tone = new Graphics();
    tone.rect(0, 0, source.width, source.height);

    let color = 0x000000;
    let alpha = 0.08;
    if (style === 'worker_housing') {
      color = 0x726453;
      alpha = 0.12;
    } else if (style === 'heavy_industry') {
      color = 0x4A473F;
      alpha = 0.18;
    } else if (style === 'scientific_city') {
      color = 0x748EA2;
      alpha = 0.1;
    } else if (style === 'historic_core') {
      color = 0x8A6F4D;
      alpha = 0.12;
    }

    tone.fill({ color, alpha });
    container.addChild(tone);

    const accents = new Graphics();
    if (style === 'worker_housing') {
      // Laundry-line style accents.
      for (let i = 0; i < 3; i++) {
        const y = 10 + i * 10;
        accents.rect(4, y, Math.max(6, source.width - 8), 1);
        accents.fill({ color: 0x3A3026, alpha: 0.26 });
      }
    } else if (style === 'heavy_industry') {
      // Soot and hazard striping.
      accents.rect(2, Math.max(4, source.height - 10), Math.max(4, source.width - 4), 2);
      accents.fill({ color: 0xA35A32, alpha: 0.28 });
      for (let i = 0; i < 8; i++) {
        const x = 4 + (i * 9) % Math.max(8, source.width - 6);
        const y = 4 + (i * 5) % Math.max(8, source.height - 6);
        accents.circle(x, y, 1.2);
        accents.fill({ color: 0x1C1C1C, alpha: 0.22 });
      }
    } else if (style === 'scientific_city') {
      // Cooler clean bands and cyan glints.
      accents.rect(3, 6, Math.max(5, source.width - 10), 1);
      accents.fill({ color: 0xC3E4F3, alpha: 0.3 });
      accents.rect(3, 13, Math.max(5, source.width - 12), 1);
      accents.fill({ color: 0xC3E4F3, alpha: 0.24 });
    } else if (style === 'historic_core') {
      // Red banners and warm trim.
      accents.rect(4, 8, Math.max(4, source.width - 12), 2);
      accents.fill({ color: 0xAA1F23, alpha: 0.35 });
      accents.rect(4, source.height > 18 ? 16 : 12, Math.max(4, source.width - 14), 1);
      accents.fill({ color: 0xD8B96D, alpha: 0.32 });
    }
    container.addChild(accents);

    const tex = renderer.generateTexture(container);
    container.destroy();
    return tex;
  }

  private generateUnpoweredVariants(renderer: Renderer): void {
    for (const [key, tex] of this.textures) {
      if (key.endsWith('_unpowered')) continue;

      // Non-building overlays and terrain should not have dark variants.
      if (isNonBuildingTextureKey(key)) {
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
