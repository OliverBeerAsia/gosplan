export function assetPath(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '');
  const base = resolveBasePath();
  return `${base}${clean}`;
}

function resolveBasePath(): string {
  if (typeof document === 'undefined') return '/';
  const base = new URL('.', document.baseURI).pathname || '/';
  return base.endsWith('/') ? base : `${base}/`;
}
