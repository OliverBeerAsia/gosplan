import type { BuildingRegistry } from '../buildings/BuildingRegistry';
import type { PlacedBuilding } from '../buildings/BuildingTypes';
import type { GraphicsQuality } from '../core/GameState';
import type {
  ArtFootprint,
  EnvironmentArtDef,
  EnvironmentArtPart,
  EnvironmentArtVariant,
  EnvironmentPlacementCandidate,
} from '../graphics/ArtManifest';
import type { Grid } from '../grid/Grid';

export const ENVIRONMENT_COMPOSITION_CAPS: Readonly<Record<GraphicsQuality, number>> = {
  low: 0,
  medium: 12,
  high: 24,
};

export const ENVIRONMENT_MIN_ANCHOR_SPACING = 4;
export const ENVIRONMENT_SAME_FAMILY_MIN_ANCHOR_SPACING = 8;

export interface EnvironmentClaimedCell {
  gx: number;
  gy: number;
}

/**
 * Frame-bounded invalidations for interactive edits. Keeping this tiny queue
 * independent from rendering makes burst coalescing deterministic and easy to
 * regression-test without constructing Pixi objects.
 */
export class EnvironmentCompositionInvalidationQueue {
  private cells = new Map<string, EnvironmentClaimedCell>();

  invalidate(gx: number, gy: number): void {
    if (!Number.isInteger(gx) || !Number.isInteger(gy)) return;
    this.cells.set(`${gx},${gy}`, { gx, gy });
  }

  drain(): EnvironmentClaimedCell[] {
    const cells = [...this.cells.values()]
      .sort((left, right) => left.gx - right.gx || left.gy - right.gy);
    this.cells.clear();
    return cells;
  }

  flush(rebuild: (cells: readonly EnvironmentClaimedCell[]) => void): boolean {
    const cells = this.drain();
    if (cells.length === 0) return false;
    rebuild(cells);
    return true;
  }
}

export interface PlannedEnvironmentPart {
  partId: string;
  gx: number;
  gy: number;
  elevation: number;
  stableId: number;
  definition: EnvironmentArtDef;
  variant: EnvironmentArtVariant;
  part: EnvironmentArtPart;
}

export interface PlannedEnvironmentComposition {
  definitionId: string;
  variantId: string;
  placementId: string;
  ownerBuildingId: number;
  ownerDefId: string;
  gx: number;
  gy: number;
  elevation: number;
  footprint: ArtFootprint;
  claimedCells: EnvironmentClaimedCell[];
  parts: PlannedEnvironmentPart[];
}

export interface EnvironmentPlanOptions {
  grid: Grid;
  registry: BuildingRegistry;
  definitions: readonly EnvironmentArtDef[];
  mapSeed: number;
  quality: GraphicsQuality;
}

interface Ranked<T> {
  value: T;
  rank: number;
}

function mixCodeUnit(hash: number, codeUnit: number): number {
  hash ^= codeUnit & 0xff;
  hash = Math.imul(hash, 0x01000193);
  hash ^= codeUnit >>> 8;
  return Math.imul(hash, 0x01000193);
}

