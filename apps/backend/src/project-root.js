/**
 * Resolve monorepo root for runtime file reads (geo JSON, caches, etc.).
 *
 * Next CI builds bake `import.meta.url` to `/home/runner/work/...`; that path
 * does not exist on MSK after artifact swap. Prefer cwd walk + optional env.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CITY_ROUTING_REL = path.join('data', 'geo', 'city-routing.ru.json');

function hasCityRouting(root) {
  try {
    return fs.existsSync(path.join(root, CITY_ROUTING_REL));
  } catch {
    return false;
  }
}

/**
 * @param {string | URL | undefined} importMetaUrl - caller's `import.meta.url` (source layout fallback)
 * @returns {string} absolute monorepo root
 */
export function resolveProjectRoot(importMetaUrl) {
  const envRoot = String(process.env.DAIBILET_PROJECT_ROOT || '').trim();
  if (envRoot && hasCityRouting(path.resolve(envRoot))) {
    return path.resolve(envRoot);
  }

  // next start cwd is usually apps/web; API often starts at repo root.
  let dir = path.resolve(process.cwd());
  for (let i = 0; i < 10; i += 1) {
    if (hasCityRouting(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  if (importMetaUrl) {
    try {
      const fromModule = path.resolve(path.dirname(fileURLToPath(importMetaUrl)), '../../..');
      if (hasCityRouting(fromModule)) return fromModule;
    } catch {
      /* bundled CI absolute path may be unusable */
    }
  }

  return path.resolve(process.cwd());
}

/**
 * @param {string | URL | undefined} importMetaUrl
 * @returns {string}
 */
export function resolveCityRoutingPath(importMetaUrl) {
  return path.join(resolveProjectRoot(importMetaUrl), CITY_ROUTING_REL);
}
