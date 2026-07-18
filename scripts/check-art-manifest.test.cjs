const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const {
  findSvgParseError,
  parseRuntimeLoadingAssets,
  validateArtManifest,
  validateManifestFile,
} = require('./check-art-manifest.cjs');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'public/assets/art/manifest.v1.json');
const FIXTURE_DIR = path.join(ROOT, 'tests/fixtures/art');

function cloneManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function expectError(mutator, pattern) {
  const manifest = cloneManifest();
  mutator(manifest);
  const errors = validateArtManifest({ manifest, rootDir: ROOT });
  assert.match(errors.join('\n'), pattern);
}

function minimalAtlasManifest(framesFile) {
  return {
    schemaVersion: 1,
    metadata: { title: 'Validator fixture' },
    atlases: [{ id: 'fixture', image: 'atlas.svg', framesFile, pixelRatio: 1 }],
    buildings: [],
    terrain: [],
    loading: [],
    ui: [],
  };
}

function loadTranspiledModule(filePath, dependencies = {}) {
  const source = fs.readFileSync(filePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
    fileName: filePath,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (request) => {
    if (Object.hasOwn(dependencies, request)) return dependencies[request];
    throw new Error(`Unexpected transpiled require: ${request}`);
  };
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
  return module.exports;
}

function loadTextureFactoryForTest(loadArtRegistry, options = {}) {
  class Sprite {
    constructor(texture) {
      this.texture = texture;
      this.tint = 0xffffff;
    }

    destroy() {}
  }

  const ArtRegistry = class {
    static load(url) {
      return loadArtRegistry(url);
    }
  };

  return loadTranspiledModule(
    path.join(ROOT, 'src/graphics/TextureFactory.ts'),
    {
      'pixi.js': { Graphics: class {}, Renderer: class {}, Sprite, Texture: class {}, Container: class {} },
      './TerrainTextures': {
        generateTerrainTextures: () => new Map([['ground', { source: 'procedural-terrain' }]]),
      },
      './BuildingTextures': {
        generateBuildingTextures: () => new Map([['factory', { source: 'procedural-building' }]]),
      },
      './SpriteAtlasLoader': {
        loadSpriteAtlasTextures: options.loadSpriteAtlasTextures ?? (async () => new Map([
          ['ground', { source: 'legacy-atlas-terrain' }],
          ['factory', { source: 'legacy-atlas-building-must-not-win' }],
        ])),
      },
      '../utils/assetPath': {
        assetPath: (relativePath) => `/base/${relativePath}`,
      },
      './ArtRegistry': { ArtRegistry },
      './ArtManifest': {
        LEGACY_ART_ATLAS_ID: 'legacy.pixel_city',
        parseArtFrameRef: (reference) => {
          const separator = reference.indexOf(':');
          if (separator <= 0 || separator === reference.length - 1) return undefined;
          return {
            atlasId: reference.slice(0, separator),
            frameId: reference.slice(separator + 1),
          };
        },
      },
    },
  ).TextureFactory;
}

test('shipped art manifest validates', () => {
  assert.deepEqual(validateManifestFile(MANIFEST_PATH, { rootDir: ROOT }), []);
});

test('runtime loading art and manifest loading art stay in exact sync', () => {
  const manifest = cloneManifest();
  const runtimeLoadingAssets = parseRuntimeLoadingAssets(
    path.join(ROOT, 'src/ui/LoadingInterstitial.ts'),
    [],
  );
  assert.deepEqual(
    new Set(manifest.loading.map((definition) => definition.file)),
    runtimeLoadingAssets,
  );

  manifest.loading[0].file = 'assets/ui/obsolete-loading-card.svg';
  const errors = validateArtManifest({ manifest, rootDir: ROOT, runtimeLoadingAssets });
  assert.match(errors.join('\n'), /runtime loading asset is missing from the art manifest/);
  assert.match(errors.join('\n'), /art manifest loading asset is not referenced by the runtime/);
});

test('validator rejects schema, duplicate IDs, unknown buildings, and footprint drift', () => {
  expectError((manifest) => { manifest.schemaVersion = 2; }, /schemaVersion must be 1/);
  expectError((manifest) => { manifest.buildings.push(structuredClone(manifest.buildings[0])); }, /duplicate building art ID/);
  expectError((manifest) => { manifest.buildings[0].buildingId = 'not_registered'; }, /unknown BuildingRegistry ID/);
  expectError((manifest) => { manifest.buildings[0].footprint = [9, 9]; }, /disagrees with BuildingRegistry/);
});

test('validator rejects missing frames, bad anchors, districts, eras, and fallbacks', () => {
  expectError((manifest) => { manifest.buildings[0].lod.near = 'buildings.khrushchyovka_1x:not_a_frame'; }, /references missing frame/);
  expectError((manifest) => { manifest.buildings[0].anchor = [1000, 1000]; }, /outside logical sprite bounds/);
  expectError((manifest) => { manifest.buildings[0].variants[0].allowedDistricts = ['moon_base']; }, /unknown district/);
  expectError((manifest) => { manifest.buildings[0].variants[0].minimumEra = 5; }, /unknown minimumEra/);
  expectError((manifest) => { manifest.buildings[0].proceduralFallback = 'missing_fallback'; }, /not generated by BuildingTextures/);
  expectError((manifest) => {
    manifest.buildings[0].variants[0].lod = {
      ...manifest.buildings[0].lod,
      mid: 'buildings.khrushchyovka_1x:not_a_variant_lod_frame',
    };
  }, /variant "linked_return" lod\.mid references missing frame/);
});

test('validator accepts backward-compatible variant-specific LOD frames', () => {
  const manifest = cloneManifest();
  manifest.buildings[0].variants[0].lod = { ...manifest.buildings[0].lod };
  assert.deepEqual(validateArtManifest({ manifest, rootDir: ROOT }), []);
});

test('validator rejects malformed environment definitions and preserves optional compatibility', () => {
  const withoutEnvironment = cloneManifest();
  delete withoutEnvironment.environment;
  assert.deepEqual(validateArtManifest({ manifest: withoutEnvironment, rootDir: ROOT }), []);

  expectError((manifest) => { manifest.environment = {}; }, /environment must be an array/);
  expectError((manifest) => {
    manifest.environment[0].ownerBuildingIds = ['not_registered'];
  }, /has unknown owner/);
  expectError((manifest) => {
    manifest.environment[0].variants[0].parts[0].lod.near = 'environment.worker_housing_1x:not-a-frame';
  }, /references missing frame/);
  expectError((manifest) => {
    manifest.environment[0].variants[0].parts[0].offset = [9, 9];
  }, /lies outside footprint/);
  expectError((manifest) => {
    manifest.environment[2].placements[0].roadEdge = 'wrong_edge';
  }, /has invalid roadEdge/);
  expectError((manifest) => {
    manifest.environment[2].placements[0].variantIds = ['missing_variant'];
  }, /references unknown variant/);
});

test('validator accepts variant-owned anchors and rejects points outside the selected near frame', () => {
  const manifest = cloneManifest();
  const khrushchyovka = manifest.buildings.find((building) => building.buildingId === 'khrushchyovka');
  assert.ok(khrushchyovka);
  assert.equal(khrushchyovka.variants[0].windowAnchors.length >= 20, true);
  assert.deepEqual(validateArtManifest({ manifest, rootDir: ROOT }), []);

  khrushchyovka.variants[0].windowAnchors[0] = [161, 177];
  const errors = validateArtManifest({ manifest, rootDir: ROOT });
  assert.match(
    errors.join('\n'),
    /variant "linked_return" windowAnchors\[0\].*outside logical sprite bounds 160x176/,
  );
});

test('validator checks atlas frame bounds against source image dimensions', () => {
  const validErrors = validateArtManifest({
    manifest: minimalAtlasManifest('valid-frames.json'),
    rootDir: ROOT,
    publicDir: FIXTURE_DIR,
  });
  assert.deepEqual(validErrors, []);

  const invalidErrors = validateArtManifest({
    manifest: minimalAtlasManifest('out-of-bounds-frames.json'),
    rootDir: ROOT,
    publicDir: FIXTURE_DIR,
  });
  assert.match(invalidErrors.join('\n'), /lies outside 64x64 image bounds/);
});

test('validator accepts current-style well-formed SVG atlas images', () => {
  const errors = validateArtManifest({
    manifest: minimalAtlasManifest('valid-frames.json'),
    rootDir: ROOT,
    publicDir: FIXTURE_DIR,
  });
  assert.deepEqual(errors, []);
});

test('validator reports SVG atlas images that are not well-formed XML', () => {
  const manifest = minimalAtlasManifest('valid-frames.json');
  manifest.atlases[0].image = 'duplicate-attribute-atlas.svg';
  const errors = validateArtManifest({ manifest, rootDir: ROOT, publicDir: FIXTURE_DIR });
  const joined = errors.join('\n');
  assert.match(joined, /not well-formed XML/);
  assert.match(joined, /duplicate-attribute-atlas\.svg/);
  assert.match(joined, /duplicate attribute "width"/);
});

test('SVG well-formedness checker catches the historical failure classes', () => {
  assert.equal(
    findSvgParseError('<svg width="64">\n  <!-- ok -->\n  <g fill="#fff"><rect w="1"/></g>\n</svg>'),
    undefined,
  );
  assert.match(
    findSvgParseError('<svg width="64" height="64" width="64"></svg>'),
    /duplicate attribute "width" on <svg>/,
  );
  assert.match(findSvgParseError('<svg><g><rect/></svg>'), /expected <\/g> but found <\/svg>/);
  assert.match(findSvgParseError('<svg><g/>'), /unclosed <svg>/);
  assert.match(findSvgParseError('<svg width=64></svg>'), /unquoted value/);
  assert.match(findSvgParseError('<svg><g></g></svg><svg/>'), /multiple root elements/);
});

test('every shipped SVG asset is well-formed XML', () => {
  const roots = [path.join(ROOT, 'public/assets')];
  const svgFiles = [];
  while (roots.length > 0) {
    const dir = roots.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) roots.push(entryPath);
      else if (entry.name.endsWith('.svg')) svgFiles.push(entryPath);
    }
  }
  assert.ok(svgFiles.length >= 11, `expected shipped SVG assets, found ${svgFiles.length}`);
  for (const svgFile of svgFiles) {
    assert.equal(
      findSvgParseError(fs.readFileSync(svgFile, 'utf8')),
      undefined,
      `expected well-formed XML: ${path.relative(ROOT, svgFile)}`,
    );
  }
});

