import assert from 'node:assert/strict';
import test from 'node:test';

import { isHomeRailTabooSession } from './home-rail-taboos';
import { buildEditorsPickEvents, createHomePickState } from './home-showcase-sections';
import { normalizeSessionImageKey } from './session-cover-image';

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

test('normalizeSessionImageKey: basename after strip query', () => {
  const a = normalizeSessionImageKey(
    'https://s3.example/teplohod/Events/Event1112/7eea401c46-1.jpg?X-Amz-Signature=abc',
  );
  const b = normalizeSessionImageKey(
    'https://other.cdn/cache/Events/Event999/7eea401c46-1.jpg',
  );
  assert.equal(a, 'img:7eea401c46-1.jpg');
  assert.equal(a, b);

  const proxied = normalizeSessionImageKey(
    '/_next/image?url=https%3A%2F%2Fcdn.example%2Fboat.jpg&w=1920&q=75',
  );
  assert.equal(proxied, 'img:boat.jpg');
});

test('editors pick: skip pinned Harry Potter and fill; skip duplicate cover', () => {
  const boatA =
    'https://s3.twcstorage.ru/teplohod-public/images/cache/Events/Event1112/same-boat.jpg';
  const boatB =
    'https://cdn.other/uploads/same-boat.jpg?v=2';
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
