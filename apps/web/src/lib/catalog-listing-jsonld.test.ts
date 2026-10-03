import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildBlogListJsonLd } from './blog-article-seo';
import {
  buildCollectionPageJsonLd,
  buildCityPageJsonLd,
  buildEventJsonLd,
  buildEventsCatalogItemListJsonLd,
} from './structured-data';

describe('catalog listing JSON-LD', () => {
  it('uses URL-only ListItem entries on /events', () => {
    const block = buildEventsCatalogItemListJsonLd([
      { id: 'event-1', slug: 'vecherniy-kruiz', title: 'Вечерний круиз' },
    ]);

    assert.ok(block);
    assert.equal(block['@type'], 'ItemList');
    const item = (block.itemListElement as Array<Record<string, unknown>>)[0]!;
    assert.equal(item['@type'], 'ListItem');
    assert.equal(item.url, 'https://daibilet.ru/events/vecherniy-kruiz');
    assert.equal(item.item, item.url);
    assert.equal(item['@type'], 'ListItem');
    assert.equal('startDate' in item, false);
  });

  it('nests an ItemList in the blog schema', () => {
    const block = buildBlogListJsonLd([
      {
        slug: 'guide-spb',
        title: 'Гид по Петербургу',
        excerpt: 'Маршрут на выходные.',
        coverImageUrl: '/images/blog/guide.jpg',
        readMin: 5,
        tag: 'Город',
      },
    ]);

    assert.equal(block['@type'], 'Blog');
    const list = block.mainEntity as Record<string, unknown>;
    assert.equal(list['@type'], 'ItemList');
    assert.equal(list.numberOfItems, 1);
  });

  it('nests collection links in CollectionPage', () => {
    const block = buildCollectionPageJsonLd({
      name: 'Подборки',
      description: 'Готовые планы.',
      canonicalPath: '/podborki',
      items: [{ name: 'На выходные', path: '/podborki/na-vyhodnye' }],
    });

    assert.equal(block['@type'], 'CollectionPage');
    assert.equal(block.url, 'https://daibilet.ru/podborki');
    const list = block.mainEntity as Record<string, unknown>;
    assert.equal(list['@type'], 'ItemList');
    assert.equal(list.numberOfItems, 1);
  });

  it('keeps Event facts on the detail schema and uses the canonical offer URL', () => {
    const block = buildEventJsonLd({
      event: {
        id: 'e1',
        slug: 'concert-1',
        title: 'Концерт',
        city: 'Москва',
        venue: 'Клуб',
        venueKind: 'institution',
        category: 'Концерты',
        tags: [],
        eventType: 'EVENT',
        purchaseUrl: 'https://provider.example/widget',
      },
      sessions: [
        {
          id: 's1',
          eventId: 'e1',
          startsAt: '2026-10-15T19:00:00+03:00',
          endsAt: '2026-10-15T21:00:00+03:00',
          dateLabel: '15 октября',
          timeLabel: '19:00',
          priceFrom: 1200,
        },
      ],
      offers: [],
      related: [],
      landings: [],
      stats: { sessions: 1, priceFrom: 1200 },
    } as any);

    assert.equal(block['@type'], 'Event');
    assert.equal(block.startDate, '2026-10-15T19:00:00+03:00');
    assert.equal(block.endDate, '2026-10-15T21:00:00+03:00');
    assert.equal(
      (block.offers as Record<string, unknown>).url,
      'https://daibilet.ru/events/concert-1',
    );
  });

  it('uses the next future session for Event markup when older sessions remain in the API response', () => {
    const block = buildEventJsonLd({
      event: { id: 'e1', slug: 'concert-1', title: 'Концерт', city: 'Москва', tags: [] },
      sessions: [
        { id: 'past', startsAt: '2000-01-01T19:00:00Z', endsAt: '2000-01-01T21:00:00Z' },
        { id: 'later', startsAt: '2099-01-02T19:00:00Z', endsAt: '2099-01-02T21:00:00Z' },
        { id: 'next', startsAt: '2099-01-01T19:00:00Z', endsAt: '2099-01-01T21:00:00Z' },
      ],
      offers: [], related: [], landings: [], stats: {},
    } as any);
    assert.equal(block.startDate, '2099-01-01T19:00:00Z');
  });

  it('describes a city and its places with structured context', () => {
    const blocks = buildCityPageJsonLd({
      city: {
        id: 'c1',
        slug: 'moscow',
        name: 'Москва',
        title: 'Москва',
        type: 'city',
        events: 10,
        venues: 1,
        categories: {},
      },
      sessions: [],
      venues: [
        {
          id: 'v1',
          slug: 'club',
          name: 'Клуб',
          city: 'Москва',
          address: 'ул. Примерная, 1',
          type: 'club_bar_restaurant',
          events: 2,
          categories: {},
        },
      ],
      landings: [],
      stats: { events: 10, venues: 1, categories: 1 },
    } as any);

    const city = blocks.find((block) => block['@type'] === 'City')!;
    assert.equal((city.containedInPlace as Record<string, unknown>)['@type'], 'Country');
    const list = blocks.find((block) => block['@type'] === 'ItemList' && block.name === 'Места и площадки: Москва')!;
    assert.equal(list.url, 'https://daibilet.ru/places/c/moscow');
    assert.equal(list.numberOfItems, 1);
    const item = (list.itemListElement as Array<Record<string, any>>)[0]!;
    assert.equal(item.item['@type'], 'Place');
    assert.equal(item.item.address.addressLocality, 'Москва');
  });

  it('marks only the venues shown in the city hub selection', () => {
    const blocks = buildCityPageJsonLd({
      city: { id: 'c1', slug: 'moscow', name: 'Москва', type: 'city', events: 10, venues: 20, categories: {} },
      sessions: [],
      venues: Array.from({ length: 20 }, (_, index) => ({
        id: `v${index}`, slug: `venue-${index}`, name: `Место ${index}`,
        city: 'Москва', type: 'museum', events: 1, categories: {},
      })),
      landings: [],
      stats: { events: 10, venues: 20, categories: 1 },
    } as any);
    const list = blocks.find((block) => block['@type'] === 'ItemList' && block.name === 'Места и площадки: Москва')!;
    assert.equal(list.numberOfItems, 12);
    assert.equal((list.itemListElement as unknown[]).length, 12);
  });
});
