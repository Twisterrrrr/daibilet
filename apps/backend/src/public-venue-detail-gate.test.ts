import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateVenueDetailContentGate } from './public-venue-hub-gate.js';
import { markVenueSitemapDetailAvailability } from './public-venue-read.js';

test('detail content gate matches the no-session venue branches', () => {
  const base = { title: 'Зал', kind: 'CONCERT_HALL', pageStatus: 'CANDIDATE', address: 'ул. 1' };
  assert.equal(evaluateVenueDetailContentGate(base, 'concert_hall', 'institution').reason, 'missing_text');
  assert.equal(evaluateVenueDetailContentGate({ ...base, shortDescription: 'О зале' }, 'concert_hall', 'institution').available, true);
  assert.equal(evaluateVenueDetailContentGate({ ...base, kind: 'PIER', address: '', shortDescription: 'Причал' }, 'pier', 'location').reason, 'missing_address');
  assert.equal(evaluateVenueDetailContentGate({ ...base, pageStatus: 'NONE', shortDescription: 'О зале' }, 'concert_hall', 'institution').reason, 'none_status');
  assert.equal(evaluateVenueDetailContentGate({ ...base, pageStatus: 'PUBLISHED', shortDescription: 'О зале' }, 'concert_hall', 'institution').available, true);
});

test('sitemap batch keeps venues with catalog sessions and excludes content-only 404s', () => {
  const rows = [
    { id: 'bad', slug: 'empty-hall', title: 'Пустой зал', kind: 'CONCERT_HALL', pageStatus: 'CANDIDATE', address: 'ул. 1', city: 'Москва' },
    { id: 'live', slug: 'live-hall', title: 'Живой зал', kind: 'CONCERT_HALL', pageStatus: 'CANDIDATE', address: 'ул. 2', city: 'Москва' },
    { id: 'editorial', slug: 'museum', title: 'Музей', kind: 'MUSEUM_ART_SPACE', pageStatus: 'CANDIDATE', shortDescription: 'Описание', city: 'Москва' },
  ];
  const pageItems = rows.map((row) => ({ id: row.id, slug: row.slug, events: 2 }));
  const session = { id: 's1', venueId: 'live', city: 'Москва', startsAt: '2026-10-02T12:00:00Z' };
  const catalog = { resolveCatalogSessionsByVenueKeys: (keys: string[]) => keys.includes('live') ? [session] : [] };
  const result = markVenueSitemapDetailAvailability(pageItems, rows, [session], catalog);
  assert.equal(result[0].isIndexable, false);
  assert.equal(result[0].detailAvailable, false);
  assert.equal(result[1].detailAvailable, true);
  assert.equal(result[2].detailAvailable, true);
});
