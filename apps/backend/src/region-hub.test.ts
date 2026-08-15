import assert from 'node:assert/strict';
import {
  buildCityRegionNearby,
  buildRegionHubEnrichment,
  regionChildEventsTotal,
  resolveRegionLiveTier,
} from './region-hub.ts';

assert.equal(resolveRegionLiveTier(0), 'C');
assert.equal(resolveRegionLiveTier(2), 'C');
assert.equal(resolveRegionLiveTier(3), 'B');
assert.equal(resolveRegionLiveTier(9), 'B');
assert.equal(resolveRegionLiveTier(10), 'A');

const enrichment = buildRegionHubEnrichment({
  regionName: 'Ленинградская область',
  regionSlug: 'leningradskaya-oblast',
  sessions: [
    { city: 'Выборг', id: '1', slug: 'a', title: 'A', category: 'x', tags: [], venue: 'v', venueKind: 'OTHER', eventType: 'e', landingSlugs: [], destinationType: 'region' },
    { city: 'Выборг', id: '2', slug: 'b', title: 'B', category: 'x', tags: [], venue: 'v', venueKind: 'OTHER', eventType: 'e', landingSlugs: [], destinationType: 'region' },
    { city: 'Всеволожск', id: '3', slug: 'c', title: 'C', category: 'x', tags: [], venue: 'v', venueKind: 'OTHER', eventType: 'e', landingSlugs: [], destinationType: 'region' },
  ] as any,
  destinations: [
    {
      name: 'Санкт-Петербург',
      slug: 'sankt-peterburg',
      type: 'city',
      events: 900,
      venues: 100,
      categories: [],
    },
  ],
});

assert.equal(enrichment.centerCity?.name, 'Санкт-Петербург');
assert.equal(enrichment.liveTier, 'B');
assert.ok(enrichment.regionInfo?.brief);
assert.equal((enrichment.regionInfo?.topPlaces || []).length, 0);
assert.ok((enrichment.regionInfo?.faq || []).length >= 1);
assert.equal(regionChildEventsTotal(enrichment.childCities.filter((c) => c.eventCount > 0)), 3);

const nearbyC = buildCityRegionNearby({
  cityName: 'Екатеринбург',
  citySlug: 'ekaterinburg',
  regionSessions: [
    {
      id: '991',
      slug: 'nurminskiy',
      title: 'Нурминский',
      city: 'Нижний Тагил',
      venue: 'Бар «Гора»',
      startsAt: '2026-10-04T19:00:00+05:00',
      dateLabel: '4 октября',
      priceFrom: 940,
      category: 'x',
      tags: [],
      venueKind: 'OTHER',
      eventType: 'e',
      landingSlugs: [],
      destinationType: 'region',
      destination: 'Свердловская область',
      timeBucket: 'evening',
      timeLabel: '19:00',
    },
  ] as any,
});
assert.ok(nearbyC);
assert.equal(nearbyC?.tier, 'C');
assert.equal(nearbyC?.title, 'Рядом с городом: события Свердловской области');
assert.doesNotMatch(String(nearbyC?.title || ''), /Все события региона|события в /);

const nearbyB = buildCityRegionNearby({
  cityName: 'Екатеринбург',
  citySlug: 'ekaterinburg',
  regionSessions: Array.from({ length: 4 }, (_, i) => ({
    id: String(i),
    slug: `e-${i}`,
    title: `Event ${i}`,
    city: 'Нижний Тагил',
    venue: 'Venue',
    startsAt: '2026-10-04T19:00:00+05:00',
    dateLabel: '4 октября',
    priceFrom: 900,
    category: 'x',
    tags: [],
    venueKind: 'OTHER',
    eventType: 'e',
    landingSlugs: [],
    destinationType: 'region',
    destination: 'Свердловская область',
    timeBucket: 'evening',
    timeLabel: '19:00',
  })) as any,
});
assert.equal(nearbyB, null);

console.log('region live tier + strip gate ok');
