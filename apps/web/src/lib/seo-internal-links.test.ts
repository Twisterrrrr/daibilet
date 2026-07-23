import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getFooterPopularDirections,
  resolveEventLandingForBreadcrumb,
  resolveRelatedListingLinks,
} from './seo-internal-links';
import {
  buildEventBreadcrumbs,
  buildEventPageJsonLd,
  buildLandingPageJsonLd,
  buildVenuePageJsonLd,
} from './structured-data';
import { transliterateSlug } from './routes';

describe('seo-internal-links', () => {
  it('footer popular directions use real CHPU and intent paths', () => {
    const blocks = getFooterPopularDirections();
    const msk = blocks.find((b) => b.citySlug === 'moscow');
    const spb = blocks.find((b) => b.citySlug === 'saint-petersburg');
    assert.ok(msk);
    assert.ok(spb);
    assert.equal(msk!.links[0].href, '/rechnye-progulki/moscow/');
    assert.equal(msk!.links[3].href, '/podborki/besplatno/moscow');
    assert.equal(spb!.links[1].href, '/progulki-po-krysham/saint-petersburg/');
    assert.equal(spb!.links[3].href, '/podborki/na-vyhodnye/saint-petersburg');
  });

  it('related links for river SPB are city-scoped', () => {
    const links = resolveRelatedListingLinks('river-cruises', 'saint-petersburg');
    assert.ok(links.length >= 3);
    assert.ok(links.some((l) => l.href.includes('/progulki-po-krysham/saint-petersburg')));
    assert.ok(links.some((l) => l.href.includes('/podborki/na-vyhodnye/saint-petersburg')));
  });

  it('event breadcrumb picks standup landing', () => {
    const match = resolveEventLandingForBreadcrumb({
      landingSlugs: ['standup', 'excursions'],
      citySlug: 'sankt-peterburg',
      category: 'Развлечения',
      tags: ['Юмор'],
      title: 'Стендап концерт',
    });
    assert.ok(match);
    assert.equal(match!.landingSlug, 'standup');
    assert.equal(match!.href, '/stendap-i-yumor/saint-petersburg/');
    assert.equal(match!.label, 'Стендап и юмор');
  });
});

describe('structured-data landing/event', () => {
  it('event breadcrumbs go Home → City → Landing → Title', () => {
    const crumbs = buildEventBreadcrumbs({
      id: '1',
      slug: 'standup-show',
      title: 'Стендап шоу',
      category: 'Развлечения',
      tags: ['Юмор'],
      city: 'Санкт-Петербург',
      citySlug: 'sankt-peterburg',
      venue: 'Клуб',
      venueKind: 'institution',
      eventType: 'EVENT',
      landingSlugs: ['standup'],
    } as any);
    assert.deepEqual(
      crumbs.map((c) => c.name),
      ['Главная', 'Санкт-Петербург', 'Стендап и юмор', 'Стендап шоу'],
    );
    assert.equal(crumbs[0].path, '/');
    assert.equal(crumbs[1].path, '/cities/sankt-peterburg');
    assert.equal(crumbs[2].path, '/stendap-i-yumor/saint-petersburg/');
  });

  it('landing JSON-LD omits ItemList when empty', () => {
    const blocks = buildLandingPageJsonLd({
      landingSlug: 'river-cruises',
      citySlug: 'saint-petersburg',
      landingTitle: 'Речные прогулки',
      canonicalPath: '/rechnye-progulki/saint-petersburg/',
      sessions: [],
    });
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0]['@type'], 'BreadcrumbList');
  });

  it('landing JSON-LD includes ItemList when sessions exist', () => {
    const blocks = buildLandingPageJsonLd({
      landingSlug: 'river-cruises',
      citySlug: 'saint-petersburg',
      landingTitle: 'Речные прогулки',
      canonicalPath: '/rechnye-progulki/saint-petersburg/',
      sessions: [{ id: 'e1', slug: 'cruise-1', title: 'Круиз', sourceSlug: null }],
    });
    assert.equal(blocks.length, 2);
    assert.equal(blocks[1]['@type'], 'ItemList');
    assert.equal((blocks[1] as any).numberOfItems, 1);
  });

  it('venue JSON-LD includes Place with address and geo', () => {
    const blocks = buildVenuePageJsonLd({
      ok: true,
      venue: {
        id: 'v1',
        slug: 'ermitage',
        name: 'Эрмитаж',
        title: 'Эрмитаж',
        city: 'Санкт-Петербург',
        address: 'Дворцовая наб., 34',
        latitude: 59.9398,
        longitude: 30.3146,
        type: 'institution',
        events: 12,
        categories: {},
      },
      sessions: [],
      relatedVenues: [],
      stats: { events: 12, categories: 1 },
    } as any);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0]['@type'], 'Place');
    assert.equal(blocks[0].url, 'https://daibilet.ru/venues/ermitage');
    assert.equal((blocks[0].address as any).streetAddress, 'Дворцовая наб., 34');
    assert.equal((blocks[0].geo as any).latitude, 59.9398);
    assert.equal(blocks[1]['@type'], 'BreadcrumbList');
  });

  it('location venue breadcrumbs and Place use /locations', () => {
    const blocks = buildVenuePageJsonLd({
      ok: true,
      venue: {
        id: 'v2',
        slug: 'prichal-admiralteyskaya',
        name: 'Причал Адмиралтейская',
        city: 'Санкт-Петербург',
        type: 'location',
        events: 5,
        categories: {},
      },
      sessions: [],
      relatedVenues: [],
      stats: { events: 5, categories: 1 },
    } as any);
    assert.equal(blocks[0]['@type'], 'Place');
    assert.equal(blocks[0].url, 'https://daibilet.ru/locations/prichal-admiralteyskaya');
    const crumbNames = ((blocks[1] as any).itemListElement || []).map((item: any) => item.name);
    assert.equal(crumbNames[1], 'Локации');
  });

  it('event JSON-LD Place links to venue CHPU when slug present', () => {
    const blocks = buildEventPageJsonLd({
      ok: true,
      event: {
        id: 'e1',
        slug: 'standup-show',
        title: 'Стендап шоу',
        category: 'Развлечения',
        tags: [],
        city: 'Москва',
        citySlug: 'moskva',
        venue: 'Клуб',
        venueId: 'v9',
        venueSlug: 'klub-standupa',
        venueAddress: 'ул. Тверская, 1',
        venueKind: 'institution',
        eventType: 'EVENT',
        landingSlugs: [],
        priceFrom: 1500,
      },
      sessions: [{ id: 's1', eventId: 'e1', startsAt: '2026-08-01T19:00:00+03:00' }],
      offers: [],
      related: [],
      landings: [],
      stats: { sessions: 1, priceFrom: 1500 },
    } as any);
    assert.equal(blocks[0]['@type'], 'Event');
    assert.equal((blocks[0].location as any).url, 'https://daibilet.ru/venues/klub-standupa');
    assert.equal((blocks[0].offers as any).price, '1500');
  });
});

describe('transliterateSlug', () => {
  it('transliterates cyrillic titles for CHPU', () => {
    assert.equal(transliterateSlug('Санкт-Петербург'), 'sankt-peterburg');
    assert.equal(transliterateSlug('Эрмитаж'), 'ermitazh');
  });
});