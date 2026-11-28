import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CityFaqServer } from '../components/CityFaqServer';
import { buildFaqPageJsonLd } from './structured-data';
import { visibleCityFaqItems } from './city-faq';

test('city FAQ renders every question and answer in HTML and identical FAQPage entities', () => {
  const items = visibleCityFaqItems('Москва', [
    { q: 'Первый вопрос?', a: 'Первый ответ.' },
    { q: 'Второй вопрос?', a: 'Второй ответ.' },
  ], []);
  const html = renderToStaticMarkup(createElement(CityFaqServer, { cityName: 'Москва', items }));
  assert.equal((html.match(/<details\b/g) || []).length, items.length);
  assert.equal((html.match(/<summary\b/g) || []).length, items.length);
  for (const item of items) {
    assert.ok(html.includes(item.question));
    assert.ok(html.includes(item.answer));
  }
  assert.deepEqual((buildFaqPageJsonLd(items) as { mainEntity: Array<{ name: string }> }).mainEntity.map((entry) => entry.name), items.map((item) => item.question));
});

test('city FAQ fallback appears in HTML and schema when editorial FAQ is empty', () => {
  const items = visibleCityFaqItems('Тестоград', undefined, []);
  const html = renderToStaticMarkup(createElement(CityFaqServer, { cityName: 'Тестоград', items }));
  assert.equal((html.match(/<details\b/g) || []).length, 3);
  assert.ok(html.includes('Тестоград'));
  assert.equal((buildFaqPageJsonLd(items) as { mainEntity: unknown[] }).mainEntity.length, 3);
});
