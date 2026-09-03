import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isConcertLike,
  isKidsLike,
  isRiverLike,
  normalizeRelatedTitleKey,
  pickRelatedSessions,
  relatedProductKey,
  scoreRelatedSession,
} from './event-related.js';

test('related product key collapses same title across times', () => {
  const a = relatedProductKey({
    title: 'Северная Венеция - реки и каналы в мини-группе до 11 человек.',
    city: 'Санкт-Петербург',
    startsAt: '2026-09-17T10:30:00+03:00',
  });
  const b = relatedProductKey({
    title: 'Северная Венеция - реки и каналы в мини-группе до 11 человек.',
    city: 'Санкт-Петербург',
    startsAt: '2026-09-20T13:30:00+03:00',
  });
  assert.equal(a, b);
  assert.match(normalizeRelatedTitleKey(a.split('|')[0]), /северная венеция/);
});

test('kids river drops concerts and keeps river peers', () => {
  const event = {
    title: 'Детский интерактивный спектакль-круиз Кругосветное путешествие',
    category: 'Мероприятия',
    city: 'Санкт-Петербург',
    cityId: 'city_spb',
    tags: ['дети', 'круиз'],
    ageLimit: 6,
  };
  assert.equal(isKidsLike(event), true);
  assert.equal(isRiverLike(event), true);

  const concert = {
    title: 'The Prodigy & The Chemical Brothers | The Amplifiers',
    category: 'Мероприятия',
    city: 'Санкт-Петербург',
    cityId: 'city_spb',
    tags: ['концерт'],
  };
  assert.equal(isConcertLike(concert), true);
  assert.equal(scoreRelatedSession(event, concert), 0);

  const river = {
    title: 'Речная прогулка по каналам',
    category: 'Экскурсии',
    city: 'Санкт-Петербург',
    cityId: 'city_spb',
    tags: ['речная'],
    venueKind: 'PIER',
  };
  assert.ok(scoreRelatedSession(event, river) > 0);
});

test('pickRelatedSessions dedupes title and keeps city', () => {
  const event = {
    title: 'Детский круиз',
    category: 'Мероприятия',
    city: 'Санкт-Петербург',
    cityId: 'city_spb',
    tags: ['дети', 'круиз'],
    ageLimit: 6,
  };
  const catalog = [
    {
      id: '1',
      title: 'Северная Венеция',
      category: 'Экскурсии',
      city: 'Санкт-Петербург',
      cityId: 'city_spb',
      tags: ['речная'],
      startsAt: '2026-09-17T10:00:00+03:00',
    },
    {
      id: '2',
      title: 'Северная Венеция',
      category: 'Экскурсии',
      city: 'Санкт-Петербург',
      cityId: 'city_spb',
      tags: ['речная'],
      startsAt: '2026-09-20T13:00:00+03:00',
    },
    {
      id: '3',
      title: 'Birth Of The Monolith Москва',
      category: 'Мероприятия',
      city: 'Москва',
      cityId: 'city_msk',
      tags: ['концерт'],
      startsAt: '2026-11-07T19:00:00+03:00',
    },
  ];
  const related = pickRelatedSessions(event, catalog, [], () => [], 12);
  assert.equal(related.length, 1);
  assert.equal(related[0].id, '1');
});
