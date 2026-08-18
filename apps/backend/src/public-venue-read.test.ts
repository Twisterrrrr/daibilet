import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPublicVenueHub,
  lookupVenueCatalogSessionsForTest,
  mergeCityPageVenues,
  mergePublicVenueHubRows,
  publicVenueRowMatchesCityFilter,
  publicVenuesForSessionsFromHub,
  resolvePublicVenueCanonicalPath,
  resolvePublicVenueKind,
  scoreRelatedVenueCandidate,
  venueTextKeysFuzzyMatch,
} from './public-venue-read.js';

test('mergeCityPageVenues prefers content/editorial then appends session venues', () => {
  const merged = mergeCityPageVenues(
    [{ id: 'v1', slug: 'hall-a', name: 'Hall', latitude: null, longitude: null }],
    [
      { id: 'v2', slug: 'nizhny-novgorod-nizhegorodskaya-yarmarka', name: 'Ярмарка', latitude: 56.3, longitude: 43.9 },
      { id: 'v1-dup', slug: 'hall-a', name: 'Hall again', latitude: 1, longitude: 2 },
    ],
    10,
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].slug, 'nizhny-novgorod-nizhegorodskaya-yarmarka');
  assert.equal(merged[1].slug, 'hall-a');
  assert.equal(merged[0].latitude, 56.3);
});

test('publicVenuesForSessionsFromHub matches hub rows by venueId and slug', () => {
  const hubRows = [
    {
      id: 'venue_5ea93efb186c38b2a9d379bd',
      slug: 'мега-кружка-5ea93efb186c38b2a9d379bd',
      name: 'Мега Кружка',
      title: 'Мега Кружка',
      city: 'Мурманск',
      kind: 'CONCERT_HALL',
      pageStatus: 'candidate',
      events: 2,
      mergedVenueIds: ['venue_5ea93efb186c38b2a9d379bd'],
    },
  ];
  const byId = publicVenuesForSessionsFromHub(
    [{ venueId: 'venue_5ea93efb186c38b2a9d379bd', venueSlug: 'mega-kruzhka' }],
    hubRows,
    24,
  );
  assert.equal(byId.length, 1);
  assert.equal(byId[0]?.id, 'venue_5ea93efb186c38b2a9d379bd');

  const bySlug = publicVenuesForSessionsFromHub(
    [{ venueSlug: 'mega-kruzhka', venue: 'Мега Кружка' }],
    hubRows,
    24,
  );
  assert.equal(bySlug.length, 1);
});

test('publicVenueRowMatchesCityFilter accepts nizhny aliases and slug prefix', () => {
  const row = {
    city: 'Нижний Новгород',
    citySlug: 'нижнии-новгород',
    slug: 'nizhny-novgorod-nizhegorodskaya-yarmarka',
  };
  assert.equal(publicVenueRowMatchesCityFilter(row, 'nizhny-novgorod'), true);
  assert.equal(publicVenueRowMatchesCityFilter(row, 'nizhniy-novgorod'), true);
  assert.equal(publicVenueRowMatchesCityFilter(row, 'нижнии-новгород'), true);
  assert.equal(publicVenueRowMatchesCityFilter(row, 'moscow'), false);
});

test('isPublicVenueHub basic gate', () => {
  assert.equal(isPublicVenueHub(null), false);
  assert.equal(
    isPublicVenueHub({
      id: 'v1',
      name: 'Зал',
      kind: 'CONCERT_HALL',
      pageStatus: 'published',
      events: 3,
    }),
    true,
  );
  assert.equal(
    isPublicVenueHub({
      id: 'v2',
      name: 'Скрытая',
      kind: 'CONCERT_HALL',
      pageStatus: 'HIDDEN',
      events: 5,
    }),
    false,
  );
  assert.equal(
    isPublicVenueHub({
      id: 'v3',
      name: 'Точка сбора у метро',
      kind: 'MEETING_POINT',
      pageStatus: 'published',
      events: 2,
      busEvents: 0,
    }),
    false,
  );
});

