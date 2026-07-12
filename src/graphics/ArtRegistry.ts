import {
  ART_MANIFEST_SCHEMA_VERSION,
  ArtAtlasDef,
  ArtFrameRef,
  ArtLod,
  ArtManifest,
  BuildingArtVariant,
  BuildingArtDef,
  EnvironmentArtDef,
  LoadingArtDef,
  ParsedArtFrameRef,
  TerrainArtDef,
  UiArtDef,
  parseArtFrameRef,
} from './ArtManifest';
import {
  VisualVariantContext,
  resolveBuildingArtVariant,
} from './ArtVariantResolver';

export interface ResolvedArtFrame extends ParsedArtFrameRef {
  reference: ArtFrameRef;
  atlas: ArtAtlasDef;
}

export interface ResolvedBuildingArt {
  definition: BuildingArtDef;
  baseFrame: ResolvedArtFrame;
  variant?: BuildingArtVariant;
  variantLodFrame?: ResolvedArtFrame;
  variantFrame?: ResolvedArtFrame;
}

export type ArtManifestFetcher = (url: string) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

/**
 * Read-only index for authored metadata. It does not own Pixi textures and is
 * therefore safe to introduce before TextureFactory becomes its compatibility
 * facade. Missing entries return undefined so current procedural fallbacks win.
 */
export class ArtRegistry {
  private readonly atlases = new Map<string, ArtAtlasDef>();
  private readonly buildings = new Map<string, BuildingArtDef>();
  private readonly terrain = new Map<string, TerrainArtDef>();
  private readonly environment = new Map<string, EnvironmentArtDef>();
  private readonly environmentByOwner = new Map<string, EnvironmentArtDef[]>();
  private readonly loading = new Map<string, LoadingArtDef>();
  private readonly ui = new Map<string, UiArtDef>();

  constructor(readonly manifest: ArtManifest) {
    if (manifest.schemaVersion !== ART_MANIFEST_SCHEMA_VERSION) {
      throw new Error(`Unsupported art manifest schema: ${String(manifest.schemaVersion)}`);
    }

    this.indexUnique(manifest.atlases, this.atlases, 'atlas');
    const buildingArtIds = new Set<string>();
    for (const definition of manifest.buildings) {
      if (buildingArtIds.has(definition.id)) {
        throw new Error(`Duplicate building art ID: ${definition.id}`);
      }
      if (this.buildings.has(definition.buildingId)) {
        throw new Error(`Duplicate building art owner: ${definition.buildingId}`);
      }
      buildingArtIds.add(definition.id);
      this.buildings.set(definition.buildingId, definition);
    }
    this.indexUnique(manifest.terrain, this.terrain, 'terrain');
    this.indexUnique(manifest.environment ?? [], this.environment, 'environment art');
    for (const definition of this.environment.values()) {
      for (const ownerBuildingId of definition.ownerBuildingIds) {
        const definitions = this.environmentByOwner.get(ownerBuildingId) ?? [];
        definitions.push(definition);
        this.environmentByOwner.set(ownerBuildingId, definitions);
      }
    }
    for (const definitions of this.environmentByOwner.values()) {
      definitions.sort((left, right) => left.id.localeCompare(right.id));
    }
    this.indexUnique(manifest.loading, this.loading, 'loading art');
    this.indexUnique(manifest.ui, this.ui, 'UI art');
  }

  static async load(url: string, fetcher: ArtManifestFetcher = fetch): Promise<ArtRegistry> {
    const response = await fetcher(url);
    if (!response.ok) throw new Error(`Unable to load art manifest: ${url}`);
    return new ArtRegistry(await response.json() as ArtManifest);
  }

  getAtlas(id: string): ArtAtlasDef | undefined {
    return this.atlases.get(id);
  }

  getAtlases(): readonly ArtAtlasDef[] {
    return this.manifest.atlases;
  }

  getBuilding(buildingId: string): BuildingArtDef | undefined {
    return this.buildings.get(buildingId);
  }

  getTerrain(id: string): TerrainArtDef | undefined {
    return this.terrain.get(id);
  }

  getEnvironment(id: string): EnvironmentArtDef | undefined {
    return this.environment.get(id);
  }

  getEnvironmentDefinitions(): readonly EnvironmentArtDef[] {
    return [...this.environment.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  getEnvironmentForOwner(ownerBuildingId: string): readonly EnvironmentArtDef[] {
    return this.environmentByOwner.get(ownerBuildingId) ?? [];
  }

  getLoading(id: string): LoadingArtDef | undefined {
    return this.loading.get(id);
  }

  getUi(id: string): UiArtDef | undefined {
    return this.ui.get(id);
  }

  resolveFrame(reference: ArtFrameRef): ResolvedArtFrame | undefined {
    const parsed = parseArtFrameRef(reference);
    if (!parsed) return undefined;
    const atlas = this.atlases.get(parsed.atlasId);
    if (!atlas) return undefined;
    return { ...parsed, reference, atlas };
  }

  resolveBuilding(
    buildingId: string,
    lod: ArtLod,
    context: VisualVariantContext,
  ): ResolvedBuildingArt | undefined {
    const definition = this.buildings.get(buildingId);
    if (!definition) return undefined;

    const baseFrame = this.resolveFrame(definition.lod[lod]);
    if (!baseFrame) return undefined;

    const variant = resolveBuildingArtVariant(definition.variants, context);
    const variantLodFrame = variant?.lod
      ? this.resolveFrame(variant.lod[lod])
      : undefined;
    const variantFrame = variant ? this.resolveFrame(variant.frame) : undefined;
    return { definition, baseFrame, variant, variantLodFrame, variantFrame };
  }

  private indexUnique<T extends { id: string }>(
    definitions: readonly T[],
    target: Map<string, T>,
    label: string,
  ): void {
    for (const definition of definitions) {
      if (target.has(definition.id)) throw new Error(`Duplicate ${label} ID: ${definition.id}`);
      target.set(definition.id, definition);
    }
  }
}
