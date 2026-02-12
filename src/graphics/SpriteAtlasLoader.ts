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

function resolveImageUrl(manifestUrl: string, image: string): string {
  if (image.startsWith('/') || image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  const slash = manifestUrl.lastIndexOf('/');
  if (slash === -1) return image;
  return `${manifestUrl.slice(0, slash + 1)}${image}`;
}

export async function loadSpriteAtlasTextures(manifestUrl: string): Promise<Map<string, Texture>> {
  const textures = new Map<string, Texture>();

  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) return textures;

    const manifest = await response.json() as AtlasManifest;
    if (!manifest?.image || !manifest.frames) return textures;

    const imageUrl = resolveImageUrl(manifestUrl, manifest.image);
    const loaded = await Assets.load(imageUrl);
    if (!(loaded instanceof Texture)) return textures;

    const source = loaded.source;

    for (const [key, frame] of Object.entries(manifest.frames)) {
      const region = new Rectangle(frame.x, frame.y, frame.w, frame.h);
      textures.set(key, new Texture({ source, frame: region }));
    }
  } catch {
    return textures;
  }

  return textures;
}
