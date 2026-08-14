import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAdminOrdersList } from '../src/dto.js';
import { buildAdminOrdersListDto } from '../src/admin-orders.dto.js';
import { createDb } from '../src/db.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../../..');
const db = createDb(projectRoot);

const listCases = [
  'limit=20&page=1',
  'limit=20&page=1&view=attention',
  'limit=20&page=1&provider=TICKETSCLOUD',
  'limit=20&page=1&q=test',
];

for (const queryString of listCases) {
  const searchParams = new URLSearchParams(queryString);
  const [legacy, typed] = await Promise.all([
    buildAdminOrdersList(db, searchParams),
    buildAdminOrdersListDto(searchParams),
  ]);
  assert.equal(typed.total, legacy.total, `${queryString}: total`);
  assert.equal(typed.page, legacy.page, `${queryString}: page`);
  assert.deepEqual(
    typed.rows.map((row: { id: string }) => row.id),
    legacy.rows.map((row: { id: string }) => row.id),
    `${queryString}: row ids`,
  );
  assert.deepEqual(typed.metrics, legacy.metrics, `${queryString}: metrics`);
  console.log(`${queryString}: ${typed.total} orders, parity ok`);
}

process.exit(0);
