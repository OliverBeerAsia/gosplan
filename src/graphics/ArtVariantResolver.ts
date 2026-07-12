import {
  ArtDistrictStyle,
  ArtEra,
  ArtLod,
  BuildingArtVariant,
} from './ArtManifest';

export interface VisualVariantBuilding {
  id: number | string;
  defId: string;
  gx: number;
  gy: number;
}

export interface VisualVariantContext {
  mapSeed: number;
  building: VisualVariantBuilding;
  districtStyle: ArtDistrictStyle | 'none';
  era: ArtEra;
}

export interface WeightedVisualVariant {
  id: string;
  weight: number;
}

/**
 * FNV-1a over immutable placement identity. District style is intentionally
 * excluded: zoning and service coverage can change after construction, but a
 * physical building mass must not morph in place. District remains available
 * to the eligibility filter below without perturbing the stable hash.
 */
export function stableVisualVariantHash(context: Omit<VisualVariantContext, 'era'>): number {
  const components = [
    String(context.mapSeed >>> 0),
    String(context.building.id),
    context.building.defId,
    String(context.building.gx),
    String(context.building.gy),
  ];

  let hash = 0x811c9dc5;
  for (const component of components) {
    hash = mixCodeUnit(hash, component.length & 0xffff);
    hash = mixCodeUnit(hash, component.length >>> 16);
    for (let index = 0; index < component.length; index++) {
      hash = mixCodeUnit(hash, component.charCodeAt(index));
    }
  }

  return hash >>> 0;
}

function mixCodeUnit(hash: number, codeUnit: number): number {
  hash ^= codeUnit & 0xff;
  hash = Math.imul(hash, 0x01000193);
  hash ^= codeUnit >>> 8;
  return Math.imul(hash, 0x01000193);
}

/** Selects a weighted variant after sorting by ID, so manifest reordering is inert. */
export function resolveWeightedVisualVariant<T extends WeightedVisualVariant>(
  variants: readonly T[],
  context: Omit<VisualVariantContext, 'era'>,
): T | undefined {
  const eligible = variants
    .filter((variant) => Number.isFinite(variant.weight) && variant.weight > 0)
    .slice()
    .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

  const totalWeight = eligible.reduce((sum, variant) => sum + variant.weight, 0);
  if (eligible.length === 0 || !Number.isFinite(totalWeight) || totalWeight <= 0) {
    return undefined;
  }

  // Convert the full uint32 range into [0, totalWeight) without random state.
  let cursor = (stableVisualVariantHash(context) / 0x100000000) * totalWeight;
  for (const variant of eligible) {
    cursor -= variant.weight;
    if (cursor < 0) return variant;
  }

  return eligible[eligible.length - 1];
}

export function resolveBuildingArtVariant(
  variants: readonly BuildingArtVariant[],
  context: VisualVariantContext,
): BuildingArtVariant | undefined {
  const eligible = variants.filter((variant) => {
    if (context.districtStyle === 'none') return false;
    if (!variant.allowedDistricts.includes(context.districtStyle)) return false;
    if (context.era < variant.minimumEra) return false;
    return variant.maximumEra === undefined || context.era <= variant.maximumEra;
  });

  return resolveWeightedVisualVariant(eligible, context);
}

const FAR_ENTER_ZOOM = 0.45;
const NEAR_ENTER_ZOOM = 0.9;
const LOD_HYSTERESIS = 0.05;

/**
 * Derive authored-art LOD without storing it in save data. Supplying the
 * current LOD adds a small dead band so wheel and trackpad jitter cannot make
 * an atlas flicker at a threshold.
 */
export function resolveArtLodForZoom(zoom: number, current?: ArtLod): ArtLod {
  const safeZoom = Number.isFinite(zoom) ? zoom : 1;

  if (!current) {
    if (safeZoom < FAR_ENTER_ZOOM) return 'far';
    if (safeZoom < NEAR_ENTER_ZOOM) return 'mid';
    return 'near';
  }

  if (current === 'far') {
    return safeZoom >= FAR_ENTER_ZOOM + LOD_HYSTERESIS ? 'mid' : 'far';
  }
  if (current === 'near') {
    return safeZoom < NEAR_ENTER_ZOOM - LOD_HYSTERESIS ? 'mid' : 'near';
  }

  if (safeZoom < FAR_ENTER_ZOOM - LOD_HYSTERESIS) return 'far';
  if (safeZoom >= NEAR_ENTER_ZOOM + LOD_HYSTERESIS) return 'near';
  return 'mid';
}
