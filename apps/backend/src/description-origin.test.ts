import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  EVENT_DESCRIPTION_ORIGINS,
  hasDescriptionOriginMarker,
  readDescriptionOriginMarker,
  stripDescriptionOriginMarkers,
} from './description-origin.js';

test('origin marker: reserved forms are recognised', () => {
  assert.equal(readDescriptionOriginMarker('<!-- daibilet:origin=AUTO -->'), 'AUTO');
  assert.equal(readDescriptionOriginMarker('[[origin:AI]]'), 'AI');
  assert.equal(readDescriptionOriginMarker('[[origin:EDITORIAL]]'), 'EDITORIAL');
  assert.equal(readDescriptionOriginMarker('<!-- daibilet:origin=EDITORIAL -->'), 'EDITORIAL');
});

test('origin marker: unknown or absent forms are not markers', () => {
  assert.equal(readDescriptionOriginMarker('обычный текст без маркера'), null);
  assert.equal(readDescriptionOriginMarker('<!-- daibilet:origin=MANUAL -->'), null);
  assert.equal(readDescriptionOriginMarker(null), null);
  assert.equal(readDescriptionOriginMarker(undefined), null);
  assert.equal(readDescriptionOriginMarker(''), null);
  assert.equal(hasDescriptionOriginMarker('обычный текст'), false);
});

test('origin marker: a marker-only line is removed with the whole line', () => {
  const text = '<!-- daibilet:origin=AUTO -->\n\nПервый абзац.\n\nВторой абзац.';
  assert.equal(stripDescriptionOriginMarkers(text), 'Первый абзац.\n\nВторой абзац.');
});

test('origin marker: an inline marker becomes a single space', () => {
  assert.equal(
    stripDescriptionOriginMarkers('Первый абзац. [[origin:AI]] Второй абзац.'),
    'Первый абзац. Второй абзац.',
  );
});

test('origin marker: clean text passes through untouched', () => {
  const clean = 'Текст без маркеров.\n\nВторой абзац.';
  assert.equal(stripDescriptionOriginMarkers(clean), clean);
  assert.equal(stripDescriptionOriginMarkers(null), '');
  assert.equal(stripDescriptionOriginMarkers(undefined), '');
  assert.equal(stripDescriptionOriginMarkers(''), '');
});

test('origin marker: stripping is idempotent and leaves no marker behind', () => {
  const once = stripDescriptionOriginMarkers('<!-- daibilet:origin=AUTO -->\n\nТекст.');
  assert.equal(stripDescriptionOriginMarkers(once), once);
  assert.equal(hasDescriptionOriginMarker(once), false);
});

test('origin marker: every supported origin value is recognised', () => {
  for (const origin of EVENT_DESCRIPTION_ORIGINS) {
    assert.equal(readDescriptionOriginMarker(`<!-- daibilet:origin=${origin} -->`), origin);
  }
});

/**
 * The public description normalizer exists in four copies: two TypeScript modules
 * importing `./description-origin.js` and two legacy `.js` entrypoints that cannot
 * import it (they are loaded by plain node) and therefore keep the pattern inline.
 * These two tests stop the copies from drifting apart.
 */
test('legacy public paths keep the same marker pattern (drift guard)', () => {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  for (const file of ['dto.js', 'public-venue-read.js']) {
    const source = readFileSync(path.join(sourceDir, file), 'utf8');
    assert.match(source, /daibilet:origin/, `${file} lost the comment marker form`);
    assert.match(source, /AUTO\s*\|\s*EDITORIAL\s*\|\s*AI/, `${file} lost an origin value`);
    assert.ok(source.includes('\\[\\['), `${file} lost the bracket marker form`);
  }
});

test('legacy dto.js cleanImportedDescription strips the marker too', async () => {
  const { cleanImportedDescription } = await import('./dto.js');
  assert.equal(cleanImportedDescription('<!-- daibilet:origin=AUTO -->\n\nПубличный текст.'), 'Публичный текст.');
  assert.equal(cleanImportedDescription('Первый абзац. [[origin:AI]] Второй абзац.'), 'Первый абзац. Второй абзац.');
  assert.doesNotMatch(String(cleanImportedDescription('[[origin:AI]] Текст.')), /daibilet:origin|\[\[origin:/u);
});
