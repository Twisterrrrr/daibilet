import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { publicCatalogQuerySchema } from '@daibilet/contracts/schemas';

import { buildCatalogSessions, clearPublicDataCaches } from '../src/dto.js';
import { createDb } from '../src/db.js';
import {
  buildPublicCatalogDto,
  clearPublicCatalogDtoCache,
} from '../src/public-catalog.dto.js';
import { buildPublicLandingPageDto, clearPublicLandingDtoCache } from '../src/public-landing.dto.js';
import { parseSearchParams } from '../src/validation.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../../..');
const db = createDb(projectRoot);

const catalogCases = [
  'limit=5&sort=time',
  'limit=5&sort=price_asc&maxPrice=1000',
  'limit=5&category=Экскурсии',
  'limit=5&q=теплоход',
  'limit=5&city=Москва&sort=popular',
  'limit=5&date=today&sort=time',
  'limit=5&sort=price_desc',
];

const landingSlugs = ['river-cruises', 'bus-tours', 'bridges-night'];

clearPublicDataCaches();
clearPublicCatalogDtoCache();
clearPublicLandingDtoCache();

for (const queryString of catalogCases) {
  const searchParams = new URLSearchParams(queryString);
  const typedQuery = parseSearchParams(publicCatalogQuerySchema, searchParams);

  const [legacy, typed] = await Promise.all([
    buildCatalogSessions(db, searchParams),
    buildPublicCatalogDto(typedQuery),
  ]);

  assert.equal(typed.total, legacy.total, `${queryString}: total`);
  assert.deepEqual(
    typed.items.map((item) => item.id),
    legacy.items.map((item: { id: string }) => item.id),
    `${queryString}: item ids`,
  );
  console.log(`${queryString}: ${typed.total} items, parity ok`);
}

for (const slug of landingSlugs) {
  const payload = await buildPublicLandingPageDto(slug);
  assert.ok(payload?.landing, `${slug}: landing payload`);
  assert.ok(Array.isArray(payload.sessions), `${slug}: sessions array`);
  console.log(`${slug}: ${payload.sessions.length} sessions, landing ok`);
}

const nextBase = process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
const legacyBase = process.env.LEGACY_BASE_URL || process.env.API_BASE_URL || '';

if (nextBase && legacyBase) {
  const probe = 'limit=5&sort=time';
  const [nextResponse, legacyResponse] = await Promise.all([
    fetch(`${nextBase.replace(/\/+$/, '')}/api/public/events?${probe}`),
    fetch(`${legacyBase.replace(/\/+$/, '')}/api/public/events?${probe}`),
  ]);
  assert.equal(nextResponse.ok, true, 'next /api/public/events must respond');
  assert.equal(legacyResponse.ok, true, 'legacy /api/public/events must respond');

  const nextPayload = (await nextResponse.json()) as { total?: number; items?: Array<{ id: string }> };
  const legacyPayload = (await legacyResponse.json()) as { total?: number; items?: Array<{ id: string }> };
  assert.equal(nextPayload.total, legacyPayload.total, 'HTTP total parity');
  assert.deepEqual(
    nextPayload.items?.map((item) => item.id),
    legacyPayload.items?.map((item) => item.id),
    'HTTP item ids parity',
  );
  console.log(`HTTP parity ${probe}: ok (${nextBase} vs ${legacyBase})`);
} else {
  console.log('HTTP parity skipped: set WEB_BASE_URL + LEGACY_BASE_URL');
}

process.exit(0);