test('resolvePublicVenueCanonicalPath drops mismatched location/venues family', () => {
  assert.equal(
    resolvePublicVenueCanonicalPath(
      '/locations/cerkov-svyatogo-apostola-ioanna-yaani-kirik',
      'institution',
      'cerkov-svyatogo-apostola-ioanna-yaani-kirik',
    ),
    '/venues/cerkov-svyatogo-apostola-ioanna-yaani-kirik',
  );
  assert.equal(
    resolvePublicVenueCanonicalPath(
      '/locations/cerkov-svyatogo-apostola-ioanna-yaani-kirik',
      'location',
      'cerkov-svyatogo-apostola-ioanna-yaani-kirik',
    ),
    '/locations/cerkov-svyatogo-apostola-ioanna-yaani-kirik',
  );
  assert.equal(
    resolvePublicVenueCanonicalPath(null, 'location', 'park-a'),
    '/locations/park-a',
  );
});

test('venueTextKeysFuzzyMatch rejects bare Музей against longer museum titles', () => {
  assert.equal(venueTextKeysFuzzyMatch('музей', 'музей истории мотовилихинских заводов'), false);
  assert.equal(venueTextKeysFuzzyMatch('музей', 'музей пермских древностей'), false);
  assert.equal(
    venueTextKeysFuzzyMatch(
      'музей истории мотовилихинских заводов',
      'музей истории мотовилихинских заводов',
    ),
    true,
  );
  assert.equal(
    venueTextKeysFuzzyMatch(
      'музей живописца бориса семенова',
      'музей живописца бориса семенова зал 1',
    ),
    true,
  );
});

test('lookupVenueCatalogSessions does not attach Sortavala Музей session to Perm museums', () => {
  const sortavalaSession = {
    id: 'sess-sortavala',
    title: 'Экскурсия в галерею «Золотой век СССР»',
    venue: 'Музей',
    venueSlug: 'muzei-6a3c4d6383b8d636bb8567dd',
    venueId: 'venue_6a3c4d6383b8d636bb8567dd',
    city: 'Сортавала',
    startsAt: '2026-08-10T06:00:00.000Z',
  };
  const childHallSession = {
    id: 'sess-child',
    title: 'Local tour',
    venue: 'Музей истории Мотовилихинских заводов Холл',
    venueSlug: 'perm-muzey-motovilihinskih-zavodov-holl',
    venueId: 'venue_child',
    city: 'Пермь',
    startsAt: '2026-08-11T06:00:00.000Z',
  };
  const matched = lookupVenueCatalogSessionsForTest(
    ['venue_perm_motov'],
    [sortavalaSession, childHallSession],
    [
      {
        id: 'venue_perm_motov',
        slug: 'perm-muzey-motovilihinskih-zavodov',
        title: 'Музей истории Мотовилихинских заводов',
        name: 'Музей истории Мотовилихинских заводов',
      },
    ],
  );
  assert.equal(matched.some((s: { id: string }) => s.id === 'sess-sortavala'), false);
  assert.equal(matched.some((s: { id: string }) => s.id === 'sess-child'), true);

  const drevnosti = lookupVenueCatalogSessionsForTest(
    ['venue_perm_drev'],
    [sortavalaSession],
    [
      {
        id: 'venue_perm_drev',
        slug: 'perm-muzey-permskikh-drevnostey',
        title: 'Музей пермских древностей',
        name: 'Музей пермских древностей',
      },
    ],
  );
  assert.equal(drevnosti.length, 0);
});

