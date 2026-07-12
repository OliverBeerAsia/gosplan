import { Assets, Rectangle, Texture } from 'pixi.js';

interface AtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AtlasManifest {
  image: string;
  frames: Record<string, AtlasFrame>;
}

export interface SpriteAtlasLoadOptions {
  /** Manifest-owned image URL. Used by the versioned art registry. */
  imageUrl?: string;
}

function resolveImageUrl(manifestUrl: string, image: string): string {
  if (image.startsWith('/') || image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  const slash = manifestUrl.lastIndexOf('/');
  if (slash === -1) return image;
  return `${manifestUrl.slice(0, slash + 1)}${image}`;
}

export async function loadSpriteAtlasTextures(
  manifestUrl: string,
  options: SpriteAtlasLoadOptions = {},
): Promise<Map<string, Texture>> {
  const textures = new Map<string, Texture>();

  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) return textures;

    const manifest = await response.json() as AtlasManifest;
    if ((!manifest?.image && !options.imageUrl) || !manifest.frames) return textures;

    const imageUrl = options.imageUrl ?? resolveImageUrl(manifestUrl, manifest.image);
    const loaded = await Assets.load(imageUrl);
    if (!(loaded instanceof Texture)) return textures;

    const source = loaded.source;

    for (const [key, frame] of Object.entries(manifest.frames)) {
      if (!frame || ![frame.x, frame.y, frame.w, frame.h].every(Number.isFinite)) continue;
      if (frame.x < 0 || frame.y < 0 || frame.w <= 0 || frame.h <= 0) continue;
      const region = new Rectangle(frame.x, frame.y, frame.w, frame.h);
      textures.set(key, new Texture({ source, frame: region }));
    }
  } catch {
    return textures;
  }

  return textures;
}
