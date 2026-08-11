import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasSeoListingEditorial,
  resolveSeoListingText,
  sanitizeSeoListingBody,
  splitSeoListingParagraphs,
} from '../data/seo-listing-texts.ts';

const PAD =
  'Актуальные цены, расписание мероприятий и свободные места смотрите на карточке события перед оплатой на Дайбилет.';

test('sanitizeSeoListingBody drops triple pad sentence', () => {
  const raw = `Лид про рейс. Второй абзац. ${PAD} ${PAD} ${PAD}`;
  const cleaned = sanitizeSeoListingBody(raw);
  assert.equal(cleaned.includes(PAD), false);
  assert.ok(cleaned.includes('Лид про рейс.'));
  assert.equal((cleaned.match(/Актуальные цены/g) || []).length, 0);
});

test('sanitizeSeoListingBody collapses consecutive duplicate sentences', () => {
  const raw = 'Первое. Первое. Второе.';
  assert.equal(sanitizeSeoListingBody(raw), 'Первое. Второе.');
});

test('splitSeoListingParagraphs respects explicit breaks', () => {
  const paras = splitSeoListingParagraphs('Абзац один.\n\nАбзац два.');
  assert.deepEqual(paras, ['Абзац один.', 'Абзац два.']);
});

test('splitSeoListingParagraphs auto-splits wall of text', () => {
  const wall =
    'Один. Два. Три. Четыре. Пять. Шесть. Семь. Восемь. Девять.';
  const paras = splitSeoListingParagraphs(wall);
  assert.ok(paras.length >= 3 && paras.length <= 4);
  assert.equal(paras.join(' ').replace(/\s+/g, ' '), wall);
});

test('resolveSeoListingText returns Kaliningrad standup editorial', () => {
  const entry = resolveSeoListingText('standup', 'kaliningrad');
  assert.ok(entry);
  assert.match(entry!.heading, /Калининграде/);
  assert.match(entry!.body, /Stand Up Kaliningrad/);
  assert.match(entry!.body, /Дайбилет/);
  assert.equal(entry!.body.includes('ДайБилет'), false);
  assert.equal(/[—–]/.test(entry!.body), false);
});

test('resolveSeoListingText returns null for unknown city×category without national fallback', () => {
  assert.equal(resolveSeoListingText('standup', 'tyumen'), null);
});

test('hasSeoListingEditorial requires exact city pair (no national rooftops fallback)', () => {
  assert.equal(hasSeoListingEditorial('standup', 'kaliningrad'), true);
  assert.equal(hasSeoListingEditorial('standup', 'tyumen'), false);
  assert.equal(hasSeoListingEditorial('rooftops', 'moscow'), false);
  assert.equal(hasSeoListingEditorial('rooftops', null), false);
});
