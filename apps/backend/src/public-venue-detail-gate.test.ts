import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateVenueDetailContentGate } from './public-venue-hub-gate.js';
import { markVenueSitemapCanonicalSlugs, markVenueSitemapDetailAvailability } from './public-venue-read.js';

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

test('sitemap batch follows venue detail indexability for weak institution pages', () => {
  const rows = [
    { id: 'weak', slug: 'weak-club', title: 'Weak club', kind: 'CLUB_BAR_RESTAURANT', pageStatus: 'CANDIDATE', address: 'ул. 1', shortDescription: 'О клубе', city: 'Москва', isIndexable: true },
    { id: 'strong', slug: 'strong-club', title: 'Strong club', kind: 'CLUB_BAR_RESTAURANT', pageStatus: 'CANDIDATE', address: 'ул. 2', shortDescription: 'О клубе', city: 'Москва', isIndexable: true },
    { id: 'blocked', slug: 'blocked-club', title: 'Blocked club', kind: 'CLUB_BAR_RESTAURANT', pageStatus: 'CANDIDATE', address: 'ул. 3', shortDescription: 'О клубе', city: 'Москва', isIndexable: false },
  ];
  const pageItems = rows.map((row) => ({ id: row.id, slug: row.slug, events: 3 }));
  const sessions = [
    ...['a', 'b'].map((id) => ({ id, venueId: 'weak', city: 'Москва' })),
    ...['c', 'd', 'e'].map((id) => ({ id, venueId: 'strong', city: 'Москва' })),
    ...['f', 'g', 'h'].map((id) => ({ id, venueId: 'blocked', city: 'Москва' })),
  ];
  const catalog = { resolveCatalogSessionsByVenueKeys: (keys: string[]) => sessions.filter((session) => keys.includes(session.venueId)) };
  const result = markVenueSitemapDetailAvailability(pageItems, rows, sessions, catalog);
  assert.deepEqual(result.map((item: { detailAvailable?: boolean; isIndexable?: boolean }) => [item.detailAvailable, item.isIndexable]), [
    [true, false], [true, true], [true, false],
  ]);
});

test('sitemap excludes a duplicate slug that resolves to another venue ID', async () => {
  const items = [
    { id: 'venue_a', slug: 'same-hall', isIndexable: true, futureSessionCount: 3 },
    { id: 'venue_b', slug: 'same-hall', isIndexable: true, futureSessionCount: 3 },
    { id: 'venue_c', slug: 'unique-hall', isIndexable: true, futureSessionCount: 3 },
  ];
  const db = {
    query: async (sql: string) => sql.includes('group by slug')
      ? { rows: [{ slug: 'same-hall' }] }
      : { rows: [{ id: 'venue_b', slug: 'same-hall' }] },
  };
  const result = await markVenueSitemapCanonicalSlugs(items, db);
  assert.deepEqual(result.map((item: { isIndexable?: boolean }) => item.isIndexable), [false, true, true]);
});

test('sitemap excludes a computed slug that does not resolve to its venue ID', async () => {
  const items = [{ id: 'venue_cyr', slug: 'harat-s-pub', isIndexable: true, futureSessionCount: 3 }];
  const hubRows = [{ id: 'venue_cyr', slug: 'харат-с-паб' }];
  const db = {
    query: async (sql: string) => sql.includes('group by slug')
      ? { rows: [] }
      : { rows: [{ id: 'venue_other', slug: 'harat-s-pub' }] },
  };
  const result = await markVenueSitemapCanonicalSlugs(items, db, hubRows);
  assert.equal(result[0]?.isIndexable, false);
});
