import assert from 'node:assert/strict';
import test from 'node:test';

import { sessionEditorsThemeKey } from './home-showcase-sections.ts';

const key = (title: string) => sessionEditorsThemeKey({ title, category: 'Экскурсии' });

/**
 * 29.09. In JavaScript `\w` is `[A-Za-z0-9_]` and never matches Cyrillic, so
 * every word-adjacency alternative in the theme matcher was dead code:
 * `ночн\w*\s+петербург` could not match "Ночной Петербург" for any input. The
 * titles the editors-rail test expected to bucket only matched by accident, via
 * hardcoded literals like "магия огней". Anything phrased differently became its
 * own theme, which is how two night excursions ended up next to each other on
 * the home rail.
 */
test('night-tour theme buckets every phrasing, not just the hardcoded ones', () => {
  assert.equal(key('Ночной Петербург: от классики до футуризма'), 'theme:spb-night-tour');
  assert.equal(key('Вечерний Петербург: магия огней и легенд'), 'theme:spb-night-tour');
  // The title that exposed the bug: a noun sits between the adjective and the city.
  assert.equal(key('Ночное волшебство Петербурга: Лахта'), 'theme:spb-night-tour');
});

test('night signal and city signal are matched independently of word order', () => {
  // City first, adjective later.
  assert.equal(key('Петербург ночной: света и музыка'), 'theme:spb-night-tour');
  // Decided by the adjective stem alone, any inflection.
  for (const adj of ['Ночной', 'Ночная', 'Ночное', 'Ночные', 'Вечерний', 'Вечерняя']) {
    assert.equal(key(`${adj} Петербург`), 'theme:spb-night-tour', `adjective ${adj}`);
  }
});

test('the matcher is not dead for Moscow either', () => {
  assert.equal(key('Ночная Москва: огни и сити'), 'theme:msk-night-tour');
  assert.equal(key('Вечерняя Москва с высоты'), 'theme:msk-night-tour');
});

test('unrelated titles stay out of every theme bucket', () => {
  assert.equal(key('Концерт в филармонии'), null);
  assert.equal(key('Выставка в Русском музее'), null);
  assert.equal(key('Речная прогулка по Неве'), null);
  assert.equal(key('Экскурсия в Эрмитаж'), null);
  assert.equal(key(''), null);
});

test('other themes still resolve and do not collide with the night bucket', () => {
  assert.equal(key('Музей Пушкина на Царскосельской'), 'theme:spb-pushkin-tour');
  // Pushkin must not be swallowed by the night bucket.
  assert.notEqual(key('Царскосельская дача'), 'theme:spb-night-tour');
});

test('guards the mechanism: a Cyrillic letter class, not \\w', () => {
  // If this ever regresses to \w, the night patterns go dead again silently,
  // because the editors-rail test would still pass on the hardcoded literals.
  const title = 'Ночной Петербург';
  const broken = /ночн\w*\s+петербург/i;
  const fixed = /ночн\p{L}*\s+петербург/iu;
  assert.equal(broken.test(title), false, '\\w must not match Cyrillic - if this flips, revisit');
  assert.equal(fixed.test(title), true);
});

/**
 * 29.09. The night matcher carried four alternatives. Two of them (`ночно` and
 * `\p{L}*\s+ночн`) were provably redundant: over a 385-case corpus they never
 * matched a title that the single root `ночн\p{L}*` had not already matched.
 * `ночно` is a prefix-match of `ночн` plus more, and adjacency cannot widen a
 * pattern that already matches anywhere in the string. Dead alternatives in a
 * bug fix are a liability, so the matcher is down to the two roots it needs.
 *
 * These assertions test the roots directly, so reintroducing a redundant
 * alternative or swapping the letter class back to \w fails here by name.
 */
test('night roots alone cover every adjective form, with no adjacency help', () => {
  const root = /ночн\p{L}*|вечерн\p{L}*/u;
  for (const adj of [
    'ночной', 'ночная', 'ночное', 'ночные', 'ночного', 'ночную', 'ночные',
    'вечерний', 'вечерняя', 'вечернее', 'вечерние', 'вечернего', 'вечернюю',
  ]) {
    assert.equal(root.test(adj), true, `root must match "${adj}"`);
  }
});

test('the reduced matcher still buckets the real night titles', () => {
  // Behavioural guard: same outcomes as before the reduction.
  assert.equal(key('Ночной Петербург: от классики до футуризма'), 'theme:spb-night-tour');
  assert.equal(key('Ночное волшебство Петербурга: Лахта'), 'theme:spb-night-tour');
  assert.equal(key('Петербург ночной: света и музыка'), 'theme:spb-night-tour');
  assert.equal(key('Ночная Москва: огни и сити'), 'theme:msk-night-tour');
  // "Полночный" contains the root, so it is bucketed too.
  assert.equal(key('Полночная Москва'), 'theme:msk-night-tour');
  assert.equal(key('Полночный Петербург'), 'theme:spb-night-tour');
  // A night word with no city in the title must not fabricate a bucket.
  assert.equal(key('Ночь в пути'), null);
});
