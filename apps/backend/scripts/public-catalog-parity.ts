import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalogSessions, clearPublicDataCaches } from '../src/dto.js';
import { createDb } from '../src/db.js';
import {
  buildPublicCatalogDto,
  clearPublicCatalogDtoCache,
} from '../src/public-catalog.dto.js';
import { publicCatalogQuerySchema } from '../src/types/schemas.js';
import { parseSearchParams } from '../src/validation.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../../..');
const db = createDb(projectRoot);

const cases = [
  'limit=5&sort=time',
  'limit=5&sort=price&maxPrice=1000',
  'limit=5&category=Экскурсии',
  'limit=5&q=теплоход',
];

clearPublicDataCaches();
clearPublicCatalogDtoCache();

for (const queryString of cases) {
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
    `${queryString}: first item ids`,
  );
  assert.deepEqual(typed.facets, legacy.facets, `${queryString}: facets`);

  console.log(`${queryString}: ${typed.total} items, parity ok`);
}

const sessionCatalog = await buildPublicCatalogDto(parseSearchParams(
  publicCatalogQuerySchema,
  new URLSearchParams('limit=200&sort=time'),
));
const sessionIds = [...new Set(
  sessionCatalog.items.flatMap((item) => item.upcomingSlots || []).map((slot) => slot.id).filter(Boolean),
)];
assert.ok(sessionIds.length > 0, 'typed catalog must expose real EventSession ids');

const linkedSessions = await db.query(
  `
    select count(*)::int as count
    from "ProviderLink"
    where "entityKind" = 'SESSION'
      and "sessionId" = any($1::text[])
  `,
  [sessionIds],
);
const linkedSessionCount = Number((linkedSessions.rows[0] as { count?: unknown } | undefined)?.count || 0);
assert.ok(linkedSessionCount > 0, 'catalog slots must resolve ProviderLink SESSION identities');
console.log(`SESSION identities: ${linkedSessionCount}/${sessionIds.length} catalog slots linked`);

process.exit(0);
