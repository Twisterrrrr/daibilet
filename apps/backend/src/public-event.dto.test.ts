import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTepEventIdFromTrailingToken,
  eventTitleTokenFingerprint,
  extractEventTrailingLookupToken,
  matchesPublicEventSlug,
  publicSlug,
} from './public-event.dto.js';

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
