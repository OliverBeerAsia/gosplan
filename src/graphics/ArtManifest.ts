/**
 * Versioned contract for authored game art.
 *
 * Frame references use `<atlasId>:<frameId>`. The manifest is deliberately
 * independent of Pixi so it can be validated in Node and consumed by runtime
 * loaders without pulling rendering state into save data.
 */

export const ART_MANIFEST_SCHEMA_VERSION = 1 as const;

export const ART_DISTRICT_STYLES = [
  'worker_housing',
  'heavy_industry',
  'scientific_city',
  'historic_core',
] as const;

export const ART_ERAS = [1, 2, 3, 4] as const;
export const ART_SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export const ART_LODS = ['far', 'mid', 'near'] as const;

/**
 * The migration atlas is metadata-compatible but must not replace the current
 * procedural building pipeline. New authored atlases opt into runtime building
 * selection simply by using a different stable atlas ID.
 */
export const LEGACY_ART_ATLAS_ID = 'legacy.pixel_city' as const;

export type ArtDistrictStyle = typeof ART_DISTRICT_STYLES[number];
export type ArtEra = typeof ART_ERAS[number];
export type ArtSeason = typeof ART_SEASONS[number];
export type ArtLod = typeof ART_LODS[number];
export type ArtFrameRef = `${string}:${string}`;
export type ArtPoint = readonly [number, number];
export type ArtFootprint = readonly [number, number];

export interface ArtManifestMetadata {
  title: string;
  generatedBy?: string;
  migrationNotes?: string;
}

export interface ArtAtlasDef {
  /** Stable identifier used by ArtFrameRef values. */
  id: string;
  /** Public-root-relative image path. */
  image: string;
  /** Public-root-relative JSON file containing a `frames` object. */
  framesFile: string;
  pixelRatio?: 1 | 2;
}

export interface ArtLodFrames {
  far: ArtFrameRef;
  mid: ArtFrameRef;
  near: ArtFrameRef;
}

export interface BuildingArtVariant {
  id: string;
  /** Backward-compatible single-frame fallback for older authored entries. */
  frame: ArtFrameRef;
  /** Optional physical-mass frames for zoom-specific silhouette control. */
  lod?: ArtLodFrames;
  allowedDistricts: ArtDistrictStyle[];
  minimumEra: ArtEra;
  maximumEra?: ArtEra;
  weight: number;
  /**
   * Optional frame-local interaction metadata for this physical mass. When a
   * field is omitted, the building-level metadata remains the compatibility
   * fallback for older manifests.
   */
  entrances?: ArtPoint[];
  queueAnchors?: ArtPoint[];
  windowAnchors?: ArtPoint[];
}

export interface ArtEmitter {
  kind: 'smoke' | 'steam' | 'spark';
  position: ArtPoint;
}

export interface BuildingArtDef {
  /** Stable art-entry ID. One active entry targets each building in schema v1. */
  id: string;
  buildingId: string;
  footprint: ArtFootprint;
  anchor: ArtPoint;
  iconFrame: ArtFrameRef;
  lod: ArtLodFrames;
  variants: BuildingArtVariant[];
  /** TextureFactory key used when authored art cannot be loaded. */
  proceduralFallback: string;
  constructionFrames?: ArtFrameRef[];
  winterOverlay?: ArtFrameRef;
  conditionOverlays?: Record<string, ArtFrameRef>;
  entrances?: ArtPoint[];
  queueAnchors?: ArtPoint[];
  windowAnchors?: ArtPoint[];
  emitters?: ArtEmitter[];
}

export type TerrainMaterial =
  | 'ground'
  | 'water'
  | 'forest'
  | 'hill'
  | 'dirt'
  | 'road'
  | 'power_line';

export type ElevationEdge = 'north_east' | 'south_east' | 'south_west' | 'north_west';