test('visual variant hashing is deterministic and independent of manifest order', () => {
  const manifestModule = loadTranspiledModule(path.join(ROOT, 'src/graphics/ArtManifest.ts'));
  const resolver = loadTranspiledModule(
    path.join(ROOT, 'src/graphics/ArtVariantResolver.ts'),
    { './ArtManifest': manifestModule },
  );
  const context = {
    mapSeed: 0x1a2b3c4d,
    building: { id: 42, defId: 'khrushchyovka', gx: 7, gy: 11 },
    districtStyle: 'worker_housing',
  };
  const variants = [
    { id: 'c', weight: 1 },
    { id: 'a', weight: 2 },
    { id: 'b', weight: 3 },
  ];

  const firstHash = resolver.stableVisualVariantHash(context);
  assert.equal(firstHash, resolver.stableVisualVariantHash(structuredClone(context)));
  assert.notEqual(firstHash, resolver.stableVisualVariantHash({
    ...context,
    building: { ...context.building, gx: 8 },
  }));
  assert.equal(firstHash, resolver.stableVisualVariantHash({
    ...context,
    districtStyle: 'heavy_industry',
  }), 'mutable district style must not change the physical mass hash');

  const selected = resolver.resolveWeightedVisualVariant(variants, context);
  assert.equal(selected.id, resolver.resolveWeightedVisualVariant(variants.slice().reverse(), context).id);

  const buildingVariants = variants.map((variant, index) => ({
    ...variant,
    frame: `authored.housing:variant-${variant.id}`,
    allowedDistricts: index === 0 ? ['heavy_industry'] : ['worker_housing'],
    minimumEra: 1,
  }));
  const buildingContext = { ...context, era: 2 };
  assert.equal(
    resolver.resolveBuildingArtVariant(buildingVariants, buildingContext)?.id,
    resolver.resolveBuildingArtVariant(buildingVariants.slice().reverse(), buildingContext)?.id,
  );

  assert.equal(resolver.resolveArtLodForZoom(0.25), 'far');
  assert.equal(resolver.resolveArtLodForZoom(0.6), 'mid');
  assert.equal(resolver.resolveArtLodForZoom(1), 'near');
  assert.equal(resolver.resolveArtLodForZoom(0.47, 'far'), 'far');
  assert.equal(resolver.resolveArtLodForZoom(0.51, 'far'), 'mid');
});

