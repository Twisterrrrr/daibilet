import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTepEventIdFromTrailingToken,
  eventTitleTokenFingerprint,
  extractEventTrailingLookupToken,
  matchesPublicEventSlug,
  mapTepPublicSlugIds,
  publicSlug,
} from './public-event.dto';

test('truncated Teplohod slugs without an ID tail resolve through the bounded map', () => {
  const rows = [
    { id: 'evt_tep_1080', slug: 'прогулка-с-ужином-музыкальнои-программои-с-французским-аккордионам-и-дискотекои-на-теплоходе-артурс-вечерняя-москва-в-ог' },
    { id: 'evt_tep_172', slug: 'москва-златоглавая-круговая-речная-прогулка-по-москве-реке-от-киевскои-до-кремля-и-обратно-на-теплоходе-августина-алекси' },
    { id: 'evt_tep_173', slug: 'вечерняя-москва-музыкальныи-круиз-с-живои-музыкои-ужином-и-без-с-видом-на-кремль-и-парящии-мост-в-парке-зарядье-на-люкс-' },
  ];
  const ids = mapTepPublicSlugIds(rows);
  assert.equal(ids.get('progulka-s-uzhinom-muzykalnoi-programmoi-s-francuzskim-akkordionam-i-diskotekoi-na-teplohode-arturs-vechernyaya-moskva-v-og'), 'evt_tep_1080');
  assert.equal(ids.get('moskva-zlatoglavaya-krugovaya-rechnaya-progulka-po-moskve-reke-ot-kievskoi-do-kremlya-i-obratno-na-teplohode-avgustina-aleksi'), 'evt_tep_172');
  assert.equal(ids.get('vechernyaya-moskva-muzykalnyi-kruiz-s-zhivoi-muzykoi-uzhinom-i-bez-s-vidom-na-kreml-i-paryaschii-most-v-parke-zaryade-na-lyuks'), 'evt_tep_173');
});

/**
 * Regression PERF.E5: Latin public URL must resolve TEP events whose DB slug is Cyrillic.
 * Prod case: retro-locman-ot-zaryadya-1294 → evt_tep_1294 (missed by 20k updatedAt scan).
 */

const CYRILLIC_TEP_SLUG = 'рэтро-лоцман-от-зарядья-1294';
const LATIN_PUBLIC_SLUG = 'retro-locman-ot-zaryadya-1294';

test('publicSlug transliterates Cyrillic TEP slug to latin public URL', () => {
  assert.equal(publicSlug(CYRILLIC_TEP_SLUG), LATIN_PUBLIC_SLUG);
});

test('extractEventTrailingLookupToken reads numeric tail from latin slug', () => {
  assert.equal(extractEventTrailingLookupToken(LATIN_PUBLIC_SLUG), '1294');
});

test('buildTepEventIdFromTrailingToken maps tail to evt_tep id', () => {
  assert.equal(buildTepEventIdFromTrailingToken('1294'), 'evt_tep_1294');
});

test('matchesPublicEventSlug links latin URL to Cyrillic DB slug for TEP event', () => {
  assert.equal(matchesPublicEventSlug(LATIN_PUBLIC_SLUG, CYRILLIC_TEP_SLUG), true);
  assert.equal(
    buildTepEventIdFromTrailingToken(extractEventTrailingLookupToken(LATIN_PUBLIC_SLUG) || ''),
    'evt_tep_1294',
  );
});

test('eventTitleTokenFingerprint matches TC/TEP twins with shuffled phrases', () => {
  const tc =
    'Ночной круиз на разводные мосты с путешествием к Финскому заливу и дискотекой';
  const tep =
    'Ночной круиз на разводные мосты с дискотекой и путешествием к Финскому заливу';
  assert.equal(eventTitleTokenFingerprint(tc), eventTitleTokenFingerprint(tep));
  assert.notEqual(
    eventTitleTokenFingerprint(tc),
    eventTitleTokenFingerprint('Дискотека на теплоходе с разводом мостов'),
  );
});
