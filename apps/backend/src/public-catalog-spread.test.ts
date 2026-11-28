import assert from 'node:assert/strict';
import test from 'node:test';

import {
  catalogTitleSimilarity,
  dedupeCatalogNearDuplicates,
  isCatalogTitleNearDuplicate,
  normalizePublicSessionImageKey,
  seededNearBiasedShuffleSessions,
  spreadCatalogSessionsByCoverImage,
} from './public-catalog-spread.js';

test('normalizePublicSessionImageKey strips resize suffix', () => {
  assert.equal(
    normalizePublicSessionImageKey('https://cdn.example/a/b/poster-640x360.jpg'),
    normalizePublicSessionImageKey('https://cdn.example/a/b/poster.jpg'),
  );
});

test('spreadCatalogSessionsByCoverImage interleaves same-cover rows', () => {
  const img = 'https://cdn.example/party.jpg';
  const sessions = [
    { id: 'a1', imageUrl: img, title: 'Youth' },
    { id: 'a2', imageUrl: img, title: 'Middle' },
    { id: 'a3', imageUrl: img, title: 'Ultra youth' },
    { id: 'b1', imageUrl: 'https://cdn.example/other.jpg', title: 'Other' },
    { id: 'c1', imageUrl: 'https://cdn.example/third.jpg', title: 'Third' },
  ];

  const spread = spreadCatalogSessionsByCoverImage(sessions);
  assert.equal(spread.length, sessions.length);

  for (let i = 1; i < spread.length; i += 1) {
    const prev = normalizePublicSessionImageKey(spread[i - 1]!.imageUrl);
    const curr = normalizePublicSessionImageKey(spread[i]!.imageUrl);
    if (prev && curr) assert.notEqual(prev, curr, `adjacent duplicate at ${i - 1}/${i}`);
  }
});

test('spreadCatalogSessionsByCoverImage avoids three identical covers in a row', () => {
  const img = 'https://cdn.example/standup.jpg';
  const sessions = [
    { id: '1', imageUrl: img },
    { id: '2', imageUrl: img },
    { id: '3', imageUrl: img },
    { id: '4', imageUrl: 'https://cdn.example/cinema.jpg' },
    { id: '5', imageUrl: 'https://cdn.example/garden.jpg' },
  ];

  const spread = spreadCatalogSessionsByCoverImage(sessions);
  const keys = spread.map((s) => normalizePublicSessionImageKey(s.imageUrl));
  assert.notDeepEqual(keys.slice(0, 3), [keys[0], keys[0], keys[0]]);
});

test('catalogTitleSimilarity: Schroeder concert variants are near-duplicates', () => {
  const a = "Экскурсия в особняк Шрёдера + фортепианный концерт 'Лодка в океане'";
  const b = "Экскурсия в особняк Шрёдера + фортепианный концерт 'Музыкальные моменты'";
  assert.ok(isCatalogTitleNearDuplicate(a, b));
});

test('catalogTitleSimilarity: Syutkin variants are near-duplicates', () => {
  const a = 'Валерий Сюткин и ансамбль S.O.S';
  const b = 'Валерий Сюткин и «Лайт Джаз»';
  assert.ok(isCatalogTitleNearDuplicate(a, b));
});

test('catalogTitleSimilarity: unrelated titles stay distinct', () => {
  assert.equal(
    isCatalogTitleNearDuplicate('Кинопоказ в саду', 'Большой стендап / 21 октября'),
    false,
  );
});

test('dedupeCatalogNearDuplicates: one per cover + title cluster', () => {
  const mansion = 'https://cdn.example/mansion.jpg';
  const waltz = 'https://cdn.example/waltz.jpg';
  const sessions = [
    { id: '1', imageUrl: mansion, title: "Экскурсия в особняк Шрёдера + фортепианный концерт 'Лодка в океане'" },
    { id: '2', imageUrl: waltz, title: 'Симфонические танцы от Короля Вальсов' },
    { id: '3', imageUrl: mansion, title: "Экскурсия в особняк Шрёдера + фортепианный концерт 'Музыкальные моменты'" },
    { id: '4', imageUrl: waltz, title: 'Симфонические танцы в День рождения Короля Вальсов' },
    { id: '5', imageUrl: 'https://cdn.example/cinema.jpg', title: 'Кинопоказ в саду' },
  ];

  const deduped = dedupeCatalogNearDuplicates(sessions);
  assert.equal(deduped.length, 3);
  assert.deepEqual(
    deduped.map((s) => s.id),
    ['1', '2', '5'],
  );
});

test('seededNearBiasedShuffleSessions: far non-hits stay after near pool', () => {
  const now = new Date('2026-08-26T12:00:00');
  const sessions = [
    { id: 'nov', startsAt: '2026-11-21T18:00:00.000Z', sessionCount: 1 },
    { id: 'aug', startsAt: '2026-08-29T16:00:00.000Z', sessionCount: 1 },
    { id: 'hit-nov', startsAt: '2026-11-10T18:00:00.000Z', sessionCount: 6 },
    { id: 'sep', startsAt: '2026-09-05T16:00:00.000Z', sessionCount: 1 },
  ];

  const shuffled = seededNearBiasedShuffleSessions(sessions, 42, now);
  const ids = shuffled.map((s) => s.id);
  const novIndex = ids.indexOf('nov');
  const nearOrHit = new Set(['aug', 'sep', 'hit-nov']);
  assert.ok(novIndex === ids.length - 1 || ids.slice(0, novIndex).every((id) => nearOrHit.has(id)));
  assert.ok(ids.indexOf('aug') < novIndex);
  assert.ok(ids.indexOf('hit-nov') < novIndex);
});
