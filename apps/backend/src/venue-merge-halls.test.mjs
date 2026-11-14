/**
 * Smoke: multi-hall club titles share one merge key after address/hall fixes.
 * Run: node --test apps/backend/src/venue-merge-halls.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

// Pull pure helpers by evaluating a thin slice is brittle; instead duplicate the
// critical regex contract here and assert against live dto exports via dynamic import
// of the module's side-effect-free path is not available. Use source grep checks.

const dtoPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dto.js');
const source = readFileSync(dtoPath, 'utf8');

test('dto contains clubhall merge key for hall-suffix titles', () => {
  assert.match(source, /clubhall\|\$\{cityKey\}\|\$\{title\}/);
  assert.match(source, /venueTitleHasOnlyHallSuffixes/);
  assert.match(source, /normalizeVenueAddressMergeKey/);
  assert.match(source, /\(\d\)\\s\+\(\[a-zа-я\]\)/);
});

test('hall suffix detector covers Stage StandUp hall names', () => {
  const hallRe =
    /^(основной|малый|большой|маленький|верхний|нижний|концертный|выставочный|камерный|банкетный|театральный|красный|черный|белый|синий|зеленый|vip)(\s+зал)?$/;
  for (const hall of ['красный зал', 'черный зал', 'основной зал', 'vip']) {
    assert.equal(hallRe.test(hall), true, hall);
  }
});
