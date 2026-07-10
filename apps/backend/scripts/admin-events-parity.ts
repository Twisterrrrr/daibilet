import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAdminEventDetail, buildAdminEventsList } from '../src/dto.js';
import { buildAdminEventDetailDto, buildAdminEventsListDto } from '../src/admin-events.dto.js';
import { createDb } from '../src/db.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../../..');
const db = createDb(projectRoot);

const listCases = [
  'limit=20&page=1',
  'limit=20&page=1&view=needs_attention',
  'limit=20&page=1&source=TICKETSCLOUD',
  'limit=20&page=1&q=москва',
];

for (const queryString of listCases) {
  const searchParams = new URLSearchParams(queryString);
  const [legacy, typed] = await Promise.all([
    buildAdminEventsList(db, searchParams),
    buildAdminEventsListDto(searchParams),
  ]);
  assert.equal(typed.total, legacy.total, `${queryString}: total`);
  assert.equal(typed.page, legacy.page, `${queryString}: page`);
  assert.deepEqual(
    typed.rows.map((row: { id: string }) => row.id),
    legacy.rows.map((row: { id: string }) => row.id),
    `${queryString}: row ids`,
  );
  assert.deepEqual(typed.metrics, legacy.metrics, `${queryString}: metrics`);
  console.log(`${queryString}: ${typed.total} events, parity ok`);
}

const sampleId = (await buildAdminEventsListDto(new URLSearchParams('limit=1'))).rows[0]?.id;
assert.ok(sampleId, 'sample event id');

const [legacyDetail, typedDetail] = await Promise.all([
  buildAdminEventDetail(db, sampleId),
  buildAdminEventDetailDto(sampleId),
]);
assert.deepEqual(typedDetail, legacyDetail, `${sampleId}: event detail`);
console.log(`${sampleId}: event detail parity ok`);

process.exit(0);
