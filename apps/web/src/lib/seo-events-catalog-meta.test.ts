import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EVENTS_CATALOG_TITLE,
  buildEventsCatalogMetaParts,
  buildEventsCatalogMetadata,
} from './seo-events-catalog-meta.ts';

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

test('metadata leaves canonical and robots to the response policy', () => {
  const meta = buildEventsCatalogMetadata({ category: 'Развлечения', date: 'today' });
  assert.equal(meta.alternates, undefined);
  assert.equal(meta.robots, undefined);
  assert.equal(meta.title, 'Развлечения - Сегодня - билеты онлайн');
  assert.ok(String(meta.description || '').trim().length > 40);
});

test('base /events description is dense and non-empty', () => {
  const meta = buildEventsCatalogMetadata({});
  assert.equal(meta.alternates, undefined);
  assert.ok(String(meta.description || '').includes('Афиша событий Дайбилет'));
  assert.ok(!String(meta.description || '').includes('\u2014'));
});
