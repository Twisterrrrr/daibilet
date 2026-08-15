import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cityHubSessionHitScore,
  filterStandupFromAllFeed,
  groupStandupInHubFeed,
  isCityHubTouristAffiche,
  preferredAfficheCategory,
  rankCityHubSessions,
  visibleAfficheCategories,
} from './city-hub-affiche.ts';

test('tourist affiche cities include Perm aliases via normalized slugs', () => {
  assert.equal(isCityHubTouristAffiche('perm'), true);
  assert.equal(isCityHubTouristAffiche('moskva'), true);
  assert.equal(isCityHubTouristAffiche('sankt-peterburg'), true);
  assert.equal(isCityHubTouristAffiche('moscow'), true);
  assert.equal(isCityHubTouristAffiche('ekaterinburg'), true);
  assert.equal(isCityHubTouristAffiche('kazan'), true);
  assert.equal(isCityHubTouristAffiche('samara'), true);
  assert.equal(isCityHubTouristAffiche('krasnodar'), true);
});

test('tourist score puts excursions and theater above standup', () => {
  const excursion = { title: 'Обзорная по Каме', category: 'Экскурсии' };
  const theater = { title: 'Балет в Театр-Театре', category: 'Театр' };
  const standup = { title: 'Стендап в баре Вмясо', category: 'Мероприятия' };
  assert.ok(cityHubSessionHitScore(excursion) > cityHubSessionHitScore(theater));
  assert.ok(cityHubSessionHitScore(theater) > cityHubSessionHitScore(standup));
  const ranked = rankCityHubSessions([standup, theater, excursion]);
  assert.equal(ranked[0]?.category, 'Экскурсии');
  assert.equal(ranked[1]?.category, 'Театр');
  assert.equal(ranked[2]?.title, standup.title);
});

test('default chip is All for tourist and regular hubs', () => {
  const categories = visibleAfficheCategories(
    [
      { category: 'Мероприятия', title: 'Стендап 1' },
      { category: 'Мероприятия', title: 'Стендап 2' },
      { category: 'Мероприятия', title: 'Стендап 3' },
      { category: 'Экскурсии', title: 'Хохловка' },
      { category: 'Музеи и арт', title: 'Одна выставка' },
    ],
    { tourist: true },
  );
  assert.equal(categories[0]?.[0], 'Экскурсии');
  assert.equal(
    categories.some(([name]) => name === 'Музеи и арт'),
    false,
  );
  assert.equal(preferredAfficheCategory(categories, { tourist: true }), 'all');
  assert.equal(preferredAfficheCategory(categories, { tourist: false }), 'all');
});

test('All feed on tourist hubs drops standup; category chips keep it', () => {
  const sessions = [
    { id: 'e1', title: 'Обзорная', category: 'Экскурсии' },
    { id: 's1', title: 'Стендап пятница', category: 'Мероприятия' },
    { id: 's2', title: 'Стендап суббота', category: 'Мероприятия' },
  ];
  const all = filterStandupFromAllFeed(sessions, 'all', { tourist: true });
  assert.deepEqual(
    all.map((s) => s.id),
    ['e1'],
  );
  const events = filterStandupFromAllFeed(sessions, 'Мероприятия', { tourist: true });
  assert.equal(events.length, 3);
  assert.equal(filterStandupFromAllFeed(sessions, 'all', { tourist: false }).length, 3);
});

test('three or more standup cards collapse into one widget at the end', () => {
  const rows = groupStandupInHubFeed([
    { id: 'e1', title: 'Река', category: 'Экскурсии' },
    { id: 's1', title: 'Стендап пятница', category: 'Мероприятия', venue: 'Stand-Up клуб' },
    { id: 's2', title: 'Стендап суббота', category: 'Мероприятия', venue: 'Stand-Up клуб' },
    { id: 's3', title: 'Открытый микрофон', category: 'Мероприятия', venue: 'Stand-Up клуб' },
    { id: 's4', title: 'Comedy night', category: 'Мероприятия', venue: 'Другой бар' },
  ]);
  assert.equal(rows[0]?.kind, 'event');
  if (rows[0]?.kind === 'event') assert.equal(rows[0].session.id, 'e1');
  const series = rows.filter((row) => row.kind === 'standup');
  assert.equal(series.length, 1);
  if (series[0]?.kind === 'standup') {
    assert.equal(series[0].sessions.length, 4);
    assert.equal(series[0].venueName, 'Stand-Up клуб');
  }
});

test('two standup cards stay as ordinary events', () => {
  const rows = groupStandupInHubFeed([
    { id: 's1', title: 'Стендап', category: 'Мероприятия' },
    { id: 's2', title: 'Стендап 2', category: 'Мероприятия' },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows.every((row) => row.kind === 'event'), true);
});
