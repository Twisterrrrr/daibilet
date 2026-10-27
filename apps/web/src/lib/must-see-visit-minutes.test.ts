import assert from 'node:assert/strict';
import test from 'node:test';

import { formatVisitDuration } from './visit-duration.ts';
import {
  resolveMustSeeVisitMinutes,
  visitMinutesFromMustSeeRules,
} from './must-see-visit-minutes.ts';

test('owner table: monuments / open / promenades / museums / gastro / temples / parks', () => {
  assert.equal(visitMinutesFromMustSeeRules({ name: 'Памятник Пушкину', mustSeeFilter: 'monument' }), 15);
  assert.equal(visitMinutesFromMustSeeRules({ name: 'Большая Покровская', mustSeeFilter: 'street' }), 20);
  assert.equal(visitMinutesFromMustSeeRules({ name: 'Доходный дом', mustSeeFilter: 'houses' }), 20);
  assert.equal(visitMinutesFromMustSeeRules({ name: 'Дворцовая набережная', mustSeeFilter: 'views' }), 60);
  assert.equal(visitMinutesFromMustSeeRules({ name: 'Русский музей', mustSeeFilter: 'museum' }), '1-2 ч');
  assert.equal(visitMinutesFromMustSeeRules({ name: 'Кафе Пушкин', mustSeeFilter: 'gastro' }), 60);
  assert.equal(visitMinutesFromMustSeeRules({ name: 'Казанский собор', mustSeeFilter: 'temple' }), 30);
  assert.equal(visitMinutesFromMustSeeRules({ name: 'Летний сад', mustSeeFilter: 'park' }), '1-2 ч');
});

test('theater and cable car heuristics', () => {
  assert.equal(visitMinutesFromMustSeeRules({ name: 'Мариинский театр' }), 120);
  assert.equal(visitMinutesFromMustSeeRules({ name: 'Нижегородская канатная дорога' }), 30);
});

test('main-tagged museum/temple still get category minutes', () => {
  assert.equal(
    visitMinutesFromMustSeeRules({
      name: 'Государственный Эрмитаж (Зимний дворец)',
      desc: 'Один из величайших художественных музеев планеты',
      mustSeeFilter: 'main',
      venueSlug: 'ermitazh',
    }),
    '1-2 ч',
  );
  assert.equal(
    visitMinutesFromMustSeeRules({
      name: 'Исаакиевский собор',
      mustSeeFilter: 'main',
      locationSlug: 'saint-petersburg-isaakievskiy-sobor',
    }),
    30,
  );
});

test('resolve ignores editorial visitMinutes', () => {
  assert.equal(
    resolveMustSeeVisitMinutes({ name: 'Памятник', mustSeeFilter: 'monument', visitMinutes: 90 }),
    15,
  );
  assert.equal(formatVisitDuration(resolveMustSeeVisitMinutes({ name: 'Площадь', mustSeeFilter: 'street' })), '20 мин');
  assert.equal(formatVisitDuration(resolveMustSeeVisitMinutes({ name: 'Музей', mustSeeFilter: 'museum' })), '1-2 ч');
});
