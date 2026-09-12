import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/**
 * Next.js App Router: sibling/ancestor `loading.tsx` wraps the page in Suspense
 * and starts streaming with HTTP 200. After headers are flushed, `notFound()` can
 * only swap the UI - status stays 200 (Yandex soft-404).
 *
 * Catalog skeletons belong under `(catalog)/loading.tsx` only.
 * Detail / catch-all routes that call `notFound()` must not have loading.tsx.
 */
const APP_ROOT = path.resolve(__dirname, '../../app');

const FORBIDDEN_LOADING = [
  'loading.tsx',
  'events/loading.tsx',
  'events/[slug]/loading.tsx',
  'cities/loading.tsx',
  'cities/[slug]/loading.tsx',
  'venues/loading.tsx',
  'venues/[slug]/loading.tsx',
  'locations/loading.tsx',
  'locations/[slug]/loading.tsx',
  'blog/loading.tsx',
  'blog/[slug]/loading.tsx',
  'podborki/loading.tsx',
  'podborki/[intent]/loading.tsx',
  'podborki/[intent]/[city]/loading.tsx',
];

const REQUIRED_CATALOG_LOADING = [
  'events/(catalog)/loading.tsx',
  'cities/(catalog)/loading.tsx',
  'venues/(catalog)/loading.tsx',
  'locations/(catalog)/loading.tsx',
  'blog/(catalog)/loading.tsx',
  'podborki/(catalog)/loading.tsx',
];

test('SEO: no loading.tsx on notFound()-capable segments (avoids HTTP 200 soft-404)', () => {
  for (const rel of FORBIDDEN_LOADING) {
    assert.equal(
      fs.existsSync(path.join(APP_ROOT, rel)),
      false,
      `forbidden loading.tsx present: ${rel}`,
    );
  }
});

test('SEO: catalog soft-nav skeletons live under (catalog) route groups', () => {
  for (const rel of REQUIRED_CATALOG_LOADING) {
    assert.equal(
      fs.existsSync(path.join(APP_ROOT, rel)),
      true,
      `missing catalog loading.tsx: ${rel}`,
    );
  }
});