test('TextureFactory retains the authored registry without changing legacy texture selection', async () => {
  const registry = { source: 'manifest', getAtlases: () => [] };
  let requestedUrl;
  const TextureFactory = loadTextureFactoryForTest(async (url) => {
    requestedUrl = url;
    return registry;
  });
  const factory = new TextureFactory();
  const renderer = {
    generateTexture: (sprite) => ({ source: sprite.texture.source, tint: sprite.tint }),
  };

  await factory.generate(renderer);

  assert.equal(requestedUrl, '/base/assets/art/manifest.v1.json');
  assert.equal(factory.getArtRegistry(), registry);
  // The legacy pixel-city override was removed 2026-07-18; procedural terrain
  // is canonical and the migration atlas must never be fetched at runtime.
  assert.equal(factory.get('ground').source, 'procedural-terrain');
  assert.equal(factory.get('factory').source, 'procedural-building');
});

test('TextureFactory loads every manifest atlas and exposes full frame references', async () => {
  const requested = [];
  const texture = { source: 'authored-khrushchyovka', width: 128, height: 160 };
  const nearTexture = { source: 'authored-khrushchyovka-near', width: 128, height: 160 };
  const definition = {
    buildingId: 'factory',
    anchor: [64, 159],
    proceduralFallback: 'factory',
    entrances: [[64, 149]],
    queueAnchors: [[64, 155]],
    windowAnchors: [[42, 96]],
  };
  const registry = {
    getAtlases: () => [
      { id: 'authored.housing', image: 'art/housing.png', framesFile: 'art/housing.json' },
      { id: 'authored.optional', image: 'art/optional.png', framesFile: 'art/optional.json' },
    ],
    getBuilding: () => definition,
    resolveBuilding: () => ({
      definition,
      baseFrame: {
        atlasId: 'authored.housing',
        frameId: 'base',
        reference: 'authored.housing:base',
      },
      variant: {
        id: 'long-slab',
        entrances: [[41, 140], [62, 147], [83, 154]],
        queueAnchors: [[41, 144], [62, 151], [83, 158]],
        windowAnchors: [[35, 93], [46, 93]],
      },
      variantLodFrame: {
        atlasId: 'authored.housing',
        frameId: 'long-slab-near',
        reference: 'authored.housing:long-slab-near',
      },
      variantFrame: {
        atlasId: 'authored.housing',
        frameId: 'long-slab',
        reference: 'authored.housing:long-slab',
      },
    }),
  };
  const TextureFactory = loadTextureFactoryForTest(async () => registry, {
    loadSpriteAtlasTextures: async (framesUrl, options) => {
      if (framesUrl.endsWith('/assets/atlas/pixel-city.json')) {
        return new Map([
          ['ground', { source: 'legacy-atlas-terrain' }],
          ['factory', { source: 'legacy-atlas-building-must-not-win' }],
        ]);
      }
      requested.push([framesUrl, options.imageUrl]);
      if (framesUrl.endsWith('/art/housing.json')) {
        return new Map([
          ['long-slab', texture],
          ['long-slab-near', nearTexture],
        ]);
      }
      return new Map();
    },
  });
  const factory = new TextureFactory();
  const renderer = {
    generateTexture: (sprite) => ({ source: sprite.texture.source, tint: sprite.tint }),
  };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await factory.generate(renderer);
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(requested, [
    ['/base/art/housing.json', '/base/art/housing.png'],
    ['/base/art/optional.json', '/base/art/optional.png'],
  ]);
  assert.equal(factory.getArtTexture('authored.housing:long-slab'), texture);
  assert.equal(factory.hasArtTexture('authored.housing:long-slab'), true);
  const resolved = factory.resolveAuthoredBuildingTexture('factory', 'near', {
    mapSeed: 123,
    building: { id: 7, defId: 'factory', gx: 4, gy: 9 },
    districtStyle: 'heavy_industry',
    era: 3,
  });
  assert.equal(resolved.texture, nearTexture);
  assert.equal(resolved.reference, 'authored.housing:long-slab-near');
  assert.equal(resolved.source, 'variant');
  assert.equal(resolved.variantId, 'long-slab');
  assert.equal(resolved.variant.id, 'long-slab');
  assert.deepEqual(resolved.entrances, [[41, 140], [62, 147], [83, 154]]);
  assert.deepEqual(resolved.queueAnchors, [[41, 144], [62, 151], [83, 158]]);
  assert.deepEqual(resolved.windowAnchors, [[35, 93], [46, 93]]);
  assert.equal(factory.get('factory').source, 'procedural-building');
});

