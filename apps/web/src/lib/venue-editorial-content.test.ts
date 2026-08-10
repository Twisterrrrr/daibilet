import assert from 'node:assert/strict';
import test from 'node:test';

import {
  __editorialVenueContentSlugCountForTests,
  formatVenueMetroLabel,
  resolveVenueEditorialContent,
  venueFeatureLabels,
} from './venue-editorial-content.ts';

test('ermitazh has highlights, features, FAQ without em dash', () => {
  const content = resolveVenueEditorialContent('ermitazh');
  assert.ok(content);
  assert.ok(content!.highlights.length >= 4);
  assert.ok(content!.faq.length >= 4);
  assert.equal(content!.metroStation, 'Адмиралтейская');
  assert.deepEqual(venueFeatureLabels(content!.features).slice(0, 3), [
    'Без очереди',
    'Аудиогид',
    'С детьми',
  ]);
  const blob = [...content!.highlights, ...content!.faq.flatMap((f) => [f.question, f.answer])].join(
    '\n',
  );
  assert.equal(blob.includes('—'), false);
  assert.equal(blob.includes('–'), false);
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
