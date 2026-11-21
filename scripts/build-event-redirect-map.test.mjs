import assert from 'node:assert/strict';
import test from 'node:test';

import { extractEventUrls, identityFromEventPath } from './build-event-redirect-map.mjs';

test('extractEventUrls keeps only /events/ rows and dedups', () => {
  const csv = [
    '"url","clicks"',
    'https://daibilet.ru/events/tc-6a442d9564111c7fb5266957-titles',
    'https://daibilet.ru/',
    'https://daibilet.ru/events/tc-6a442d9564111c7fb5266957-titles',
    'https://daibilet.ru/cities/moscow',
    '',
  ].join('\n');
  assert.deepEqual(extractEventUrls(csv), ['/events/tc-6a442d9564111c7fb5266957-titles']);
});

test('extractEventUrls accepts TSV (tab-separated) GSC export', () => {
  const tsv = 'url\tclicks\nhttps://daibilet.ru/events/regular-show-moscow\t12\n';
  assert.deepEqual(extractEventUrls(tsv), ['/events/regular-show-moscow']);
});

test('identityFromEventPath resolves a TC id and marks kind tc_code', () => {
  assert.deepEqual(identityFromEventPath('/events/tc-6a442d9564111c7fb5266957-titles'), {
    slug: 'tc-6a442d9564111c7fb5266957-titles',
    internalId: 'evt_6a442d9564111c7fb5266957',
    kind: 'tc_code',
  });
});

test('identityFromEventPath resolves a TEP numeric id', () => {
  assert.deepEqual(identityFromEventPath('/events/dzhaz-na-reke-1551'), {
    slug: 'dzhaz-na-reke-1551',
    internalId: 'evt_tep_1551',
    kind: 'legacy_slug',
  });
});

test('identityFromEventPath leaves a clean title slug without an internal id', () => {
  assert.deepEqual(identityFromEventPath('/events/regular-show-moscow'), {
    slug: 'regular-show-moscow',
    internalId: '',
    kind: 'legacy_slug',
  });
});