test('TextureFactory falls back when authored atlas or selected frames are missing', async () => {
  const definition = {
    buildingId: 'factory',
    anchor: [64, 159],
    proceduralFallback: 'factory',
    queueAnchors: [[64, 155]],
    windowAnchors: [[42, 96]],
  };
  const registry = {
    getAtlases: () => [
      { id: 'authored.missing', image: 'missing.png', framesFile: 'missing.json' },
    ],
    getBuilding: () => definition,
    resolveBuilding: () => ({
      definition,
      baseFrame: {
        atlasId: 'authored.missing',
        frameId: 'base',
        reference: 'authored.missing:base',
      },
      variant: { id: 'missing-variant' },
      variantFrame: {
        atlasId: 'authored.missing',
        frameId: 'variant',
        reference: 'authored.missing:variant',
      },
    }),
  };
  const TextureFactory = loadTextureFactoryForTest(async () => registry, {
    loadSpriteAtlasTextures: async () => new Map(),
  });
  const factory = new TextureFactory();
  const renderer = {
    generateTexture: (sprite) => ({ source: sprite.texture.source, tint: sprite.tint }),
  };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await factory.generate(renderer);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(factory.resolveAuthoredBuildingTexture('factory', 'near', {
    mapSeed: 123,
    building: { id: 7, defId: 'factory', gx: 4, gy: 9 },
    districtStyle: 'heavy_industry',
    era: 3,
  }), undefined);
  assert.equal(factory.getProceduralBuildingFallback('factory'), 'factory');
  assert.equal(factory.get('factory').source, 'procedural-building');
});

