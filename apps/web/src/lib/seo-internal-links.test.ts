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
  it('footer popular directions keep only selected city (hide foreign)', () => {
    const spbOnly = getFooterPopularDirections('saint-petersburg');
    assert.equal(spbOnly.length, 1);
    assert.equal(spbOnly[0]?.citySlug, 'saint-petersburg');
    const mskOnly = getFooterPopularDirections('moscow');
    assert.equal(mskOnly.length, 1);
    assert.equal(mskOnly[0]?.citySlug, 'moscow');
    const otherCity = getFooterPopularDirections('kaliningrad');
    assert.equal(otherCity.length, 0);
    const national = getFooterPopularDirections();
    assert.equal(national.length, 2);
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
        citySlug: 'sankt-peterburg',
        address: 'Дворцовая наб., 34',
        latitude: 59.9398,
        longitude: 30.3146,
        type: 'museum_art_space',
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
    const crumbNames = ((blocks[1] as any).itemListElement || []).map((item: any) => item.name);
    assert.deepEqual(crumbNames, ['Главная', 'Санкт-Петербург', 'Музеи', 'Эрмитаж']);
  });

  it('location venue breadcrumbs are city-first with type plural', () => {
    const blocks = buildVenuePageJsonLd({
      ok: true,
      venue: {
        id: 'v2',
        slug: 'prichal-admiralteyskaya',
        name: 'Причал Адмиралтейская',
        city: 'Санкт-Петербург',
        citySlug: 'sankt-peterburg',
        type: 'pier',
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
    assert.deepEqual(crumbNames, ['Главная', 'Санкт-Петербург', 'Причалы', 'Причал Адмиралтейская']);
  });

  it('admin-center venue breadcrumbs skip region (Tula)', () => {
    const blocks = buildVenuePageJsonLd({
      ok: true,
      venue: {
        id: 'v3',
        slug: 'muzey-tula',
        name: 'Музей оружия',
        city: 'Тула',
        citySlug: 'tula',
        regionSlug: 'tulskaya-oblast',
        regionTitle: 'Тульская область',
        type: 'museum_art_space',
        events: 3,
        categories: {},
        canonicalPath: '/venues/muzey-tula',
      },
      sessions: [],
      relatedVenues: [],
      stats: { events: 3, categories: 1 },
    } as any);
    const crumbs = (blocks[1] as any).itemListElement || [];
    assert.deepEqual(
      crumbs.map((item: any) => item.name),
      ['Главная', 'Тула', 'Музеи', 'Музей оружия'],
    );
    assert.equal(crumbs[2].item, 'https://daibilet.ru/places?type=museum&city=%D0%A2%D1%83%D0%BB%D0%B0');
  });

  it('non-admin small town breadcrumbs insert region before city', () => {
    const blocks = buildVenuePageJsonLd({
      ok: true,
      venue: {
        id: 'v3b',
        slug: 'muzey-aleksin',
        name: 'Музей Алексина',
        city: 'Алексин',
        citySlug: 'aleksin',
        regionSlug: 'tulskaya-oblast',
        regionTitle: 'Тульская область',
        type: 'museum',
        events: 1,
        categories: {},
        canonicalPath: '/venues/muzey-aleksin',
      },
      sessions: [],
      relatedVenues: [],
      stats: { events: 1, categories: 1 },
    } as any);
    const crumbs = (blocks[1] as any).itemListElement || [];
    assert.deepEqual(
      crumbs.map((item: any) => item.name),
      ['Главная', 'Тульская область', 'Алексин', 'Музеи', 'Музей Алексина'],
    );
    assert.equal(crumbs[1].item, 'https://daibilet.ru/cities/tulskaya-oblast');
  });

  it('moscow venue breadcrumbs skip region; type crumb is ?type=museum', () => {
    const blocks = buildVenuePageJsonLd({
      ok: true,
      venue: {
        id: 'v4',
        slug: 'tretyakovka',
        name: 'Третьяковская галерея',
        city: 'Москва',
        citySlug: 'moscow',
        regionSlug: 'moskovskaya-oblast',
        regionTitle: 'Московская область',
        type: 'museum_art_space',
        events: 10,
        categories: {},
        canonicalPath: '/venues/tretyakovka',
      },
      sessions: [],
      relatedVenues: [],
      stats: { events: 10, categories: 1 },
    } as any);
    const crumbs = (blocks[1] as any).itemListElement || [];
    assert.deepEqual(
      crumbs.map((item: any) => item.name),
      ['Главная', 'Москва', 'Музеи', 'Третьяковская галерея'],
    );
    assert.equal(crumbs[2].item, 'https://daibilet.ru/places?type=museum&city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0');
  });

  it('art space breadcrumbs use Арт-пространства and ?type=art_space', () => {
    const blocks = buildVenuePageJsonLd({
      ok: true,
      venue: {
        id: 'v5',
        slug: 'galereya-glazunova',
        name: 'Галерея Ильи Глазунова',
        city: 'Москва',
        citySlug: 'moscow',
        type: 'museum_art_space',
        events: 2,
        categories: {},
        canonicalPath: '/venues/galereya-glazunova',
      },
      sessions: [],
      relatedVenues: [],
      stats: { events: 2, categories: 1 },
    } as any);
    const crumbs = (blocks[1] as any).itemListElement || [];
    assert.deepEqual(
      crumbs.map((item: any) => item.name),
      ['Главная', 'Москва', 'Арт-пространства', 'Галерея Ильи Глазунова'],
    );
    assert.equal(crumbs[2].item, 'https://daibilet.ru/places?type=art_space&city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0');
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