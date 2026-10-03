import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminEventGroupKeySql,
  buildAdminEventGroupKey,
  invalidateAdminEventsSqlReadModelCache,
} from './admin-events-sql-read-model.js';

test('buildAdminEventGroupKey normalizes source/title/city/venue', () => {
  const key = buildAdminEventGroupKey({
    sourceName: '  TicketsCloud  ',
    title: 'Речная   прогулка',
    city: 'Санкт-Петербург',
    venue: 'Причал А (59.93, 30.31)',
  });
  assert.equal(key, 'ticketscloud|речная прогулка|санкт-петербург|причал а');
});

test('buildAdminEventGroupKey falls back to publicSourceLabel and defaults', () => {
  const key = buildAdminEventGroupKey({
    sourceCode: 'TEPLOHOD',
    title: 'Disco',
  });
  assert.equal(key, 'teplohod.info|disco|не указан|не указано');
});

test('adminEventGroupKeySql projects atom columns with normalize pipe', () => {
  const sql = adminEventGroupKeySql('atom');
  assert.match(sql, /atom\."sourceLabel"/);
  assert.match(sql, /atom\.title/);
  assert.match(sql, /atom\."cityLabel"/);
  assert.match(sql, /atom\."venueLabel"/);
  assert.match(sql, /\|\| '\|' \|\|/);
  assert.match(sql, /lower\(trim\(regexp_replace/);
});

test('invalidateAdminEventsSqlReadModelCache is safe to call empty', () => {
  invalidateAdminEventsSqlReadModelCache();
  invalidateAdminEventsSqlReadModelCache();
});
