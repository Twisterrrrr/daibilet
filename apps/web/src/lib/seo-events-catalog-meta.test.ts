import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EVENTS_CATALOG_TITLE,
  buildEventsCatalogMetaParts,
  buildEventsCatalogMetadata,
} from '@/lib/seo-events-catalog-meta';

test('base /events meta without filters', () => {
  const parts = buildEventsCatalogMetaParts({});
  assert.equal(parts.filtered, false);
  assert.equal(parts.title, EVENTS_CATALOG_TITLE);
  assert.ok(!parts.title.includes('\u2014') && !parts.title.includes('\u2013'));
});

test('category filter builds unique title', () => {
  const parts = buildEventsCatalogMetaParts({ category: 'Экскурсии' });
  assert.equal(parts.filtered, true);
  assert.equal(parts.title, 'Экскурсии - билеты онлайн');
  assert.match(parts.description, /Экскурсии/);
});

test('typo Меропроприятия normalized', () => {
  const parts = buildEventsCatalogMetaParts({ category: 'Меропроприятия' });
  assert.equal(parts.title, 'Мероприятия - билеты онлайн');
});

test('date=today and category combine', () => {
  const parts = buildEventsCatalogMetaParts({
    category: 'Музеи и арт',
    date: 'today',
  });
  assert.equal(parts.title, 'Музеи и арт - Сегодня - билеты онлайн');
});

test('metadata marks filtered pages noindex with canonical /events', () => {
  const meta = buildEventsCatalogMetadata({ category: 'Развлечения', date: 'today' });
  assert.equal(meta.alternates?.canonical, '/events');
  assert.deepEqual(meta.robots, { index: false, follow: true });
  assert.equal(meta.title, 'Развлечения - Сегодня - билеты онлайн');
});
