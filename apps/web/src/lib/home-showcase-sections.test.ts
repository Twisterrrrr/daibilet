import assert from 'node:assert/strict';
import test from 'node:test';

import { isHomeRailTabooSession } from './home-rail-taboos';
import {
  buildEditorsPickEvents,
  buildPopularEvents,
  collapseCatalogComboFamilies,
  createHomePickState,
} from './home-showcase-sections';
import {
  collectSessionImageDedupeKeys,
  normalizeSessionImageKey,
  sessionHasCoverImage,
} from './session-cover-image';

function session(partial: Record<string, unknown>) {
  return {
    id: 'evt_x',
    title: 'Событие',
    slug: 'event-slug',
    venue: 'Площадка',
    venueSlug: 'ploschadka',
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    dateLabel: 'завтра',
    timeLabel: '19:00',
    priceFrom: 1000,
    sessionCount: 10,
    imageUrl: 'https://cdn.example/images/unique-cover-aaaaaaaa.jpg',
    purchaseReady: true,
    ...partial,
  } as any;
}

test('taboo: Harry Potter by venue / slug / title', () => {
  assert.equal(
    isHomeRailTabooSession({
      title: 'Комбо 1',
      venue: 'Музей Гарри Поттера',
      venueSlug: 'muzei-garri-pottera-683e',
      slug: 'kombo-1-abc',
    }),
    true,
  );
  assert.equal(isHomeRailTabooSession({ title: 'Harry Potter Museum tour', slug: 'hp' }), true);
  assert.equal(isHomeRailTabooSession({ title: 'Речная прогулка', venue: 'Причал Зарядье', slug: 'boat-1' }), false);
});

test('normalizeSessionImageKey: basename after strip query + size suffixes', () => {
  const a = normalizeSessionImageKey(
    'https://s3.example/teplohod/Events/Event1112/7eea401c46-1.jpg?X-Amz-Signature=abc',
  );
  const b = normalizeSessionImageKey('https://other.cdn/cache/Events/Event999/7eea401c46-1.jpg');
  assert.equal(a, b);

  const sized = normalizeSessionImageKey('https://cdn.example/boat-640x360.jpg');
  const plain = normalizeSessionImageKey('https://cdn.example/boat.jpg');
  assert.equal(sized, plain);

  const proxied = normalizeSessionImageKey(
    '/_next/image?url=https%3A%2F%2Fcdn.example%2Fboat.jpg&w=1920&q=75',
  );
  assert.equal(proxied, plain);
});

test('collectSessionImageDedupeKeys: dirtyAlias matches file basename; TC asset id', () => {
  const s3 = collectSessionImageDedupeKeys(
    'https://s3.twcstorage.ru/teplohod-public/images/cache/Events/Event1112/7eea401c46-1.jpg',
  );
  const api = collectSessionImageDedupeKeys(
    'https://api.teplohod.info/v1/image?item=Event1112&dirtyAlias=7eea401c46-1.jpg',
  );
  assert.ok(s3.some((key) => api.includes(key)), 'S3 and api.teplohod dirtyAlias share a key');

  const tc = collectSessionImageDedupeKeys(
    'https://ticketscloud-prod.storage.yandexcloud.net:443/production/image/2026-03/69bbd8ee3afe92121b0f4b0f.jpg',
  );
  assert.ok(tc.includes('tc-asset:69bbd8ee3afe92121b0f4b0f'));
});

test('editors pick: skip pinned Harry Potter and fill; skip duplicate cover basename', () => {
  const boatA =
    'https://s3.twcstorage.ru/teplohod-public/images/cache/Events/Event1112/same-boat.jpg';
  const boatB = 'https://cdn.other/uploads/same-boat.jpg?v=2';
  const sessions = [
    session({
      id: 'hp1',
      title: 'Комбо 1',
      venue: 'Музей Гарри Поттера',
      venueSlug: 'muzei-garri-pottera-x',
      slug: 'kombo-1-x',
      manualLandingStatus: 'PINNED',
      imageUrl: 'https://cdn.example/hp.png',
      sessionCount: 99,
    }),
    session({
      id: 'boat1',
      title: 'Кремлёвская прогулка A',
      venue: 'Зарядье',
      slug: 'boat-a',
      manualLandingStatus: 'PINNED',
      imageUrl: boatA,
      sessionCount: 50,
    }),
    session({
      id: 'boat2',
      title: 'Кремлёвская прогулка B',
      venue: 'Новоспасский',
      slug: 'boat-b',
      manualLandingStatus: 'PINNED',
      imageUrl: boatB,
      sessionCount: 40,
    }),
    session({
      id: 'ok1',
      title: 'Смотровая площадка',
      venue: 'Москва-Сити',
      slug: 'view-1',
      imageUrl: 'https://cdn.example/view-unique.jpg',
      sessionCount: 30,
    }),
    session({
      id: 'ok2',
      title: 'Галерея',
      venue: 'Музей',
      slug: 'gal-1',
      imageUrl: 'https://cdn.example/gal-unique.jpg',
      sessionCount: 20,
    }),
  ];

  const picked = buildEditorsPickEvents(sessions, 3, createHomePickState());
  assert.equal(picked.length, 3);
  assert.ok(!picked.some((s) => /поттер|potter|kombo-1/i.test(`${s.title} ${s.venue} ${s.slug}`)));
  assert.equal(picked[0]?.id, 'boat1');
  assert.ok(!picked.some((s) => s.id === 'boat2'), 'duplicate cover skipped');
  assert.ok(picked.some((s) => s.id === 'ok1'), 'filled from non-pinned after skip');
});

