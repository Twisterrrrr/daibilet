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

function assertNoLongDash(blob: string) {
  assert.equal(blob.includes('—'), false, 'em dash');
  assert.equal(blob.includes('–'), false, 'en dash');
}

test('ermitazh has highlights, features, FAQ without em dash', () => {
  const content = resolveVenueEditorialContent('ermitazh');
  assert.ok(content);
  assert.equal(content!.displayTitle, 'Государственный Эрмитаж (Зимний дворец)');
  assert.ok(content!.hookFact && /пяти лет|5 лет/i.test(content!.hookFact));
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
  assertNoLongDash(blob);
});

test('moscow museum packs have unique seo sections and clean sources hygiene', () => {
  const pushkin = resolveVenueEditorialContent('moscow-gmii-imeni-pushkina');
  const garage = resolveVenueEditorialContent('moscow-muzey-garazh');
  const novaya = resolveVenueEditorialContent('moscow-novaya-tretyakovka');
  assert.ok(pushkin?.seoSections?.length);
  assert.ok(garage?.seoSections?.length);
  assert.ok(novaya?.seoSections?.length);
  assert.ok(pushkin!.faq[0]!.question.includes('Главное здание'));
  assert.ok(garage!.faq[0]!.question.toLowerCase().includes('без билета'));
  assert.ok(novaya!.faq[0]!.question.includes('Лаврушинском'));
  assert.equal(garage!.website, 'https://garagemca.org');
  assert.ok(pushkin!.hookFact?.includes('Иваном Цветаевым'));
  for (const pack of [pushkin!, garage!, novaya!]) {
    const blob = [
      pack.heroLead || '',
      pack.seoDescription || '',
      ...(pack.seoSections || []).flatMap((s) => [s.h2, s.body]),
      ...pack.faq.flatMap((f) => [f.question, f.answer]),
    ].join('\n');
    assertNoLongDash(blob);
  }
});

test('spb location packs resolve by catalog slugs', () => {
  const krepost = resolveVenueEditorialContent('saint-petersburg-petropavlovskaya-krepost');
  const square = resolveVenueEditorialContent('saint-petersburg-dvortsovaya-ploschad');
  const isaac = resolveVenueEditorialContent('saint-petersburg-isaakievskiy-sobor');
  const spas = resolveVenueEditorialContent('saint-petersburg-spas-na-krovi');
  const nevsky = resolveVenueEditorialContent('saint-petersburg-nevskiy-prospekt');
  const strelka = resolveVenueEditorialContent('saint-petersburg-strelka-vasilevskogo-ostrova');
  for (const pack of [krepost, square, isaac, spas, nevsky, strelka]) {
    assert.ok(pack?.seoSections?.length);
    assert.ok(pack!.faq.length >= 4);
    assert.ok(pack!.heroLead);
    const blob = [
      pack!.heroLead || '',
      pack!.seoDescription || '',
      ...(pack!.seoSections || []).flatMap((s) => [s.h2, s.body]),
      ...pack!.faq.flatMap((f) => [f.question, f.answer]),
    ].join('\n');
    assertNoLongDash(blob);
  }
  assert.ok(krepost!.faq[0]!.answer.toLowerCase().includes('бесплат'));
  assert.ok(isaac!.faq[0]!.question.includes('Колоннад'));
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
  assert.equal(patched.name, 'Государственный Эрмитаж (Зимний дворец)');
  assert.equal(patched.seoH1, 'Государственный Эрмитаж (Зимний дворец)');
  assert.equal(patched.metroStation, 'Адмиралтейская');
  assert.ok(patched.hookFact && /пяти лет|5 лет/i.test(patched.hookFact));
});

test('applyVenueEditorialOverlay fills Pushkin SEO fields', () => {
  const patched = applyVenueEditorialOverlay({
    id: 'v2',
    name: 'ГМИИ',
    title: 'ГМИИ',
    slug: 'moscow-gmii-imeni-pushkina',
    city: 'Москва',
    type: 'museum',
    events: 0,
    categories: {},
    seoDescription: null,
    shortDescription: null,
    wayToFind: null,
    hookFact: null,
    metroStation: null,
  });
  assert.equal(patched.name, 'Пушкинский музей');
  assert.ok(patched.seoDescription?.includes('сеансам'));
  assert.ok(patched.shortDescription?.includes('Волхонке'));
  assert.equal(patched.metroStation, 'Кропоткинская');
  assert.ok(patched.wayToFind?.includes('Волхонка'));
});

test('formatVenueMetroLabel prefixes м.', () => {
  assert.equal(formatVenueMetroLabel('Адмиралтейская'), 'м. Адмиралтейская');
  assert.equal(formatVenueMetroLabel('м. Невский'), 'м. Невский');
  assert.equal(formatVenueMetroLabel(''), null);
});

test('butman jazz club pack resolves catalog + spb alias', () => {
  const pack = resolveVenueEditorialContent('dzhaz-klub-igorya-butmana');
  const alias = resolveVenueEditorialContent('dzhaz-klub-igorya-butmana-spb');
  assert.ok(pack);
  assert.equal(pack, alias);
  assert.equal(pack!.displayTitle, 'Джаз-клуб Игоря Бутмана');
  assert.ok(pack!.faq.length >= 5);
  assert.ok(pack!.seoSections?.length);
  assert.ok(pack!.phone);
  assert.equal(pack!.website, 'https://butmanclub.ru');
  const blob = [
    pack!.heroLead || '',
    pack!.seoDescription || '',
    ...(pack!.seoSections || []).flatMap((s) => [s.h2, s.body]),
    ...pack!.faq.flatMap((f) => [f.question, f.answer]),
  ].join('\n');
  assertNoLongDash(blob);
});

test('unknown slug has no editorial overlay', () => {
  assert.equal(resolveVenueEditorialContent('erarta'), null);
  assert.equal(resolveVenueEditorialContent(''), null);
  assert.equal(__editorialVenueContentSlugCountForTests(), 11);
});
