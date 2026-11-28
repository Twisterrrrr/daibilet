import assert from 'node:assert/strict';
import test from 'node:test';

import { CITY_DECLENSIONS, getLandingSeo, SEO_TEMPLATES } from './get-landing-seo.ts';

test('Group C standup template fills pilot declension without emoji or em dash', () => {
  const seo = getLandingSeo({
    citySlug: 'kaliningrad',
    landingSlug: 'standup',
    dbOverride: null,
  });
  assert.equal(seo.source, 'template');
  assert.match(seo.title, /Стендап и юмор в Калининграде/);
  assert.match(seo.title, /Дайбилет/);
  assert.doesNotMatch(seo.title, /ДайБилет/);
  assert.doesNotMatch(seo.title, /\u2014/);
  assert.doesNotMatch(seo.description, /👉/);
  assert.equal(seo.h1, 'Стендап и юмор в Калининграде');
  assert.equal(seo.seoText, null);
});

test('Group E na-vyhodnye template for saint-petersburg', () => {
  const seo = getLandingSeo({
    citySlug: 'saint-petersburg',
    landingSlug: 'na-vyhodnye',
  });
  assert.equal(seo.source, 'template');
  assert.match(seo.title, /в Санкт-Петербурге на выходных/);
  assert.equal(seo.h1, 'Куда сходить в Санкт-Петербурге на выходных');
});

test('podborki hub template uses rodit in description', () => {
  const seo = getLandingSeo({
    citySlug: 'kaliningrad',
    landingSlug: 'podborki',
  });
  assert.match(seo.description, /Калининграда/);
  assert.match(seo.h1, /в Калининграде/);
});

test('DB override wins field-wise; empty fields fall through to template', () => {
  const seo = getLandingSeo({
    citySlug: 'kaliningrad',
    landingSlug: 'excursions',
    dbOverride: {
      customTitle: 'Кастомный title КГД',
      customDescription: null,
      customH1: '',
      customText: 'Уникальный SEO-текст.',
    },
  });
  assert.equal(seo.source, 'override');
  assert.equal(seo.title, 'Кастомный title КГД');
  assert.match(seo.description, /экскурсии в Калининграде/);
  assert.equal(seo.h1, 'Экскурсии в Калининграде');
  assert.equal(seo.seoText, 'Уникальный SEO-текст.');
});

test('unknown city falls back safely', () => {
  const seo = getLandingSeo({
    citySlug: 'bryansk',
    landingSlug: 'standup',
  });
  assert.equal(seo.source, 'fallback');
  assert.match(seo.title, /Дайбилет/);
});

test('pilot declensions and Group C/E template keys present', () => {
  assert.ok(CITY_DECLENSIONS.kaliningrad);
  assert.ok(CITY_DECLENSIONS['saint-petersburg']);
  for (const key of [
    'podborki',
    'standup',
    'excursions',
    'unusual-theatres',
    'exhibitions',
    'walking-tours',
    'bridges-night',
    'spb-yards',
    'river-cruises',
    'besplatno',
    'na-vyhodnye',
    'do-2000',
    'segodnya-vecherom',
    'skoro',
  ]) {
    assert.ok(SEO_TEMPLATES[key], `missing template ${key}`);
  }
});