test('TextureFactory uses the authored LOD base when a selected variant frame is unavailable', async () => {
  const baseTexture = { source: 'authored-mid-base' };
  const definition = {
    buildingId: 'factory',
    anchor: [64, 159],
    proceduralFallback: 'factory',
    queueAnchors: [[64, 155]],
    windowAnchors: [[42, 96]],
  };
  const registry = {
    getAtlases: () => [
      { id: 'authored.housing', image: 'housing.png', framesFile: 'housing.json' },
    ],
    getBuilding: () => definition,
    resolveBuilding: (_buildingId, lod) => ({
      definition,
      baseFrame: {
        atlasId: 'authored.housing',
        frameId: `${lod}-base`,
        reference: `authored.housing:${lod}-base`,
      },
      variant: { id: 'unavailable-variant' },
      variantFrame: {
        atlasId: 'authored.housing',
        frameId: 'unavailable-variant',
        reference: 'authored.housing:unavailable-variant',
      },
    }),
  };
  const TextureFactory = loadTextureFactoryForTest(async () => registry, {
    loadSpriteAtlasTextures: async (url) => url.endsWith('/housing.json')
      ? new Map([['mid-base', baseTexture]])
      : new Map(),
  });
  const factory = new TextureFactory();
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await factory.generate({
      generateTexture: (sprite) => ({ source: sprite.texture.source, tint: sprite.tint }),
    });
  } finally {
    console.warn = originalWarn;
  }

  const resolved = factory.resolveAuthoredBuildingTexture('factory', 'mid', {
    mapSeed: 123,
    building: { id: 7, defId: 'factory', gx: 4, gy: 9 },
    districtStyle: 'heavy_industry',
    era: 3,
  });
  assert.equal(resolved.texture, baseTexture);
  assert.equal(resolved.reference, 'authored.housing:mid-base');
  assert.equal(resolved.source, 'base');
  assert.equal(resolved.variant, undefined);
  assert.deepEqual(resolved.queueAnchors, [[64, 155]]);
  assert.deepEqual(resolved.windowAnchors, [[42, 96]]);
});