/** FNV-1a over immutable placement identity plus an explicit visual namespace. */
export function stableEnvironmentHash(
  mapSeed: number,
  owner: Pick<PlacedBuilding, 'id' | 'defId' | 'gx' | 'gy'>,
  namespace: string,
): number {
  const components = [
    String(Number.isFinite(mapSeed) ? mapSeed >>> 0 : 0),
    String(owner.id),
    owner.defId,
    String(owner.gx),
    String(owner.gy),
    namespace,
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

function compareStableIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function rankByIdentity<T extends { id: string }>(
  values: readonly T[],
  mapSeed: number,
  owner: PlacedBuilding,
  namespace: string,
): T[] {
  return values
    .map<Ranked<T>>((value) => ({
      value,
      rank: stableEnvironmentHash(mapSeed, owner, `${namespace}:${value.id}`),
    }))
    .sort((left, right) => left.rank - right.rank || compareStableIds(left.value.id, right.value.id))
    .map((entry) => entry.value);
}

function resolveWeightedVariant(
  variants: readonly EnvironmentArtVariant[],
  mapSeed: number,
  owner: PlacedBuilding,
  namespace: string,
): EnvironmentArtVariant | undefined {
  const eligible = variants
    .filter((variant) => Number.isFinite(variant.weight) && variant.weight > 0 && variant.parts.length > 0)
    .slice()
    .sort((left, right) => compareStableIds(left.id, right.id));
  const totalWeight = eligible.reduce((sum, variant) => sum + variant.weight, 0);
  if (eligible.length === 0 || !Number.isFinite(totalWeight) || totalWeight <= 0) return undefined;

  let cursor = (
    stableEnvironmentHash(mapSeed, owner, `environment-variant:${namespace}`)
    / 0x100000000
  ) * totalWeight;
  for (const variant of eligible) {
    cursor -= variant.weight;
    if (cursor < 0) return variant;
  }
  return eligible[eligible.length - 1];
}

function positiveInteger(value: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  const integer = Math.floor(value);
  return integer > 0 ? integer : undefined;
}

function integer(value: number): number | undefined {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return undefined;
  return value;
}

function footprintCells(
  grid: Grid,
  gx: number,
  gy: number,
  footprint: ArtFootprint,
  requiredElevation: number,
  claimed: ReadonlySet<string>,
  residentialApproaches: ReadonlySet<string>,
): EnvironmentClaimedCell[] | undefined {
  const width = positiveInteger(footprint[0]);
  const height = positiveInteger(footprint[1]);
  if (!width || !height) return undefined;

  const cells: EnvironmentClaimedCell[] = [];
  for (let dx = 0; dx < width; dx++) {
    for (let dy = 0; dy < height; dy++) {
      const cellGx = gx + dx;
      const cellGy = gy + dy;
      const cell = grid.getCell(cellGx, cellGy);
      if (!cell || !grid.isBuildable(cell.terrain) || cell.building) return undefined;
      if (cell.zone !== 'none') return undefined;
      if (grid.getElevation(cellGx, cellGy) !== requiredElevation) return undefined;
      if (claimed.has(`${cellGx},${cellGy}`)) return undefined;
      if (residentialApproaches.has(`${cellGx},${cellGy}`)) return undefined;
      cells.push({ gx: cellGx, gy: cellGy });
    }
  }
  return cells;
}

function collectResidentialApproaches(
  grid: Grid,
  registry: BuildingRegistry,
  buildings: readonly PlacedBuilding[],
): Set<string> {
  const approaches = new Set<string>();
  for (const building of buildings) {
    const definition = registry.get(building.defId);
    if (!definition || definition.category !== 'residential') continue;
    const width = positiveInteger(definition.width) ?? 1;
    const height = positiveInteger(definition.height) ?? 1;
    const approachGy = building.gy + height;
    for (let dx = 0; dx < width; dx++) {
      const approachGx = building.gx + dx;
      if (grid.inBounds(approachGx, approachGy)) {
        approaches.add(`${approachGx},${approachGy}`);
      }
    }
  }
  return approaches;
}

function hasSameElevationRoad(
  grid: Grid,
  registry: BuildingRegistry,
  cells: readonly EnvironmentClaimedCell[],
  elevation: number,
  radius: number,
): boolean {
  const safeRadius = positiveInteger(radius);
  if (!safeRadius) return true;

  for (const cell of cells) {
    for (let dx = -safeRadius; dx <= safeRadius; dx++) {
      for (let dy = -safeRadius; dy <= safeRadius; dy++) {
        if (Math.abs(dx) + Math.abs(dy) > safeRadius) continue;
        const gx = cell.gx + dx;
        const gy = cell.gy + dy;
        if (!grid.inBounds(gx, gy) || grid.getElevation(gx, gy) !== elevation) continue;
        const building = grid.getMasterBuilding(gx, gy);
        if (!building) continue;
        if (registry.get(building.defId)?.isRoad) return true;
      }
    }
  }
  return false;
}

function isSameElevationRoadAt(
  grid: Grid,
  registry: BuildingRegistry,
  gx: number,
  gy: number,
  elevation: number,
): boolean {
  if (!grid.inBounds(gx, gy) || grid.getElevation(gx, gy) !== elevation) return false;
  const building = grid.getMasterBuilding(gx, gy);
  return Boolean(building && registry.get(building.defId)?.isRoad);
}

function hasRoadAlongDeclaredEdge(
  grid: Grid,
  registry: BuildingRegistry,
  gx: number,
  gy: number,
  footprint: ArtFootprint,
  elevation: number,
  edge: NonNullable<EnvironmentPlacementCandidate['roadEdge']>,
): boolean {
  const width = positiveInteger(footprint[0]);
  const height = positiveInteger(footprint[1]);
  if (!width || !height) return false;

  if (edge === 'north_east') {
    for (let dx = 0; dx < width; dx++) {
      if (!isSameElevationRoadAt(grid, registry, gx + dx, gy - 1, elevation)) return false;
    }
    return true;
  }

  for (let dy = 0; dy < height; dy++) {
    if (!isSameElevationRoadAt(grid, registry, gx - 1, gy + dy, elevation)) return false;
  }
  return true;
}

function meetsCompositionSpacing(
  gx: number,
  gy: number,
  definitionId: string,
  accepted: readonly PlannedEnvironmentComposition[],
): boolean {
  for (const composition of accepted) {
    const distance = Math.abs(gx - composition.gx) + Math.abs(gy - composition.gy);
    if (distance < ENVIRONMENT_MIN_ANCHOR_SPACING) return false;
    if (
      composition.definitionId === definitionId
      && distance < ENVIRONMENT_SAME_FAMILY_MIN_ANCHOR_SPACING
    ) return false;
  }
  return true;
}

function buildParts(
  definition: EnvironmentArtDef,
  variant: EnvironmentArtVariant,
  owner: PlacedBuilding,
  gx: number,
  gy: number,
  elevation: number,
  mapSeed: number,
): PlannedEnvironmentPart[] {
  const width = positiveInteger(definition.footprint[0]);
  const height = positiveInteger(definition.footprint[1]);
  if (!width || !height) return [];

  return variant.parts.flatMap((part) => {
    const dx = integer(part.offset[0]);
    const dy = integer(part.offset[1]);
    if (dx === undefined || dy === undefined || dx < 0 || dy < 0 || dx >= width || dy >= height) {
      return [];
    }
    return [{
      partId: part.id,
      gx: gx + dx,
      gy: gy + dy,
      elevation,
      stableId: stableEnvironmentHash(
        mapSeed,
        owner,
        `environment-part:${definition.id}:${variant.id}:${part.id}`,
      ),
      definition,
      variant,
      part,
    }];
  });
}

function buildComposition(
  options: EnvironmentPlanOptions,
  owner: PlacedBuilding,
  definition: EnvironmentArtDef,
  placement: EnvironmentPlacementCandidate,
  variant: EnvironmentArtVariant,
  claimed: ReadonlySet<string>,
  accepted: readonly PlannedEnvironmentComposition[],
  residentialApproaches: ReadonlySet<string>,
): PlannedEnvironmentComposition | undefined {
  const offsetGx = integer(placement.offset[0]);
  const offsetGy = integer(placement.offset[1]);
  if (offsetGx === undefined || offsetGy === undefined) return undefined;

  const gx = owner.gx + offsetGx;
  const gy = owner.gy + offsetGy;
  if (!meetsCompositionSpacing(gx, gy, definition.id, accepted)) return undefined;
  const elevation = options.grid.getElevation(owner.gx, owner.gy);
  const cells = footprintCells(
    options.grid,
    gx,
    gy,
    definition.footprint,
    elevation,
    claimed,
    residentialApproaches,
  );
  if (!cells) return undefined;
  if (placement.roadEdge) {
    if (!hasRoadAlongDeclaredEdge(
      options.grid,
      options.registry,
      gx,
      gy,
      definition.footprint,
      elevation,
      placement.roadEdge,
    )) return undefined;
  } else if (placement.requiresRoadWithin !== undefined && !hasSameElevationRoad(
    options.grid,
    options.registry,
    cells,
    elevation,
    placement.requiresRoadWithin,
  )) return undefined;

  const parts = buildParts(definition, variant, owner, gx, gy, elevation, options.mapSeed);
  if (parts.length === 0) return undefined;
  return {
    definitionId: definition.id,
    variantId: variant.id,
    placementId: placement.id,
    ownerBuildingId: owner.id,
    ownerDefId: owner.defId,
    gx,
    gy,
    elevation,
    footprint: definition.footprint,
    claimedCells: cells,
    parts,
  };
}

/**
 * Recreate cosmetic environment placements from immutable owner identity.
 * The planner is pure with respect to Grid and never consumes simulation RNG.
 */
export function planEnvironmentCompositions(
  options: EnvironmentPlanOptions,
): PlannedEnvironmentComposition[] {
  const cap = ENVIRONMENT_COMPOSITION_CAPS[options.quality];
  if (cap <= 0 || options.definitions.length === 0) return [];

  const definitions = options.definitions
    .filter((definition) => definition.ownerBuildingIds.length > 0)
    .slice()
    .sort((left, right) => compareStableIds(left.id, right.id));
  const owners = options.grid.getAllBuildings()
    .slice()
    .sort((left, right) => left.id - right.id || left.gx - right.gx || left.gy - right.gy);
  const claimed = new Set<string>();
  const result: PlannedEnvironmentComposition[] = [];
  const residentialApproaches = collectResidentialApproaches(
    options.grid,
    options.registry,
    owners,
  );

  for (const owner of owners) {
    if (result.length >= cap) break;
    const eligibleDefinitions = definitions.filter((definition) => (
      definition.ownerBuildingIds.includes(owner.defId)
    ));
    const rankedDefinitions = rankByIdentity(
      eligibleDefinitions,
      options.mapSeed,
      owner,
      'environment-definition',
    );

    let accepted: PlannedEnvironmentComposition | undefined;
    for (const definition of rankedDefinitions) {
      const placements = rankByIdentity(
        definition.placements,
        options.mapSeed,
        owner,
        `environment-placement:${definition.id}`,
      );
      for (const placement of placements) {
        const allowedVariants = placement.variantIds
          ? definition.variants.filter((variant) => placement.variantIds!.includes(variant.id))
          : definition.variants;
        const variant = resolveWeightedVariant(
          allowedVariants,
          options.mapSeed,
          owner,
          `${definition.id}:${placement.id}`,
        );
        if (!variant) continue;
        accepted = buildComposition(
          options,
          owner,
          definition,
          placement,
          variant,
          claimed,
          result,
          residentialApproaches,
        );
        if (accepted) break;
      }
      if (accepted) break;
    }

    if (!accepted) continue;
    for (const cell of accepted.claimedCells) claimed.add(`${cell.gx},${cell.gy}`);
    result.push(accepted);
  }

  return result;
}
