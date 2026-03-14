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

const RESIDENTIAL_BUILDINGS = new Set(['khrushchyovka', 'stalinka', 'kommunalka', 'panelak']);
const INDUSTRIAL_BUILDINGS = new Set(['factory', 'coal_power_plant', 'warehouse']);
const CIVIC_BUILDINGS = new Set(['party_hq', 'hospital', 'school', 'cinema', 'radio_tower', 'metro_station', 'sports_complex']);

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

    // Optional authored atlas overrides terrain/overlay textures.
    // Building sprites are kept procedural so district variants and detail packs stay coherent.
    const atlas = await loadSpriteAtlasTextures(assetPath('assets/atlas/pixel-city.json'));
    for (const [k, v] of atlas) {
      if (!isNonBuildingTextureKey(k)) continue;
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

  /** Create a tinted copy — no overlay rectangles, so no background bleed. */
  private createVariantTexture(
    renderer: Renderer,
    source: Texture,
    mood: 'warm' | 'cool'
  ): Texture {
    const sprite = new Sprite(source);
    sprite.tint = mood === 'warm' ? 0xF2E8DC : 0xDCE4F0;
    const tex = renderer.generateTexture(sprite);
    sprite.destroy();
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

  /** Create a district-tinted copy — tint only, no overlay rectangles. */
  private createDistrictVariantTexture(
    renderer: Renderer,
    source: Texture,
    style: DistrictStyle
  ): Texture {
    const sprite = new Sprite(source);

    if (style === 'worker_housing') {
      sprite.tint = 0xEDE0D0;
    } else if (style === 'heavy_industry') {
      sprite.tint = 0xD8D2CC;
    } else if (style === 'scientific_city') {
      sprite.tint = 0xD8E8F4;
    } else if (style === 'historic_core') {
      sprite.tint = 0xF0E0C8;
    }

    const tex = renderer.generateTexture(sprite);
    sprite.destroy();
    return tex;
  }

  private getBuildingAccentColor(buildingKey: string): number {
    if (RESIDENTIAL_BUILDINGS.has(buildingKey)) return 0x7ED2FF;
    if (INDUSTRIAL_BUILDINGS.has(buildingKey)) return 0xF0A441;
    if (CIVIC_BUILDINGS.has(buildingKey)) return 0xD9C678;
    return 0xC7C7C7;
  }

  /** Create a darkened copy for unpowered buildings — tint only. */
  private generateUnpoweredVariants(renderer: Renderer): void {
    for (const [key, tex] of this.textures) {
      if (key.endsWith('_unpowered')) continue;
      if (isNonBuildingTextureKey(key)) continue;

      const sprite = new Sprite(tex);
      sprite.tint = 0xB0B0B0; // darken by ~30%
      const unpoweredTex = renderer.generateTexture(sprite);
      this.textures.set(`${key}_unpowered`, unpoweredTex);
      sprite.destroy();
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