test('legacy manifest frames never opt buildings into the authored runtime path', async () => {
  const texture = { source: 'legacy-frame-that-must-not-win' };
  const definition = {
    buildingId: 'factory',
    anchor: [64, 159],
    proceduralFallback: 'factory',
  };
  const registry = {
    getAtlases: () => [
      { id: 'legacy.pixel_city', image: 'legacy.svg', framesFile: 'legacy.json' },
    ],
    getBuilding: () => definition,
    resolveBuilding: () => ({
      definition,
      baseFrame: {
        atlasId: 'legacy.pixel_city',
        frameId: 'factory',
        reference: 'legacy.pixel_city:factory',
      },
      variant: { id: 'legacy' },
      variantFrame: {
        atlasId: 'legacy.pixel_city',
        frameId: 'factory',
        reference: 'legacy.pixel_city:factory',
      },
    }),
  };
  const TextureFactory = loadTextureFactoryForTest(async () => registry, {
    loadSpriteAtlasTextures: async (url) => url.endsWith('/legacy.json')
      ? new Map([['factory', texture]])
      : new Map([
          ['ground', { source: 'legacy-atlas-terrain' }],
          ['factory', { source: 'legacy-atlas-building-must-not-win' }],
        ]),
  });
  const factory = new TextureFactory();
  await factory.generate({
    generateTexture: (sprite) => ({ source: sprite.texture.source, tint: sprite.tint }),
  });

  assert.equal(factory.getArtTexture('legacy.pixel_city:factory'), texture);
  assert.equal(factory.resolveAuthoredBuildingTexture('factory', 'near', {
    mapSeed: 123,
    building: { id: 7, defId: 'factory', gx: 4, gy: 9 },
    districtStyle: 'heavy_industry',
    era: 3,
  }), undefined);
  assert.equal(factory.get('factory').source, 'procedural-building');
});

test('TextureFactory catches registry failures and completes the legacy texture pipeline', async () => {
  const TextureFactory = loadTextureFactoryForTest(async () => {
    throw new Error('bad manifest');
  });
  const factory = new TextureFactory();
  const renderer = {
    generateTexture: (sprite) => ({ source: sprite.texture.source, tint: sprite.tint }),
  };
  const originalWarn = console.warn;
  let warning;
  console.warn = (...args) => { warning = args; };

  try {
    await factory.generate(renderer);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(factory.getArtRegistry(), undefined);
  assert.equal(factory.get('ground').source, 'procedural-terrain');
  assert.equal(factory.get('factory').source, 'procedural-building');
  assert.match(warning[0], /continuing with legacy textures/);
  assert.match(warning[1].message, /bad manifest/);
});
