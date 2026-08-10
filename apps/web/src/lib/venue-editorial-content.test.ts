import assert from 'node:assert/strict';
import test from 'node:test';

import {
  __editorialVenueContentSlugCountForTests,
  applyVenueEditorialOverlay,
  formatVenueMetroLabel,
  resolveVenueEditorialContent,
  resolveVenueGalleryImages,
  venueFeatureChips,
  venueFeatureLabels,
} from './venue-editorial-content.ts';

test('ermitazh has highlights, features, FAQ without em dash', () => {
  const content = resolveVenueEditorialContent('ermitazh');
  assert.ok(content);
  assert.equal(content!.displayTitle, 'Государственный Эрмитаж');
  assert.ok(content!.hookFact && content!.hookFact.includes('8 лет'));
  assert.ok((content!.galleryUrls || []).length >= 2);
  assert.equal(content!.tickets?.priceFromRub, 500);
  assert.ok(content!.phone);
  assert.ok(content!.website);
  assert.ok(content!.highlights.length >= 4);
  assert.ok(content!.faq.length >= 4);
  assert.equal(content!.metroStation, 'Адмиралтейская');
  assert.deepEqual(venueFeatureLabels(content!.features).slice(0, 3), [
    'Без очереди',
    'Аудиогид',
    'С детьми',
  ]);
  const chips = venueFeatureChips(content!.features);
  assert.equal(chips[0]?.icon, '⚡');
  const blob = [
    content!.hookFact || '',
    ...content!.highlights,
    ...content!.faq.flatMap((f) => [f.question, f.answer]),
  ].join('\n');
  assert.equal(blob.includes('—'), false);
  assert.equal(blob.includes('–'), false);
});

test('resolveVenueGalleryImages needs ≥2 real urls', () => {
  const images = resolveVenueGalleryImages({
    slug: 'ermitazh',
    heroImageUrl: '/images/venues/saint-petersburg/ermitazh.jpg',
  });
  assert.ok(images.length >= 2);
  assert.equal(
    resolveVenueGalleryImages({ slug: 'erarta', heroImageUrl: '/only-one.jpg' }).length,
    0,
  );
});

test('applyVenueEditorialOverlay patches legacy Hermitage title', () => {
  const patched = applyVenueEditorialOverlay({
    id: 'v1',
    name: 'Эрмитаж (Зимний дворец)',
    title: 'Эрмитаж (Зимний дворец)',
    seoH1: 'Эрмитаж (Зимний дворец)',
    slug: 'ermitazh',
    city: 'Санкт-Петербург',
    type: 'museum',
    events: 0,
    categories: {},
    metroStation: null,
    hookFact: null,
  });
  assert.equal(patched.name, 'Государственный Эрмитаж');
  assert.equal(patched.seoH1, 'Государственный Эрмитаж');
  assert.equal(patched.metroStation, 'Адмиралтейская');
  assert.ok(patched.hookFact && patched.hookFact.includes('8 лет'));
});

test('formatVenueMetroLabel prefixes м.', () => {
  assert.equal(formatVenueMetroLabel('Адмиралтейская'), 'м. Адмиралтейская');
  assert.equal(formatVenueMetroLabel('м. Невский'), 'м. Невский');
  assert.equal(formatVenueMetroLabel(''), null);
});

test('unknown slug has no editorial overlay', () => {
  assert.equal(resolveVenueEditorialContent('erarta'), null);
  assert.equal(resolveVenueEditorialContent(''), null);
  assert.equal(__editorialVenueContentSlugCountForTests(), 1);
});
