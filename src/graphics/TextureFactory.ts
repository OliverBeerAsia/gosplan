import { Renderer, Sprite, Texture } from 'pixi.js';
import { generateTerrainTextures } from './TerrainTextures';
import { generateBuildingTextures } from './BuildingTextures';
import { loadSpriteAtlasTextures } from './SpriteAtlasLoader';
import { assetPath } from '../utils/assetPath';
import { ArtRegistry } from './ArtRegistry';
import {
  ArtFrameRef,
  ArtLod,
  ArtPoint,
  ArtSeason,
  BuildingArtDef,
  BuildingArtVariant,
  EnvironmentArtPart,
  LEGACY_ART_ATLAS_ID,
  parseArtFrameRef,
} from './ArtManifest';
import { VisualVariantContext } from './ArtVariantResolver';

export interface AuthoredBuildingTexture {
  texture: Texture;
  reference: ArtFrameRef;
  definition: BuildingArtDef;
  anchor: ArtPoint;
  lod: ArtLod;
  source: 'variant' | 'base';
  variantId?: string;
  /** The metadata owner for the frame that actually reached the sprite. */
  variant?: BuildingArtVariant;
  entrances: readonly ArtPoint[];
  queueAnchors: readonly ArtPoint[];
  windowAnchors: readonly ArtPoint[];
}

export interface EnvironmentPartTexture {
  texture: Texture;
  anchor: ArtPoint;
  source: 'authored-winter' | 'authored-base' | 'procedural';
  reference?: ArtFrameRef;
}

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
  if (key.startsWith('shore_')) return true;
  if (key === 'lamp_pool' || key === 'building_shadow') return true;
  if (key === 'road' || key === 'power_line') return true;
  return false;
}

export class TextureFactory {
  private textures: Map<string, Texture> = new Map();
  private artTextures: Map<ArtFrameRef, Texture> = new Map();
  private renderer!: Renderer;
  private artRegistry?: ArtRegistry;

  async generate(renderer: Renderer): Promise<void> {
    this.renderer = renderer;
    this.artRegistry = undefined;
    this.artTextures.clear();

    // Metadata loads alongside the legacy texture pipeline but does not select
    // textures yet. The compatibility facade remains entirely fallback-first.
    const artRegistryPromise = this.loadArtRegistrySafely();

    const terrain = generateTerrainTextures(renderer);
    const buildings = generateBuildingTextures(renderer);

    for (const [k, v] of terrain) this.textures.set(k, v);
    for (const [k, v] of buildings) this.textures.set(k, v);

    // The legacy pixel-city migration atlas is intentionally not loaded here.
    // Its SVG was unparseable from 2026-02 to 2026-07, so the override path
    // never took effect on any shipped build; the procedural terrain, zone,
    // road, and overlay textures below are the canonical production art.
    // Authored art now enters exclusively through the versioned manifest.

    // Procedural style variants keep districts from looking copy-pasted.
    this.generateStylisticBuildingVariants(renderer);
    this.generateDistrictBuildingVariants(renderer);

    // Generate unpowered variants for all building-like textures.
    this.generateUnpoweredVariants(renderer);

    this.artRegistry = await artRegistryPromise;
    if (this.artRegistry) await this.loadManifestAtlasesSafely(this.artRegistry);
  }

  private async loadArtRegistrySafely(): Promise<ArtRegistry | undefined> {
    try {
      return await ArtRegistry.load(assetPath('assets/art/manifest.v1.json'));
    } catch (error) {
      console.warn(
        '[TextureFactory] Authored art manifest unavailable; continuing with legacy textures.',
        error,
      );
      return undefined;
    }
  }