export interface TerrainArtDef {
  id: string;
  material: TerrainMaterial;
  lod: ArtLodFrames;
  seasonFrames?: Partial<Record<ArtSeason, ArtFrameRef>>;
  elevationEdges?: Partial<Record<ElevationEdge, ArtFrameRef>>;
  shorelineFrames?: Record<string, ArtFrameRef>;
  transitionMasks?: Record<string, ArtFrameRef>;
  roadMasks?: Record<string, ArtFrameRef>;
}

/** Render phase for one tile-local part of a larger environment composition. */
export type EnvironmentArtLayer = 'ground_decal' | 'prop';

export type EnvironmentMinimumQuality = 'medium' | 'high';

/**
 * One independently depth-sorted part of an authored environment recipe.
 * Offsets are grid-space coordinates inside the definition's reserved
 * footprint. Keeping parts tile-local lets paths, furniture, and trees
 * interleave correctly with terrain and neighboring structures.
 */
export interface EnvironmentArtPart {
  id: string;
  offset: ArtPoint;
  layer: EnvironmentArtLayer;
  anchor: ArtPoint;
  lod: ArtLodFrames;
  /** Optional winter replacement. Other seasons use the base LOD frames. */
  winterLod?: ArtLodFrames;
  /** Optional transparent night-light overlay, driven by runtime power. */
  emissiveLod?: ArtLodFrames;
  /** Existing TextureFactory key used when the authored frame is unavailable. */
  proceduralFallback: string;
  minimumQuality?: EnvironmentMinimumQuality;
}

export interface EnvironmentArtVariant {
  id: string;
  weight: number;
  parts: EnvironmentArtPart[];
}

export interface EnvironmentPlacementCandidate {
  id: string;
  /** Grid-space offset from the owning building's master cell. */
  offset: ArtPoint;
  /** Optional same-elevation Manhattan road search radius. */
  requiresRoadWithin?: number;
  /**
   * Exact road-facing edge for authored orientation. `north_east` requires a
   * road along gy - 1; `north_west` requires a road along gx - 1.
   */
  roadEdge?: 'north_east' | 'north_west';
  /** Optional orientation-safe subset of the definition's variants. */
  variantIds?: string[];
}

/**
 * Cosmetic, building-owned environment composition. It never enters Grid or
 * save data: the stable owner identity and map seed recreate it after load.
 */
export interface EnvironmentArtDef {
  id: string;
  ownerBuildingIds: string[];
  footprint: ArtFootprint;
  placements: EnvironmentPlacementCandidate[];
  variants: EnvironmentArtVariant[];
  /** `owner` gates emissive parts on owner power; `none` has no power gate. */
  powerSource?: 'owner' | 'none';
}

export type LoadingArtContext =
  | 'new_game'
  | 'city_load'
  | 'scenario_transition'
  | 'campaign_ending';

export interface LoadingArtDef {
  id: string;
  file: string;
  fallbackFile?: string;
  contexts: LoadingArtContext[];
  altText: string;
}

export type UiArtKind =
  | 'background'
  | 'emblem'
  | 'scenario_card'
  | 'texture'
  | 'icon_atlas';

export interface UiArtDef {
  id: string;
  file: string;
  fallbackFile?: string;
  kind: UiArtKind;
  altText?: string;
  nativeSize?: ArtPoint;
}

export interface ArtManifestV1 {
  schemaVersion: typeof ART_MANIFEST_SCHEMA_VERSION;
  metadata: ArtManifestMetadata;
  atlases: ArtAtlasDef[];
  buildings: BuildingArtDef[];
  terrain: TerrainArtDef[];
  /** Optional so earlier schema-v1 manifests remain loadable. */
  environment?: EnvironmentArtDef[];
  loading: LoadingArtDef[];
  ui: UiArtDef[];
}

export type ArtManifest = ArtManifestV1;

export interface ParsedArtFrameRef {
  atlasId: string;
  frameId: string;
}

export function parseArtFrameRef(reference: string): ParsedArtFrameRef | undefined {
  const separator = reference.indexOf(':');
  if (separator <= 0 || separator === reference.length - 1) return undefined;

  return {
    atlasId: reference.slice(0, separator),
    frameId: reference.slice(separator + 1),
  };
}