test('editors pick: skip identical binaries under different basenames via ETag fingerprint', () => {
  const sharedEtag = 'etag:8bce469feffb43dfb9538f36b15a93e5';
  const urlA = 'https://s3.twcstorage.ru/teplohod-public/images/cache/Events/Event1112/7eea401c46-1.jpg';
  const urlB = 'https://s3.twcstorage.ru/teplohod-public/images/cache/Events/Event1107/c9f7e2bdf1-1.jpeg';
  const urlC = 'https://s3.twcstorage.ru/teplohod-public/images/cache/Events/Event1111/3b332fd11b-1.jpg';
  const fingerprints = new Map([
    [urlA, sharedEtag],
    [urlB, sharedEtag],
    [urlC, sharedEtag],
  ]);

  const sessions = [
    session({
      id: 'boat1',
      title: 'Прогулка A',
      slug: 'a',
      manualLandingStatus: 'PINNED',
      imageUrl: urlA,
      sessionCount: 50,
    }),
    session({
      id: 'boat2',
      title: 'Прогулка B',
      slug: 'b',
      manualLandingStatus: 'PINNED',
      imageUrl: urlB,
      sessionCount: 40,
    }),
    session({
      id: 'boat3',
      title: 'Прогулка C',
      slug: 'c',
      manualLandingStatus: 'PINNED',
      imageUrl: urlC,
      sessionCount: 30,
    }),
    session({
      id: 'ok1',
      title: 'Уникальная',
      slug: 'ok',
      imageUrl: 'https://cdn.example/unique-other.jpg',
      sessionCount: 20,
    }),
    session({
      id: 'ok2',
      title: 'Ещё уникальная',
      slug: 'ok2',
      imageUrl: 'https://cdn.example/unique-other-2.jpg',
      sessionCount: 10,
    }),
  ];

  const picked = buildEditorsPickEvents(sessions, 3, createHomePickState({ fingerprints }));
  assert.equal(picked.length, 3);
  assert.equal(picked.filter((s) => ['boat1', 'boat2', 'boat3'].includes(s.id)).length, 1);
  assert.ok(picked.some((s) => s.id === 'ok1'));
  assert.ok(picked.some((s) => s.id === 'ok2'));
});

test('sessionHasCoverImage rejects evt-auto category gradients', () => {
  assert.equal(
    sessionHasCoverImage({ imageUrl: '/images/events/generated/evt-auto-34e6ebcbf9bd.jpg' }),
    false,
  );
  assert.equal(sessionHasCoverImage({ imageUrl: 'https://cdn.example/real.jpg' }), true);
});

test('popular / editors pick: skip evt-auto stubs so photo rails stay photographic', () => {
  const sessions = [
    session({
      id: 'stub1',
      title: 'Квест без фото',
      slug: 'quest-stub',
      imageUrl: '/images/events/generated/evt-auto-34e6ebcbf9bd.jpg',
      sessionCount: 160,
      manualLandingStatus: 'PINNED',
    }),
    session({
      id: 'photo1',
      title: 'Речная прогулка',
      slug: 'boat-photo',
      imageUrl: 'https://cdn.example/boat-real.jpg',
      sessionCount: 20,
    }),
    session({
      id: 'photo2',
      title: 'Музей',
      slug: 'museum-photo',
      imageUrl: 'https://cdn.example/museum-real.jpg',
      sessionCount: 15,
    }),
  ];

  const popular = buildPopularEvents(sessions, 4, createHomePickState());
  assert.equal(popular.some((s) => s.id === 'stub1'), false);
  assert.ok(popular.some((s) => s.id === 'photo1'));

  const editors = buildEditorsPickEvents(sessions, 4, createHomePickState());
  assert.equal(editors.some((s) => s.id === 'stub1'), false);
  assert.ok(editors.some((s) => s.id === 'photo1'));
});

test('collapseCatalogComboFamilies: one card per venue for Комбо N', () => {
  const items = [
    session({ id: 'c1', title: 'Комбо 1', venueSlug: 'museum-x', venue: 'Музей X' }),
    session({ id: 'c2', title: 'Комбо 2', venueSlug: 'museum-x', venue: 'Музей X' }),
    session({ id: 'c6', title: 'Комбо 6', venueSlug: 'museum-x', venue: 'Музей X' }),
    session({ id: 'boat', title: 'Речная прогулка', venueSlug: 'pier-1', venue: 'Причал' }),
    session({ id: 'c-other', title: 'Комбо 1', venueSlug: 'museum-y', venue: 'Музей Y' }),
  ];
  const collapsed = collapseCatalogComboFamilies(items);
  assert.equal(collapsed.map((item) => item.id).join(','), 'c1,boat,c-other');
});
