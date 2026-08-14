import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyMuseumOrArtSpace,
  resolvePublicVenueType,
  venueTypeBreadcrumbPlural,
  venueTypeCatalogHref,
} from './venue-meta.ts';

describe('museum vs art_space public split', () => {
  it('classifies Tretyakov as museum and Glazunov gallery as art_space', () => {
    assert.equal(classifyMuseumOrArtSpace('Третьяковская галерея'), 'museum');
    assert.equal(classifyMuseumOrArtSpace('Галерея Ильи Глазунова'), 'art_space');
    assert.equal(classifyMuseumOrArtSpace('Арт-пространство Люмьер Холл'), 'art_space');
    assert.equal(classifyMuseumOrArtSpace('Государственный Эрмитаж'), 'museum');
    assert.equal(classifyMuseumOrArtSpace('Музей современного искусства Эрарта'), 'art_space');
    assert.equal(classifyMuseumOrArtSpace('Эрарта'), 'art_space');
    assert.equal(classifyMuseumOrArtSpace('', 'ven_spbboats_erarta'), 'art_space');
    assert.equal(classifyMuseumOrArtSpace('', 'erarta'), 'art_space');
  });

  it('resolves legacy museum_art_space via title', () => {
    assert.equal(resolvePublicVenueType('museum_art_space', 'Третьяковская галерея'), 'museum');
    assert.equal(resolvePublicVenueType('museum_art_space', 'Галерея Ильи Глазунова'), 'art_space');
    assert.equal(resolvePublicVenueType('museum', 'Anything'), 'museum');
    assert.equal(resolvePublicVenueType('art_space', 'Anything'), 'art_space');
  });

  it('breadcrumb plurals and catalog hrefs', () => {
    assert.equal(venueTypeBreadcrumbPlural('museum'), 'Музеи');
    assert.equal(venueTypeBreadcrumbPlural('art_space'), 'Арт-пространства');
    assert.equal(
      venueTypeCatalogHref({ type: 'museum_art_space', name: 'Третьяковская галерея', city: 'Москва' }),
      '/places?type=museum&city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0',
    );
    assert.equal(
      venueTypeCatalogHref({ type: 'museum_art_space', name: 'Галерея Ильи Глазунова', city: 'Москва' }),
      '/places?type=art_space&city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0',
    );
    assert.equal(venueTypeCatalogHref({ type: 'pier', name: 'Причал', city: 'Санкт-Петербург' }).startsWith('/places?type=pier'), true);
  });
});
