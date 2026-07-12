#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_VERSION = 1;
const DISTRICTS = new Set(['worker_housing', 'heavy_industry', 'scientific_city', 'historic_core']);
const ERAS = new Set([1, 2, 3, 4]);
const SEASONS = new Set(['spring', 'summer', 'autumn', 'winter']);
const ELEVATION_EDGES = new Set(['north_east', 'south_east', 'south_west', 'north_west']);
const TERRAIN_MATERIALS = new Set(['ground', 'water', 'forest', 'hill', 'dirt', 'road', 'power_line']);
const LOADING_CONTEXTS = new Set(['new_game', 'city_load', 'scenario_transition', 'campaign_ending']);
const UI_KINDS = new Set(['background', 'emblem', 'scenario_card', 'texture', 'icon_atlas']);
const LODS = ['far', 'mid', 'near'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function readJson(filePath, errors, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${label} is not valid JSON: ${String(error)}`);
    return undefined;
  }
}

function publicAssetPath(publicDir, relativePath, errors, label) {
  if (!isNonEmptyString(relativePath)) {
    errors.push(`${label} must be a non-empty public-root-relative path`);
    return undefined;
  }
  if (path.isAbsolute(relativePath)) {
    errors.push(`${label} must not be absolute: ${relativePath}`);
    return undefined;
  }

  const resolved = path.resolve(publicDir, relativePath);
  const relative = path.relative(publicDir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    errors.push(`${label} escapes the public directory: ${relativePath}`);
    return undefined;
  }
  return resolved;
}

function readImageDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.png' && buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (extension === '.svg') {
    const source = buffer.toString('utf8', 0, Math.min(buffer.length, 8192));
    const svgTag = source.match(/<svg\b[^>]*>/i)?.[0];
    if (!svgTag) return undefined;
    const width = Number(svgTag.match(/\bwidth=["']([0-9.]+)(?:px)?["']/i)?.[1]);
    const height = Number(svgTag.match(/\bheight=["']([0-9.]+)(?:px)?["']/i)?.[1]);
    if (width > 0 && height > 0) return { width, height };
    const viewBox = svgTag.match(/\bviewBox=["']([^"']+)["']/i)?.[1]
      ?.trim().split(/[ ,]+/).map(Number);
    if (viewBox?.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
      return { width: viewBox[2], height: viewBox[3] };
    }
  }

  return undefined;
}

function parseBuildingRegistry(filePath, errors) {
  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    errors.push(`cannot read BuildingRegistry source: ${String(error)}`);
    return new Map();
  }

  const start = source.indexOf('const buildings');
  const end = source.indexOf('export class BuildingRegistry');
  if (start < 0 || end < 0 || end <= start) {
    errors.push('could not locate the buildings array in BuildingRegistry source');
    return new Map();
  }

  const definitions = new Map();
  const definitionSource = source.slice(start, end);
  const pattern = /\bid:\s*'([^']+)'[\s\S]*?\bwidth:\s*(\d+)\s*,\s*height:\s*(\d+)/g;
  for (const match of definitionSource.matchAll(pattern)) {
    const [, id, width, height] = match;
    if (definitions.has(id)) errors.push(`BuildingRegistry contains duplicate building ID "${id}"`);
    definitions.set(id, { width: Number(width), height: Number(height) });
  }

  if (definitions.size === 0) errors.push('no building definitions were parsed from BuildingRegistry');
  return definitions;
}

function parseProceduralFallbacks(filePath, errors) {
  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    errors.push(`cannot read BuildingTextures source: ${String(error)}`);
    return new Set();
  }

  const fallbacks = new Set();
  for (const match of source.matchAll(/textures\.set\(\s*['"]([^'"]+)['"]/g)) {
    fallbacks.add(match[1]);
  }
  return fallbacks;
}

function parseRuntimeLoadingAssets(filePath, errors) {
  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    errors.push(`cannot read LoadingInterstitial source: ${String(error)}`);
    return new Set();
  }

  const assets = new Set();
  for (const match of source.matchAll(/fallbackFile:\s*['"]([^'"]+)['"]/g)) {
    assets.add(match[1]);
  }
  if (assets.size === 0) errors.push('no runtime loading assets were parsed from LoadingInterstitial');
  return assets;
}

function validateTuple(value, label, errors, { integer = false, positive = false } = {}) {
  if (!Array.isArray(value) || value.length !== 2) {
    errors.push(`${label} must contain exactly two numbers`);
    return undefined;
  }
  if (!value.every((part) => typeof part === 'number' && Number.isFinite(part))) {
    errors.push(`${label} must contain finite numbers`);
    return undefined;
  }
  if (integer && !value.every(Number.isInteger)) {
    errors.push(`${label} must contain integers`);
    return undefined;
  }
  if (positive && !value.every((part) => part > 0)) {
    errors.push(`${label} must contain positive values`);
    return undefined;
  }
  return value;
}

function validateUniqueId(item, collection, seen, errors) {
  if (!isRecord(item) || !isNonEmptyString(item.id)) {
    errors.push(`${collection} entry must have a non-empty id`);
    return undefined;
  }
  if (seen.has(item.id)) errors.push(`duplicate ${collection} ID "${item.id}"`);
  seen.add(item.id);
  return item.id;
}

function validateFrameRect(frame, atlasId, frameId, dimensions, errors) {
  if (!isRecord(frame)) {
    errors.push(`atlas "${atlasId}" frame "${frameId}" is not an object`);
    return undefined;
  }
  for (const property of ['x', 'y', 'w', 'h']) {
    if (typeof frame[property] !== 'number' || !Number.isFinite(frame[property])) {
      errors.push(`atlas "${atlasId}" frame "${frameId}" has invalid ${property}`);
      return undefined;
    }
  }
  if (frame.x < 0 || frame.y < 0 || frame.w <= 0 || frame.h <= 0) {
    errors.push(`atlas "${atlasId}" frame "${frameId}" has invalid bounds`);
    return undefined;
  }
  if (dimensions && (frame.x + frame.w > dimensions.width || frame.y + frame.h > dimensions.height)) {
    errors.push(`atlas "${atlasId}" frame "${frameId}" lies outside ${dimensions.width}x${dimensions.height} image bounds`);
  }
  return { x: frame.x, y: frame.y, w: frame.w, h: frame.h };
}

function buildAtlasIndex(atlases, publicDir, errors) {
  const index = new Map();
  const seen = new Set();

  for (const atlas of atlases) {
    const id = validateUniqueId(atlas, 'atlas', seen, errors);
    if (!id || !isRecord(atlas)) continue;

    const imagePath = publicAssetPath(publicDir, atlas.image, errors, `atlas "${id}" image`);
    const framesPath = publicAssetPath(publicDir, atlas.framesFile, errors, `atlas "${id}" framesFile`);
    let dimensions;
    if (imagePath && !fs.existsSync(imagePath)) {
      errors.push(`atlas "${id}" image file does not exist: ${atlas.image}`);
    } else if (imagePath) {
      dimensions = readImageDimensions(imagePath);
      if (!dimensions) errors.push(`atlas "${id}" image dimensions could not be read: ${atlas.image}`);
    }

    let frameManifest;
    if (framesPath && !fs.existsSync(framesPath)) {
      errors.push(`atlas "${id}" frames file does not exist: ${atlas.framesFile}`);
    } else if (framesPath) {
      frameManifest = readJson(framesPath, errors, `atlas "${id}" frames file`);
    }

    if (atlas.pixelRatio !== undefined && atlas.pixelRatio !== 1 && atlas.pixelRatio !== 2) {
      errors.push(`atlas "${id}" pixelRatio must be 1 or 2`);
    }

    const frames = new Map();
    if (!isRecord(frameManifest?.frames)) {
      if (frameManifest !== undefined) errors.push(`atlas "${id}" frames file must contain a frames object`);
    } else {
      for (const [frameId, frame] of Object.entries(frameManifest.frames)) {
        const normalized = validateFrameRect(frame, id, frameId, dimensions, errors);
        if (normalized) frames.set(frameId, normalized);
      }
    }
    index.set(id, { frames });
  }

  return index;
}

function resolveFrame(reference, atlasIndex, errors, label) {
  if (!isNonEmptyString(reference)) {
    errors.push(`${label} must be a frame reference`);
    return undefined;
  }
  const separator = reference.indexOf(':');
  if (separator <= 0 || separator === reference.length - 1) {
    errors.push(`${label} has invalid frame reference "${reference}"`);
    return undefined;
  }
  const atlasId = reference.slice(0, separator);
  const frameId = reference.slice(separator + 1);
  const atlas = atlasIndex.get(atlasId);
  if (!atlas) {
    errors.push(`${label} references unknown atlas "${atlasId}"`);
    return undefined;
  }
  const frame = atlas.frames.get(frameId);
  if (!frame) errors.push(`${label} references missing frame "${reference}"`);
  return frame;
}

function validatePointBounds(point, label, frame, errors) {
  const tuple = validateTuple(point, label, errors);
  if (!tuple || !frame) return;
  if (tuple[0] < 0 || tuple[0] > frame.w || tuple[1] < 0 || tuple[1] > frame.h) {
    errors.push(`${label} [${tuple.join(', ')}] lies outside logical sprite bounds ${frame.w}x${frame.h}`);
  }
}

function validateCompatibleFrame(reference, atlasIndex, baseFrame, label, errors) {
  const frame = resolveFrame(reference, atlasIndex, errors, label);
  if (frame && baseFrame && (frame.w !== baseFrame.w || frame.h !== baseFrame.h)) {
    errors.push(`${label} dimensions ${frame.w}x${frame.h} do not match near frame ${baseFrame.w}x${baseFrame.h}`);
  }
}

function validateFrameRecord(record, atlasIndex, errors, label, allowedKeys) {
  if (record === undefined) return;
  if (!isRecord(record)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const [key, reference] of Object.entries(record)) {
    if (allowedKeys && !allowedKeys.has(key)) errors.push(`${label} contains unknown key "${key}"`);
    resolveFrame(reference, atlasIndex, errors, `${label}.${key}`);
  }
}

function validateMaskRecord(record, atlasIndex, errors, label) {
  if (record === undefined) return;
  if (!isRecord(record)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const [key, reference] of Object.entries(record)) {
    if (key !== 'default' && (!/^\d+$/.test(key) || Number(key) < 0 || Number(key) > 15)) {
      errors.push(`${label} contains invalid four-neighbor mask "${key}"`);
    }
    resolveFrame(reference, atlasIndex, errors, `${label}.${key}`);
  }
}

function validateLod(lod, atlasIndex, errors, label) {
  if (!isRecord(lod)) {
    errors.push(`${label} must define far, mid, and near frames`);
    return {};
  }
  const frames = {};
  for (const level of LODS) {
    frames[level] = resolveFrame(lod[level], atlasIndex, errors, `${label}.${level}`);
  }
  return frames;
}

function validateBuildings(buildings, atlasIndex, registry, fallbacks, errors) {
  const seenIds = new Set();
  const seenOwners = new Set();

  for (const building of buildings) {
    const id = validateUniqueId(building, 'building art', seenIds, errors);
    if (!id || !isRecord(building)) continue;

    if (!isNonEmptyString(building.buildingId)) {
      errors.push(`building art "${id}" must have a buildingId`);
      continue;
    }
    if (seenOwners.has(building.buildingId)) {
      errors.push(`duplicate building art owner "${building.buildingId}"`);
    }
    seenOwners.add(building.buildingId);

    const registryDef = registry.get(building.buildingId);
    if (!registryDef) errors.push(`building art "${id}" references unknown BuildingRegistry ID "${building.buildingId}"`);

    const footprint = validateTuple(building.footprint, `building art "${id}" footprint`, errors, { integer: true, positive: true });
    if (registryDef && footprint && (footprint[0] !== registryDef.width || footprint[1] !== registryDef.height)) {
      errors.push(`building art "${id}" footprint ${footprint.join('x')} disagrees with BuildingRegistry ${registryDef.width}x${registryDef.height}`);
    }

    if (!isNonEmptyString(building.proceduralFallback)) {
      errors.push(`building art "${id}" must declare a proceduralFallback`);
    } else if (!fallbacks.has(building.proceduralFallback)) {
      errors.push(`building art "${id}" proceduralFallback "${building.proceduralFallback}" is not generated by BuildingTextures`);
    }

    const lod = validateLod(building.lod, atlasIndex, errors, `building art "${id}" lod`);
    resolveFrame(building.iconFrame, atlasIndex, errors, `building art "${id}" iconFrame`);
    validatePointBounds(building.anchor, `building art "${id}" anchor`, lod.near, errors);

    if (!Array.isArray(building.variants) || building.variants.length === 0) {
      errors.push(`building art "${id}" must define at least one variant`);
    } else {
      const variantIds = new Set();
      for (const variant of building.variants) {
        if (!isRecord(variant) || !isNonEmptyString(variant.id)) {
          errors.push(`building art "${id}" variant must have an id`);
          continue;
        }
        if (variantIds.has(variant.id)) errors.push(`building art "${id}" has duplicate variant ID "${variant.id}"`);
        variantIds.add(variant.id);
        const variantFrame = resolveFrame(
          variant.frame,
          atlasIndex,
          errors,
          `building art "${id}" variant "${variant.id}" frame`,
        );
        let variantNearFrame = variantFrame;
        if (variant.lod !== undefined) {
          const variantLod = validateLod(
            variant.lod,
            atlasIndex,
            errors,
            `building art "${id}" variant "${variant.id}" lod`,
          );
          variantNearFrame = variantLod.near ?? variantFrame;
        }
        if (!Array.isArray(variant.allowedDistricts) || variant.allowedDistricts.length === 0) {
          errors.push(`building art "${id}" variant "${variant.id}" must allow at least one district`);
        } else {
          const districts = new Set();
          for (const district of variant.allowedDistricts) {
            if (!DISTRICTS.has(district)) errors.push(`building art "${id}" variant "${variant.id}" has unknown district "${district}"`);
            if (districts.has(district)) errors.push(`building art "${id}" variant "${variant.id}" repeats district "${district}"`);
            districts.add(district);
          }
        }
        if (!ERAS.has(variant.minimumEra)) errors.push(`building art "${id}" variant "${variant.id}" has unknown minimumEra "${variant.minimumEra}"`);
        if (variant.maximumEra !== undefined && !ERAS.has(variant.maximumEra)) {
          errors.push(`building art "${id}" variant "${variant.id}" has unknown maximumEra "${variant.maximumEra}"`);
        }
        if (ERAS.has(variant.minimumEra) && ERAS.has(variant.maximumEra) && variant.maximumEra < variant.minimumEra) {
          errors.push(`building art "${id}" variant "${variant.id}" maximumEra precedes minimumEra`);
        }
        if (typeof variant.weight !== 'number' || !Number.isFinite(variant.weight) || variant.weight <= 0) {
          errors.push(`building art "${id}" variant "${variant.id}" weight must be positive`);
        }
        for (const field of ['entrances', 'queueAnchors', 'windowAnchors']) {
          if (variant[field] === undefined) continue;
          if (!Array.isArray(variant[field])) {
            errors.push(`building art "${id}" variant "${variant.id}" ${field} must be an array`);
          } else {
            variant[field].forEach((point, index) => validatePointBounds(
              point,
              `building art "${id}" variant "${variant.id}" ${field}[${index}]`,
              variantNearFrame,
              errors,
            ));
          }
        }
      }
    }

    if (building.constructionFrames !== undefined) {
      if (!Array.isArray(building.constructionFrames)) {
        errors.push(`building art "${id}" constructionFrames must be an array`);
      } else {
        building.constructionFrames.forEach((reference, index) => {
          validateCompatibleFrame(reference, atlasIndex, lod.near, `building art "${id}" constructionFrames[${index}]`, errors);
        });
      }
    }
    if (building.winterOverlay !== undefined) {
      validateCompatibleFrame(building.winterOverlay, atlasIndex, lod.near, `building art "${id}" winterOverlay`, errors);
    }
    if (building.conditionOverlays !== undefined) {
      if (!isRecord(building.conditionOverlays)) {
        errors.push(`building art "${id}" conditionOverlays must be an object`);
      } else {
        for (const [condition, reference] of Object.entries(building.conditionOverlays)) {
          validateCompatibleFrame(reference, atlasIndex, lod.near, `building art "${id}" conditionOverlays.${condition}`, errors);
        }
      }
    }

    for (const field of ['entrances', 'queueAnchors', 'windowAnchors']) {
      if (building[field] === undefined) continue;
      if (!Array.isArray(building[field])) {
        errors.push(`building art "${id}" ${field} must be an array`);
      } else {
        building[field].forEach((point, index) => validatePointBounds(point, `building art "${id}" ${field}[${index}]`, lod.near, errors));
      }
    }
    if (building.emitters !== undefined) {
      if (!Array.isArray(building.emitters)) {
        errors.push(`building art "${id}" emitters must be an array`);
      } else {
        building.emitters.forEach((emitter, index) => {
          if (!isRecord(emitter) || !['smoke', 'steam', 'spark'].includes(emitter.kind)) {
            errors.push(`building art "${id}" emitter[${index}] has unknown kind`);
          } else {
            validatePointBounds(emitter.position, `building art "${id}" emitter[${index}] position`, lod.near, errors);
          }
        });
      }
    }
  }
}

function validateTerrain(terrain, atlasIndex, errors) {
  const seen = new Set();
  for (const definition of terrain) {
    const id = validateUniqueId(definition, 'terrain art', seen, errors);
    if (!id || !isRecord(definition)) continue;
    if (!TERRAIN_MATERIALS.has(definition.material)) errors.push(`terrain art "${id}" has unknown material "${definition.material}"`);
    validateLod(definition.lod, atlasIndex, errors, `terrain art "${id}" lod`);
    validateFrameRecord(definition.seasonFrames, atlasIndex, errors, `terrain art "${id}" seasonFrames`, SEASONS);
    validateFrameRecord(definition.elevationEdges, atlasIndex, errors, `terrain art "${id}" elevationEdges`, ELEVATION_EDGES);
    validateMaskRecord(definition.shorelineFrames, atlasIndex, errors, `terrain art "${id}" shorelineFrames`);
    validateMaskRecord(definition.transitionMasks, atlasIndex, errors, `terrain art "${id}" transitionMasks`);
    validateMaskRecord(definition.roadMasks, atlasIndex, errors, `terrain art "${id}" roadMasks`);
  }
}

function validateEnvironment(environment, atlasIndex, registry, errors) {
  if (environment === undefined) return;
  if (!Array.isArray(environment)) {
    errors.push('environment must be an array when present');
    return;
  }

  const seen = new Set();
  for (const definition of environment) {
    const id = validateUniqueId(definition, 'environment art', seen, errors);
    if (!id || !isRecord(definition)) continue;
    const footprint = validateTuple(
      definition.footprint,
      `environment art "${id}" footprint`,
      errors,
      { integer: true, positive: true },
    );

    if (!Array.isArray(definition.ownerBuildingIds) || definition.ownerBuildingIds.length === 0) {
      errors.push(`environment art "${id}" must declare ownerBuildingIds`);
    } else {
      const owners = new Set();
      for (const owner of definition.ownerBuildingIds) {
        if (!isNonEmptyString(owner) || !registry.has(owner)) {
          errors.push(`environment art "${id}" has unknown owner "${String(owner)}"`);
        }
        if (owners.has(owner)) errors.push(`environment art "${id}" repeats owner "${owner}"`);
        owners.add(owner);
      }
    }

    const variantIds = new Set();
    if (!Array.isArray(definition.variants) || definition.variants.length === 0) {
      errors.push(`environment art "${id}" must define variants`);
    } else {
      for (const variant of definition.variants) {
        if (!isRecord(variant) || !isNonEmptyString(variant.id)) {
          errors.push(`environment art "${id}" variant must have an id`);
          continue;
        }
        if (variantIds.has(variant.id)) errors.push(`environment art "${id}" repeats variant "${variant.id}"`);
        variantIds.add(variant.id);
        if (typeof variant.weight !== 'number' || !Number.isFinite(variant.weight) || variant.weight <= 0) {
          errors.push(`environment art "${id}" variant "${variant.id}" weight must be positive`);
        }
        if (!Array.isArray(variant.parts) || variant.parts.length === 0) {
          errors.push(`environment art "${id}" variant "${variant.id}" must define parts`);
          continue;
        }
        const partIds = new Set();
        for (const part of variant.parts) {
          if (!isRecord(part) || !isNonEmptyString(part.id)) {
            errors.push(`environment art "${id}" variant "${variant.id}" part must have an id`);
            continue;
          }
          if (partIds.has(part.id)) errors.push(`environment art "${id}" variant "${variant.id}" repeats part "${part.id}"`);
          partIds.add(part.id);
          const offset = validateTuple(
            part.offset,
            `environment art "${id}" variant "${variant.id}" part "${part.id}" offset`,
            errors,
            { integer: true },
          );
          if (footprint && offset && (
            offset[0] < 0 || offset[1] < 0
            || offset[0] >= footprint[0] || offset[1] >= footprint[1]
          )) {
            errors.push(`environment art "${id}" variant "${variant.id}" part "${part.id}" lies outside footprint`);
          }
          if (!['ground_decal', 'prop'].includes(part.layer)) {
            errors.push(`environment art "${id}" variant "${variant.id}" part "${part.id}" has invalid layer`);
          }
          const lod = validateLod(
            part.lod,
            atlasIndex,
            errors,
            `environment art "${id}" variant "${variant.id}" part "${part.id}" lod`,
          );
          validatePointBounds(
            part.anchor,
            `environment art "${id}" variant "${variant.id}" part "${part.id}" anchor`,
            lod.near,
            errors,
          );
          if (part.winterLod !== undefined) {
            validateLod(part.winterLod, atlasIndex, errors, `environment art "${id}" variant "${variant.id}" part "${part.id}" winterLod`);
          }
          if (part.emissiveLod !== undefined) {
            validateLod(part.emissiveLod, atlasIndex, errors, `environment art "${id}" variant "${variant.id}" part "${part.id}" emissiveLod`);
          }
          if (!isNonEmptyString(part.proceduralFallback)) {
            errors.push(`environment art "${id}" variant "${variant.id}" part "${part.id}" needs proceduralFallback`);
          }
          if (part.minimumQuality !== undefined && !['medium', 'high'].includes(part.minimumQuality)) {
            errors.push(`environment art "${id}" variant "${variant.id}" part "${part.id}" has invalid minimumQuality`);
          }
        }
      }
    }

    if (!Array.isArray(definition.placements) || definition.placements.length === 0) {
      errors.push(`environment art "${id}" must define placements`);
    } else {
      const placementIds = new Set();
      for (const placement of definition.placements) {
        if (!isRecord(placement) || !isNonEmptyString(placement.id)) {
          errors.push(`environment art "${id}" placement must have an id`);
          continue;
        }
        if (placementIds.has(placement.id)) errors.push(`environment art "${id}" repeats placement "${placement.id}"`);
        placementIds.add(placement.id);
        validateTuple(placement.offset, `environment art "${id}" placement "${placement.id}" offset`, errors, { integer: true });
        if (placement.roadEdge !== undefined && !['north_east', 'north_west'].includes(placement.roadEdge)) {
          errors.push(`environment art "${id}" placement "${placement.id}" has invalid roadEdge`);
        }
        if (placement.variantIds !== undefined) {
          if (!Array.isArray(placement.variantIds) || placement.variantIds.length === 0) {
            errors.push(`environment art "${id}" placement "${placement.id}" variantIds must be non-empty`);
          } else {
            for (const variantId of placement.variantIds) {
              if (!variantIds.has(variantId)) errors.push(`environment art "${id}" placement "${placement.id}" references unknown variant "${variantId}"`);
            }
          }
        }
      }
    }

    if (definition.powerSource !== undefined && !['owner', 'none'].includes(definition.powerSource)) {
      errors.push(`environment art "${id}" has invalid powerSource`);
    }
  }
}

function validateFiles(definitions, publicDir, errors, collection, extraValidation) {
  const seen = new Set();
  for (const definition of definitions) {
    const id = validateUniqueId(definition, collection, seen, errors);
    if (!id || !isRecord(definition)) continue;
    for (const field of ['file', 'fallbackFile']) {
      if (field === 'fallbackFile' && definition[field] === undefined) continue;
      const filePath = publicAssetPath(publicDir, definition[field], errors, `${collection} "${id}" ${field}`);
      if (filePath && !fs.existsSync(filePath)) errors.push(`${collection} "${id}" ${field} does not exist: ${definition[field]}`);
    }
    extraValidation(definition, id);
  }
}

function validateArtManifest(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const publicDir = path.resolve(options.publicDir ?? path.join(rootDir, 'public'));
  const errors = [];
  const manifest = options.manifest;

  if (!isRecord(manifest)) return ['manifest root must be an object'];
  if (manifest.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  if (!isRecord(manifest.metadata) || !isNonEmptyString(manifest.metadata.title)) {
    errors.push('metadata.title must be a non-empty string');
  }

  const collectionNames = ['atlases', 'buildings', 'terrain', 'loading', 'ui'];
  for (const collection of collectionNames) {
    if (!Array.isArray(manifest[collection])) errors.push(`${collection} must be an array`);
  }
  if (errors.some((error) => error.endsWith('must be an array'))) return errors;

  const atlasIndex = buildAtlasIndex(manifest.atlases, publicDir, errors);
  const registry = parseBuildingRegistry(
    options.buildingRegistryPath ?? path.join(rootDir, 'src/buildings/BuildingRegistry.ts'),
    errors,
  );
  const fallbacks = parseProceduralFallbacks(
    options.buildingTexturesPath ?? path.join(rootDir, 'src/graphics/BuildingTextures.ts'),
    errors,
  );
  for (const buildingId of registry.keys()) {
    if (!fallbacks.has(buildingId)) {
      errors.push(`BuildingRegistry building "${buildingId}" has no procedural fallback in BuildingTextures`);
    }
  }
  validateBuildings(manifest.buildings, atlasIndex, registry, fallbacks, errors);
  validateTerrain(manifest.terrain, atlasIndex, errors);
  validateEnvironment(manifest.environment, atlasIndex, registry, errors);

  validateFiles(manifest.loading, publicDir, errors, 'loading art', (definition, id) => {
    if (!Array.isArray(definition.contexts) || definition.contexts.length === 0) {
      errors.push(`loading art "${id}" must define at least one context`);
    } else {
      const contexts = new Set();
      for (const context of definition.contexts) {
        if (!LOADING_CONTEXTS.has(context)) errors.push(`loading art "${id}" has unknown context "${context}"`);
        if (contexts.has(context)) errors.push(`loading art "${id}" repeats context "${context}"`);
        contexts.add(context);
      }
    }
    if (!isNonEmptyString(definition.altText)) errors.push(`loading art "${id}" must include altText`);
  });

  if (options.runtimeLoadingAssets instanceof Set) {
    const manifestLoadingAssets = new Set(manifest.loading.map((definition) => definition.file));
    for (const runtimeAsset of options.runtimeLoadingAssets) {
      if (!manifestLoadingAssets.has(runtimeAsset)) {
        errors.push(`runtime loading asset is missing from the art manifest: ${runtimeAsset}`);
      }
    }
    for (const manifestAsset of manifestLoadingAssets) {
      if (!options.runtimeLoadingAssets.has(manifestAsset)) {
        errors.push(`art manifest loading asset is not referenced by the runtime: ${manifestAsset}`);
      }
    }
  }

  validateFiles(manifest.ui, publicDir, errors, 'UI art', (definition, id) => {
    if (!UI_KINDS.has(definition.kind)) errors.push(`UI art "${id}" has unknown kind "${definition.kind}"`);
    if (definition.nativeSize !== undefined) {
      validateTuple(definition.nativeSize, `UI art "${id}" nativeSize`, errors, { integer: true, positive: true });
    }
  });

  const resolverPath = options.variantResolverPath ?? path.join(rootDir, 'src/graphics/ArtVariantResolver.ts');
  try {
    const resolverSource = fs.readFileSync(resolverPath, 'utf8');
    if (/Math\.random\s*\(/.test(resolverSource)) errors.push('ArtVariantResolver must not call Math.random');
    if (/\b(?:Rng|rngState|simulationRng)\b/.test(resolverSource)) errors.push('ArtVariantResolver must not consume simulation RNG state');
  } catch (error) {
    errors.push(`cannot read ArtVariantResolver source: ${String(error)}`);
  }

  return errors;
}

function validateManifestFile(manifestPath, options = {}) {
  const errors = [];
  if (!fs.existsSync(manifestPath)) return [`manifest file does not exist: ${manifestPath}`];
  const manifest = readJson(manifestPath, errors, 'art manifest');
  if (manifest === undefined) return errors;
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const runtimeLoadingAssets = parseRuntimeLoadingAssets(
    options.loadingInterstitialPath ?? path.join(rootDir, 'src/ui/LoadingInterstitial.ts'),
    errors,
  );
  return errors.concat(validateArtManifest({ ...options, manifest, runtimeLoadingAssets }));
}

function parseArgs(argv) {
  let manifestPath;
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--manifest') manifestPath = argv[++index];
  }
  return { manifestPath };
}

function main() {
  const rootDir = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(rootDir, args.manifestPath ?? 'public/assets/art/manifest.v1.json');
  const errors = validateManifestFile(manifestPath, { rootDir });
  if (errors.length > 0) {
    for (const error of errors) console.error(`art-check: ${error}`);
    process.exitCode = 1;
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(
    `art-check: ok (${manifest.atlases.length} atlas, ${manifest.buildings.length} buildings, `
    + `${manifest.terrain.length} terrain, ${manifest.environment?.length ?? 0} environment, `
    + `${manifest.loading.length} loading, ${manifest.ui.length} UI)`,
  );
}

if (require.main === module) main();

module.exports = {
  parseRuntimeLoadingAssets,
  readImageDimensions,
  validateArtManifest,
  validateManifestFile,
};
