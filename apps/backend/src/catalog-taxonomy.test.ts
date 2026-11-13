import assert from 'node:assert/strict';
import test from 'node:test';
import { placeSubtypeIssue, suggestedPlacePdpVariant } from '@daibilet/contracts/place-pdp';
import {
  familyAudienceReviewReason,
  resolveCatalogLists,
  resolveEventTaxonomy,
} from './catalog-taxonomy.js';
import { suggestPlaceTaxonomyCandidate } from './place-taxonomy-candidates.js';

test('keeps venue type concept separate: theatre event category is performances', () => {
  const result = resolveEventTaxonomy({
    editorialSubcategorySlug: 'sub_events_theater',
    title: 'Спектакль',
  });
  assert.equal(result.subcategory?.slug, 'performances');
  assert.equal(result.subcategory?.title, 'Спектакли');
  assert.equal(result.confidence, 'high');
});

test('uses source taxonomy before title heuristics', () => {
  const result = resolveEventTaxonomy({
    sourceSubcategories: ['Концерты'],
    title: 'Новогоднее шоу',
  });
  assert.equal(result.subcategory?.slug, 'concerts');
  assert.equal(result.confidence, 'medium');
});

test('maps generic source event by a strong title phrase and leaves ambiguous records for review', () => {
  assert.equal(resolveEventTaxonomy({ title: 'Автобусная экскурсия по городу' }).subcategory?.slug, 'excursions');
  const unresolved = resolveEventTaxonomy({ title: 'Вечер в городе', category: 'Мероприятия' });
  assert.equal(unresolved.subcategory, null);
  assert.equal(unresolved.confidence, 'low');
});

test('free list requires a confirmed zero price and never treats missing price as free', () => {
  assert.deepEqual(resolveCatalogLists({ priceFrom: 0 }), ['free']);
  assert.deepEqual(resolveCatalogLists({ priceFrom: null }), []);
  assert.deepEqual(resolveCatalogLists({ freeAdmissionConfirmed: true }), ['free']);
});

test('0+ alone is not a children or family signal', () => {
  assert.deepEqual(resolveCatalogLists({ ageLimit: '0+' }), []);
});

test('child title plus confirmed 6+ age maps to children list, not family-all', () => {
  const lists = resolveCatalogLists({ title: 'Детский спектакль «Сказка»', ageLimit: '6+' });
  assert.deepEqual(lists, ['family_kids']);
});

test('accepts numeric age values used by imported event records', () => {
  assert.deepEqual(resolveCatalogLists({ title: 'Детское шоу фокусов', ageLimit: '6' }), ['family_kids']);
  assert.deepEqual(resolveCatalogLists({ title: 'Семейный спектакль', ageLimit: '0' }), ['family_all']);
});

test('family phrase with compatible age maps to family-all', () => {
  const lists = resolveCatalogLists({ title: 'Фестиваль для всей семьи', ageLimit: '0+' });
  assert.deepEqual(lists, ['family_all']);
  assert.deepEqual(resolveCatalogLists({ tags: ['Для семейного просмотра'], ageLimit: '0' }), ['family_all']);
});

test('stable kids subcategory ID is a child signal; zoo and entertainment-center IDs are family signals', () => {
  assert.deepEqual(resolveCatalogLists({ sourceSubcategories: ['sub_entertainment_children'], ageLimit: '6+' }), ['family_kids']);
  assert.deepEqual(resolveCatalogLists({ sourceSubcategories: ['sub_entertainment_zoo'], ageLimit: '0+' }), ['family_all']);
  assert.deepEqual(resolveCatalogLists({ sourceSubcategories: ['sub_entertainment_fun'], ageLimit: '3+' }), ['family_all']);
});

test('age 12+ and adult keywords exclude family lists', () => {
  assert.deepEqual(resolveCatalogLists({ title: 'Детское шоу', ageLimit: '12+' }), []);
  assert.deepEqual(resolveCatalogLists({ title: 'Детское шоу', ageLimit: '12' }), []);
  assert.deepEqual(resolveCatalogLists({ title: 'Семейная ночная вечеринка', ageLimit: '6+' }), []);
});

test('does not classify a childcare institution title or explicit negation as a child event', () => {
  assert.deepEqual(resolveCatalogLists({ title: 'Экскурсия «Детский сад»', ageLimit: '6+' }), []);
  assert.deepEqual(resolveCatalogLists({ title: 'Не для детей: вечерняя программа', ageLimit: '6+' }), []);
});

test('puts events with an audience signal but unconfirmed age in review', () => {
  assert.equal(
    familyAudienceReviewReason({ title: 'Детский спектакль', ageLimit: null }),
    'audience_signal_without_age_confirmation',
  );
});

test('weekend list follows the event city timezone', () => {
  const lists = resolveCatalogLists({
    startsAt: '2026-11-14T00:30:00.000Z',
    timeZone: 'Europe/Moscow',
  });
  assert.deepEqual(lists, ['weekend']);
});

test('moves cinema, circus, planetarium and aquarium into the entertainment place type', () => {
  for (const subtype of ['cinema', 'circus', 'planetarium', 'aquarium']) {
    assert.equal(placeSubtypeIssue('ENTERTAINMENT', subtype), null);
    assert.equal(suggestedPlacePdpVariant('ENTERTAINMENT', subtype), 'attraction');
  }
  for (const subtype of ['cinema', 'circus']) assert.equal(placeSubtypeIssue('THEATRE', subtype), 'subtype_type_mismatch');
  for (const subtype of ['planetarium', 'aquarium']) assert.equal(placeSubtypeIssue('MUSEUM', subtype), 'subtype_type_mismatch');
});

test('place taxonomy heuristics only suggest candidates and do not overwrite a resolved subtype', () => {
  assert.deepEqual(suggestPlaceTaxonomyCandidate({ title: 'Океанариум «Риф»', placeType: 'MUSEUM', placeSubtype: 'aquarium' }), {
    placeType: 'ENTERTAINMENT', placeSubtype: 'aquarium', variant: 'attraction', reason: 'title_aquarium',
  });
  assert.equal(suggestPlaceTaxonomyCandidate({ title: 'Музей морской истории' }), null);
  assert.equal(suggestPlaceTaxonomyCandidate({ title: 'Океанариум «Риф»', placeType: 'ENTERTAINMENT', placeSubtype: 'aquarium' }), null);
});