test('scoreRelatedVenueCandidate keeps museums away from standup clubs', () => {
  assert.ok(
    scoreRelatedVenueCandidate('museum', 'Эрмитаж', 'museum', 'Русский музей', 3) >
      scoreRelatedVenueCandidate('museum', 'Эрмитаж', 'attraction', 'Исаакиевский собор', 1),
  );
  assert.ok(scoreRelatedVenueCandidate('museum', 'Эрмитаж', 'attraction', 'Кунсткамера', 0) > 0);
  assert.equal(scoreRelatedVenueCandidate('museum', 'Эрмитаж', 'club_bar_restaurant', 'Stage StandUp Club', 40), -1);
  assert.equal(scoreRelatedVenueCandidate('museum', 'Эрмитаж', 'bar', 'POPRAVKA BAR', 10), -1);
  assert.equal(scoreRelatedVenueCandidate('museum', 'Эрмитаж', 'theater', 'Дом Шрёдера', 5), -1);
});

test('resolvePublicVenueKind maps cathedrals to temple public kind', () => {
  assert.equal(resolvePublicVenueKind('ATTRACTION', 'Исаакиевский собор', 'СПб'), 'temple');
  assert.equal(resolvePublicVenueKind('OUTDOOR_LOCATION', 'Знаменский кафедральный собор', null), 'temple');
  assert.equal(resolvePublicVenueKind('ATTRACTION', 'Петропавловская крепость', 'СПб'), 'attraction');
  assert.equal(resolvePublicVenueKind('ATTRACTION', 'Бункер-42 на Таганке', 'Москва'), 'attraction');
});

test('saleable fortress is one museum card, not a parallel sight', () => {
  assert.equal(
    resolvePublicVenueKind('ATTRACTION', 'Петропавловская крепость', 'СПб', { totalEvents: 1 }),
    'museum',
  );
  assert.equal(
    resolvePublicVenueKind(
      'MUSEUM_ART_SPACE',
      'Петропавловская крепость. Алексеевский равелин (внутренняя территория, ближе к пляжу со стороны Кронверкского пролива)',
      'СПб',
      { totalEvents: 1 },
    ),
    'museum',
  );

  const merged = mergePublicVenueHubRows([
    {
      id: 'venue_fortress_sight',
      slug: 'saint-petersburg-petropavlovskaya-krepost',
      name: 'Петропавловская крепость',
      title: 'Петропавловская крепость',
      city: 'Санкт-Петербург',
      address: 'Территория Петропавловская Крепость, 3',
      kind: 'ATTRACTION',
      events: 0,
      pageStatus: 'PUBLISHED',
    },
    {
      id: 'venue_ravelin_museum',
      slug: 'alekseevskiy-ravelin',
      name: 'Петропавловская крепость. Алексеевский равелин (внутренняя территория, ближе к пляжу со стороны Кронверкского пролива)',
      title: 'Петропавловская крепость. Алексеевский равелин (внутренняя территория, ближе к пляжу со стороны Кронверкского пролива)',
      city: 'Санкт-Петербург',
      address: 'ул. территория Петропавловская крепость, дом 3У',
      kind: 'MUSEUM_ART_SPACE',
      events: 1,
      pageStatus: 'CANDIDATE',
    },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.name, 'Петропавловская крепость');
  assert.equal(String(merged[0]?.kind).toUpperCase(), 'MUSEUM_ART_SPACE');
  assert.equal(merged[0]?.events, 1);
  assert.equal(merged[0]?.mergedVenueIds?.length, 2);
});

test('saleable museum-like attraction moves to museum, plain sight stays attraction', () => {
  assert.equal(
    resolvePublicVenueKind('ATTRACTION', 'Екатерининский дворец', 'Пушкин, Садовая ул., 7', { totalEvents: 3 }),
    'museum',
  );
  assert.equal(
    resolvePublicVenueKind('ATTRACTION', 'Дворцовая площадь', 'Санкт-Петербург', { totalEvents: 3 }),
    'attraction',
  );
  assert.equal(
    resolvePublicVenueKind('ATTRACTION', 'Екатерининский дворец', 'Пушкин, Садовая ул., 7', { totalEvents: 0 }),
    'attraction',
  );
});