  private async loadManifestAtlasesSafely(registry: ArtRegistry): Promise<void> {
    const results = await Promise.all(registry.getAtlases().map(async (atlas) => {
      try {
        const frames = await loadSpriteAtlasTextures(
          assetPath(atlas.framesFile),
          { imageUrl: assetPath(atlas.image) },
        );
        return { atlas, frames };
      } catch (error) {
        console.warn(`[TextureFactory] Authored atlas "${atlas.id}" failed to load.`, error);
        return { atlas, frames: new Map<string, Texture>() };
      }
    }));

    for (const { atlas, frames } of results) {
      if (frames.size === 0) {
        console.warn(`[TextureFactory] Authored atlas "${atlas.id}" supplied no usable frames.`);
        continue;
      }
      for (const [frameId, texture] of frames) {
        this.artTextures.set(`${atlas.id}:${frameId}`, texture);
      }
    }
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

  /** Optional authored metadata. Legacy textures remain valid when unavailable. */
  getArtRegistry(): ArtRegistry | undefined {
    return this.artRegistry;
  }

  /** Pixi texture lookup using the manifest's full `<atlasId>:<frameId>` key. */
  getArtTexture(reference: ArtFrameRef): Texture | undefined {
    return this.artTextures.get(reference);
  }

  hasArtTexture(reference: ArtFrameRef): boolean {
    return this.artTextures.has(reference);
  }

  /**
   * Resolve one tile-local environment part. Winter may fall back to the base
   * authored frame, then to the declared procedural prop without suppressing
   * the rest of the environment pipeline.
   */
  resolveEnvironmentPartTexture(
    part: EnvironmentArtPart,
    lod: ArtLod,
    season: ArtSeason,
  ): EnvironmentPartTexture | undefined {
    const candidates: Array<{
      reference: ArtFrameRef;
      source: 'authored-winter' | 'authored-base';
    }> = [];
    const winterReference = season === 'winter' ? part.winterLod?.[lod] : undefined;
    if (winterReference) {
      candidates.push({ reference: winterReference, source: 'authored-winter' });
    }
    candidates.push({ reference: part.lod[lod], source: 'authored-base' });

    for (const candidate of candidates) {
      const texture = this.artTextures.get(candidate.reference);
      if (!texture) continue;
      return {
        texture,
        anchor: part.anchor,
        reference: candidate.reference,
        source: candidate.source,
      };
    }

    if (part.proceduralFallback && this.textures.has(part.proceduralFallback)) {
      return {
        texture: this.textures.get(part.proceduralFallback)!,
        anchor: part.anchor,
        source: 'procedural',
      };
    }
    return undefined;
  }

  /** Optional transparent night overlay for one authored environment part. */
  resolveEnvironmentEmissiveTexture(
    part: EnvironmentArtPart,
    lod: ArtLod,
  ): EnvironmentPartTexture | undefined {
    const reference = part.emissiveLod?.[lod];
    if (!reference) return undefined;
    const texture = this.artTextures.get(reference);
    if (!texture) return undefined;
    return {
      texture,
      anchor: part.anchor,
      reference,
      source: 'authored-base',
    };
  }

  /**
   * Resolve an opted-in authored building texture. The legacy migration atlas
   * is deliberately ignored here so existing buildings retain their exact
   * procedural texture, tint, and unpowered behavior until a new atlas is
   * referenced by the manifest.
   */
  resolveAuthoredBuildingTexture(
    buildingId: string,
    lod: ArtLod,
    context: VisualVariantContext,
  ): AuthoredBuildingTexture | undefined {
    const resolved = this.artRegistry?.resolveBuilding(buildingId, lod, context);
    if (!resolved) return undefined;

    const candidates = [
      resolved.variantLodFrame
        ? {
            frame: resolved.variantLodFrame,
            source: 'variant' as const,
            variantId: resolved.variant?.id,
          }
        : undefined,
      resolved.variantFrame
        ? {
            frame: resolved.variantFrame,
            source: 'variant' as const,
            variantId: resolved.variant?.id,
          }
        : undefined,
      { frame: resolved.baseFrame, source: 'base' as const },
    ].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

    for (const candidate of candidates) {
      const parsed = parseArtFrameRef(candidate.frame.reference);
      if (!parsed || parsed.atlasId === LEGACY_ART_ATLAS_ID) continue;
      const texture = this.artTextures.get(candidate.frame.reference);
      if (!texture) continue;
      const selectedVariant = candidate.source === 'variant'
        ? resolved.variant
        : undefined;
      return {
        texture,
        reference: candidate.frame.reference,
        definition: resolved.definition,
        anchor: resolved.definition.anchor,
        lod,
        source: candidate.source,
        variantId: candidate.variantId,
        variant: selectedVariant,
        entrances: selectedVariant?.entrances ?? resolved.definition.entrances ?? [],
        queueAnchors: selectedVariant?.queueAnchors ?? resolved.definition.queueAnchors ?? [],
        windowAnchors: selectedVariant?.windowAnchors ?? resolved.definition.windowAnchors ?? [],
      };
    }

    return undefined;
  }

  /** Manifest-declared procedural recovery key, with the old key as fallback. */
  getProceduralBuildingFallback(buildingId: string): string | undefined {
    const declared = this.artRegistry?.getBuilding(buildingId)?.proceduralFallback;
    if (declared && this.textures.has(declared)) return declared;
    return this.textures.has(buildingId) ? buildingId : undefined;
  }
}
