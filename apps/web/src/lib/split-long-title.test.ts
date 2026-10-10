import assert from 'node:assert/strict';
import test from 'node:test';

import { splitLongTitleAtBreak } from './split-long-title.ts';

test('long title breaks after colon, keeps mark on first line', () => {
  const split = splitLongTitleAtBreak('В Рускеалу на ретропоезде: Водопады и мраморный каньон');
  assert.deepEqual(split, {
    lead: 'В Рускеалу на ретропоезде',
    mark: ':',
    tail: 'Водопады и мраморный каньон',
  });
});

test('long title breaks after spaced hyphen, not inside hyphenated words', () => {
  const split = splitLongTitleAtBreak('Ночная прогулка на ретропоезде - водопады и мраморный каньон');
  assert.deepEqual(split, {
    lead: 'Ночная прогулка на ретропоезде',
    mark: '-',
    tail: 'водопады и мраморный каньон',
  });
  assert.equal(splitLongTitleAtBreak('Короткое: ещё хвост'), null);
  assert.equal(
    splitLongTitleAtBreak('Вечерняя автобусная экскурсия по Санкт-Петербургу ночью'),
    null,
  );
});
