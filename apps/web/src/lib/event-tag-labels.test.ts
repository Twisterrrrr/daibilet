import assert from 'node:assert/strict';
import test from 'node:test';

import { uniqueEventTagLabels } from './event-tag-labels.ts';

test('dedupes tags+subcategories by normalized label, keeps first order', () => {
  const tags = uniqueEventTagLabels(
    ['Рок', 'Шоу - программа', 'Рок', 'Шоу - программа', '  рок  '],
    12,
  );
  assert.deepEqual(tags, ['Рок', 'Шоу - программа']);
});

test('respects limit after dedupe', () => {
  assert.deepEqual(uniqueEventTagLabels(['A', 'a', 'B', 'b', 'C'], 2), ['A', 'B']);
});
