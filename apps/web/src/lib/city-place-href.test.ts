import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { namesLooselyMatch, resolveCityPlaceTitleHref } from './city-place-href.ts';
import { resolveCityPlaceHref } from './cityInfo.ts';

describe('resolveCityPlaceHref', () => {
  it('prefers explicit href', () => {
    assert.equal(
      resolveCityPlaceHref({ href: '/venues/ermitazh', venueSlug: 'other' }),
      '/venues/ermitazh',
    );
  });

  it('builds venue and location paths', () => {
    assert.equal(resolveCityPlaceHref({ venueSlug: 'ermitazh' }), '/venues/ermitazh');
    assert.equal(resolveCityPlaceHref({ locationSlug: 'naberezhnaya-kamy' }), '/locations/naberezhnaya-kamy');
  });

  it('skips empty / absolute external', () => {
    assert.equal(resolveCityPlaceHref({}), null);
    assert.equal(resolveCityPlaceHref({ href: 'https://example.com/x' }), null);
  });
});

describe('resolveCityPlaceTitleHref', () => {
  it('matches published city venue by name', () => {
    const href = resolveCityPlaceTitleHref(
      { name: 'Пермская художественная галерея' },
      [
        {
          id: 'v1',
          slug: 'permskaya-hudozhestvennaya-galereya',
          name: 'Пермская государственная художественная галерея',
          type: 'museum',
          pageStatus: 'published',
        },
      ],
    );
    assert.equal(href, '/venues/permskaya-hudozhestvennaya-galereya');
  });

  it('does not link pageStatus none', () => {
    const href = resolveCityPlaceTitleHref(
      { name: 'Хохловка' },
      [{ id: 'v2', slug: 'hohlovka', name: 'Хохловка', type: 'museum', pageStatus: 'none' }],
    );
    assert.equal(href, null);
  });

  it('uses location template for outdoor kinds', () => {
    const href = resolveCityPlaceTitleHref(
      { name: 'Набережная Камы' },
      [
        {
          id: 'v3',
          slug: 'naberezhnaya-kamy',
          name: 'Набережная Камы',
          type: 'outdoor_location',
          pageStatus: 'candidate',
        },
      ],
    );
    assert.equal(href, '/locations/naberezhnaya-kamy');
  });

  it('does not name-match suburb POI without slug', () => {
    const href = resolveCityPlaceTitleHref(
      { name: 'Ратуша (Старая ратуша)' },
      [
        {
          id: 'v-spb',
          slug: 'saint-petersburg-gorodskaya-ratusha',
          name: 'Ратуша',
          type: 'museum',
          pageStatus: 'published',
        },
      ],
      { allowNameMatch: false },
    );
    assert.equal(href, null);
  });

  it('does not link Vyborg slug that is missing from the parent hub', () => {
    const href = resolveCityPlaceTitleHref(
      { name: 'Выборгский замок', locationSlug: 'vyborg-vyborgskiy-zamok' },
      [
        {
          id: 'v-spb',
          slug: 'saint-petersburg-vyborgskiy-zamok',
          name: 'Выборгский замок',
          type: 'outdoor_location',
          pageStatus: 'published',
        },
      ],
      { allowNameMatch: false },
    );
    assert.equal(href, null);
  });

  it('keeps explicit locationSlug when the city payload omits outdoor pages', () => {
    const href = resolveCityPlaceTitleHref(
      { name: 'Парк Горького', locationSlug: 'moscow-park-gorkogo' },
      [
        {
          id: 'v-pier',
          slug: 'vorobevy-gory-sektor-a-3',
          name: 'Воробьевы горы, сектор A',
          type: 'pier',
          pageStatus: 'published',
        },
      ],
    );
    assert.equal(href, '/locations/moscow-park-gorkogo');
  });

  it('uses hub venue family when locationSlug is on the payload', () => {
    const href = resolveCityPlaceTitleHref(
      { name: 'Набережная Дона', locationSlug: 'rostov-na-donu-naberezhnaya-reki-don-beregovaya-ulitsa' },
      [
        {
          id: 'v-emb',
          slug: 'rostov-na-donu-naberezhnaya-reki-don-beregovaya-ulitsa',
          name: 'Набережная реки Дон',
          type: 'outdoor_location',
          pageStatus: 'published',
        },
      ],
    );
    assert.equal(href, '/locations/rostov-na-donu-naberezhnaya-reki-don-beregovaya-ulitsa');
  });

  it('still links suburb POI when the slug is on the hub', () => {
    const href = resolveCityPlaceTitleHref(
      { name: 'Нижний парк Петергофа', locationSlug: 'saint-petersburg-nizhniy-park-petergofa' },
      [
        {
          id: 'v-park',
          slug: 'saint-petersburg-nizhniy-park-petergofa',
          name: 'Нижний парк Петергофа',
          type: 'outdoor_location',
          pageStatus: 'published',
        },
      ],
      { allowNameMatch: false },
    );
    assert.equal(href, '/locations/saint-petersburg-nizhniy-park-petergofa');
  });
});

describe('namesLooselyMatch', () => {
  it('matches hermitage short/long forms', () => {
    assert.equal(namesLooselyMatch('Эрмитаж', 'Государственный Эрмитаж'), true);
  });

  it('matches gallery with middle adjective', () => {
    assert.equal(
      namesLooselyMatch(
        'Пермская художественная галерея',
        'Пермская государственная художественная галерея',
      ),
      true,
    );
  });

  it('rejects pier/theatre extras glued onto a landmark', () => {
    assert.equal(namesLooselyMatch('Адмиралтейство', 'Причал Адмиралтейство'), false);
    assert.equal(namesLooselyMatch('Эрмитаж', 'Театр Эрмитажа'), false);
    assert.equal(namesLooselyMatch('Эрмитаж', 'Государственный Эрмитаж'), true);
  });

  it('rejects city-name glue between mosque and MTS Live Hall', () => {
    assert.equal(
      namesLooselyMatch(
        'Санкт-Петербургская соборная мечеть',
        'МТС Live Холл Санкт-Петербург',
      ),
      false,
    );
  });

  it('still matches short mosque name to full official title', () => {
    assert.equal(
      namesLooselyMatch('соборная мечеть', 'Санкт-Петербургская соборная мечеть'),
      true,
    );
  });
});