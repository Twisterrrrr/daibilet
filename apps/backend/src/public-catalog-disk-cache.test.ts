import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  loadPublicCatalogDiskCacheWithStat,
  resolveCatalogRebuildMode,
  resolvePublicCatalogDiskCachePath,
} from './public-catalog-disk-cache.js';

test('resolveCatalogRebuildMode defaults to child for Next/web heuristics', () => {
  const prev = {
    mode: process.env.DAIBILET_CATALOG_REBUILD_MODE,
    webPort: process.env.DAIBILET_WEB_PORT,
    nextRuntime: process.env.NEXT_RUNTIME,
  };
  try {
    delete process.env.DAIBILET_CATALOG_REBUILD_MODE;
    delete process.env.DAIBILET_WEB_PORT;
    delete process.env.NEXT_RUNTIME;
    assert.equal(resolveCatalogRebuildMode(), 'inline');

    process.env.DAIBILET_WEB_PORT = '3001';
    assert.equal(resolveCatalogRebuildMode(), 'child');

    delete process.env.DAIBILET_WEB_PORT;
    process.env.NEXT_RUNTIME = 'nodejs';
    assert.equal(resolveCatalogRebuildMode(), 'child');

    process.env.DAIBILET_CATALOG_REBUILD_MODE = 'off';
    assert.equal(resolveCatalogRebuildMode(), 'off');

    process.env.DAIBILET_CATALOG_REBUILD_MODE = 'inline';
    assert.equal(resolveCatalogRebuildMode(), 'inline');
  } finally {
    restoreEnv('DAIBILET_CATALOG_REBUILD_MODE', prev.mode);
    restoreEnv('DAIBILET_WEB_PORT', prev.webPort);
    restoreEnv('NEXT_RUNTIME', prev.nextRuntime);
  }
});

test('resolvePublicCatalogDiskCachePath honors env override', () => {
  const prev = process.env.DAIBILET_PUBLIC_CATALOG_DISK_CACHE;
  try {
    process.env.DAIBILET_PUBLIC_CATALOG_DISK_CACHE = '/tmp/daibilet-catalog-test.json';
    assert.equal(resolvePublicCatalogDiskCachePath(), '/tmp/daibilet-catalog-test.json');
  } finally {
    restoreEnv('DAIBILET_PUBLIC_CATALOG_DISK_CACHE', prev);
  }
});

test('loadPublicCatalogDiskCacheWithStat skips unchanged snapshot without parsing body', () => {
  const prev = process.env.DAIBILET_PUBLIC_CATALOG_DISK_CACHE;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'daibilet-catalog-cache-'));
  const filePath = path.join(dir, 'public-catalog-dto.json');
  try {
    fs.writeFileSync(filePath, '{not-json');
    const mtimeMs = fs.statSync(filePath).mtimeMs;
    process.env.DAIBILET_PUBLIC_CATALOG_DISK_CACHE = filePath;

    assert.equal(loadPublicCatalogDiskCacheWithStat({ modifiedAfterMs: mtimeMs }), null);
  } finally {
    restoreEnv('DAIBILET_PUBLIC_CATALOG_DISK_CACHE', prev);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
