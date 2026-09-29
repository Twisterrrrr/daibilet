import assert from 'node:assert/strict';
import test from 'node:test';

import { buildVenueSeoTitle, buildVenueSeoTitleCore, resolveVenueSeoTitle } from '@/lib/venue-seo';

const REF = new Date('2026-09-29T12:00:00+03:00');

/**
 * venue-seo.ts had no tests at all, which is how a nominative-after-"в" bug
 * reached all 12 Wave 1 sample URLs: every title read
 * "Пушкинский музей в Москва: афиша и билеты на сегодня, 29 сентября".
 */
test('venue title declines the city to the prepositional case', () => {
  assert.match(buildVenueSeoTitle('Пушкинский музей', REF, 'Москва'), / в Москве:/);
  assert.match(buildVenueSeoTitle('Большой театр', REF, 'Москва'), / в Москве:/);
  assert.match(buildVenueSeoTitle('Крымский мост', REF, 'Москва'), / в Москве:/);
  assert.match(buildVenueSeoTitle('Невский проспект', REF, 'Санкт-Петербург'), / в Санкт-Петербурге:/);
  assert.match(buildVenueSeoTitle('Дом друзей', REF, 'Казань'), / в Казани:/);
  assert.match(buildVenueSeoTitle('Галерея', REF, 'Екатеринбург'), / в Екатеринбурге:/);
});

test('venue title never renders a nominative city after "в"', () => {
  for (const city of ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск', 'Пермь']) {
    const title = buildVenueSeoTitle('Площадка', REF, city);
    assert.doesNotMatch(title, new RegExp(`\\sв\\s${city}\\b`), `nominative leaked: ${title}`);
  }
});

test('venue title keeps the geo segment out of duplicate city names', () => {
  // Venue name already carries the city - do not append it twice.
  const title = buildVenueSeoTitle('Москва', REF, 'Москва');
  assert.equal((title.match(/Москв/gi) || []).length, 1, title);
  assert.doesNotMatch(title, /Не указан/);
  assert.doesNotMatch(buildVenueSeoTitle('Площадка', REF, 'Не указан'), /Не указан/);
  assert.doesNotMatch(buildVenueSeoTitle('Площадка', REF, null), / в /);
});

test('venue title keeps the brand last and the core variant unbranded', () => {
  const full = buildVenueSeoTitle('Пушкинский музей', REF, 'Москва');
  assert.ok(full.endsWith('| Дайбилет'), full);
  const core = buildVenueSeoTitleCore('Пушкинский музей', REF, 'Москва');
  assert.doesNotMatch(core, /Дайбилет/);
  assert.equal(`${core} | Дайбилет`, full);
});

test('a CMS seoTitle is used only when the editor set freshness', () => {
  // No "на сегодня" in the CMS value -> ignore it, fall back to the live template.
  const custom = resolveVenueSeoTitle({ name: 'Пушкинский музей', city: 'Москва', seoTitle: 'Музей | Дайбилет' }, REF);
  assert.match(custom.core, / на сегодня/);
  assert.match(custom.core, / в Москве/);

  // Editor wrote freshness explicitly -> their text wins.
  const editor = resolveVenueSeoTitle(
    { name: 'Пушкинский музей', city: 'Москва', seoTitle: 'Пушкинский музей: своя выдача на сегодня' },
    REF,
  );
  assert.equal(editor.core, 'Пушкинский музей: своя выдача на сегодня');
  // core is intentionally unbranded - the layout title template appends
  // "%s | Дайбилет". The brand belongs on `full` (og/twitter), not on core.
  assert.doesNotMatch(editor.core, /Дайбилет/);
  assert.ok(editor.full.endsWith('| Дайбилет'), editor.full);
});
