import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  loadPublicCatalogDiskCache,
  loadPublicCatalogDiskCacheWithStat,
  resolveCatalogRebuildMode,
  resolvePublicCatalogDiskCachePath,
  writePublicCatalogDiskCache,
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

test('writePublicCatalogDiskCache blocks empty sessions and keeps previous', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'daibilet-catalog-disk-'));
  const filePath = path.join(dir, 'public-catalog-dto.json');
  const prevEnv = process.env.DAIBILET_PUBLIC_CATALOG_DISK_CACHE;
  try {
    process.env.DAIBILET_PUBLIC_CATALOG_DISK_CACHE = filePath;
    const now = Date.now();
    assert.equal(
      writePublicCatalogDiskCache({
        version: 1,
        builtAt: now,
        expiresAt: now + 60_000,
        staleUntil: now + 120_000,
        sessions: [{ id: 'a' } as never],
      }),
      true,
    );
    assert.equal(
      writePublicCatalogDiskCache({
        version: 1,
        builtAt: now + 1,
        expiresAt: now + 60_000,
        staleUntil: now + 120_000,
        sessions: [],
      }),
      false,
    );
    const loaded = loadPublicCatalogDiskCache();
    assert.equal(loaded?.sessions?.length, 1);
    assert.equal(loaded?.sessions?.[0]?.id, 'a');
  } finally {
    restoreEnv('DAIBILET_PUBLIC_CATALOG_DISK_CACHE', prevEnv);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadPublicCatalogDiskCacheWithStat skips parse when mtime unchanged', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'daibilet-catalog-stat-'));
  const filePath = path.join(dir, 'public-catalog-dto.json');
  const prevEnv = process.env.DAIBILET_PUBLIC_CATALOG_DISK_CACHE;
  const prevParse = JSON.parse;
  let parseCount = 0;
  try {
    process.env.DAIBILET_PUBLIC_CATALOG_DISK_CACHE = filePath;
    const now = Date.now();
    assert.equal(
      writePublicCatalogDiskCache({
        version: 2,
        builtAt: now,
        expiresAt: now + 60_000,
        staleUntil: now + 120_000,
        sessions: [{ id: 'a' } as never],
        indexes: {
          destinationIndex: {},
          venueIndex: {},
          slugIndex: {},
          catalogFacets: null,
        },
      }),
      true,
    );

    JSON.parse = ((...args: Parameters<typeof JSON.parse>) => {
      parseCount += 1;
      return prevParse(...args);
    }) as typeof JSON.parse;

    const first = await loadPublicCatalogDiskCacheWithStat(null);
    assert.equal(first.status, 'loaded');
    if (first.status !== 'loaded') throw new Error('expected loaded');
    assert.equal(first.snapshot.version, 2);
    assert.equal(first.snapshot.sessions.length, 1);
    const parsesAfterCold = parseCount;
    assert.ok(parsesAfterCold >= 1);

    const second = await loadPublicCatalogDiskCacheWithStat(first.mtimeMs);
    assert.equal(second.status, 'unchanged');
    assert.equal(parseCount, parsesAfterCold, 'unchanged mtime must not JSON.parse again');
  } finally {
    JSON.parse = prevParse;
    restoreEnv('DAIBILET_PUBLIC_CATALOG_DISK_CACHE', prevEnv);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
