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

const legacyCatalog = await buildCatalogSessions(db, new URLSearchParams('limit=200&sort=time'));
const typedCatalog = await buildPublicCatalogDto(parseSearchParams(
  publicCatalogQuerySchema,
  new URLSearchParams('limit=200&sort=time'),
));

for (let index = 0; index < Math.min(legacyCatalog.items.length, typedCatalog.items.length, 20); index += 1) {
  const legacySlots = legacyCatalog.items[index]?.upcomingSlots || [];
  const typedSlots = typedCatalog.items[index]?.upcomingSlots || [];
  assert.equal(typedSlots.length, legacySlots.length, `item ${index}: upcoming slot count`);
  assert.deepEqual(
    typedSlots.map((slot) => [slot.eventId, slot.startsAt]),
    legacySlots.map((slot: { eventId?: string; startsAt?: string }) => [slot.eventId, slot.startsAt]),
    `item ${index}: upcoming slot schedule`,
  );
}

const scheduleSlots = typedCatalog.items
  .flatMap((item) => item.upcomingSlots || [])
  .filter((slot) => slot.eventId && slot.startsAt);
assert.ok(scheduleSlots.length > 0, 'typed catalog must expose purchasable upcoming slots');

const eventIds = [...new Set(typedCatalog.items.map((item) => item.id))];
const linkedEvents = await db.query(
  `
    select count(*)::int as count
    from "ProviderLink"
    where "entityKind" = 'EVENT'
      and "eventId" = any($1::text[])
  `,
  [eventIds],
);
const linkedEventCount = Number((linkedEvents.rows[0] as { count?: unknown } | undefined)?.count || 0);
assert.ok(linkedEventCount > 0, 'catalog items must resolve ProviderLink EVENT identities');
console.log(`EVENT identities: ${linkedEventCount}/${eventIds.length} catalog items linked`);

process.exit(0);
