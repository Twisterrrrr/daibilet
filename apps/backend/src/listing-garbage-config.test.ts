import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findListingGarbageHits,
  findListingGarbageHitsInText,
  hasCapsLockSpam,
  STOP_WORDS_REGEXP,
  textHasListingGarbage,
} from './listing-garbage-config.js';
import {
  formatListingAuditTelegramMessage,
  scanListingRows,
} from './listing-garbage-audit.js';
import { escapeTelegramHtml } from './telegram.js';

test('STOP_WORDS_REGEXP covers CTA / HTML / encoding (not empty /[]/)', () => {
  assert.ok(STOP_WORDS_REGEXP.length >= 6);
  for (const re of STOP_WORDS_REGEXP) {
    assert.ok(re instanceof RegExp);
    assert.notEqual(re.source, '[]');
    assert.ok(re.source.length > 0);
  }
});

test('findListingGarbageHits catches CTA offsite (partner e/ё)', () => {
  const a = findListingGarbageHitsInText('Билеты на сайте партнера TicketCloud');
  assert.ok(a.some((h) => h.ruleId === 'cta_partner_site'));

  const b = findListingGarbageHitsInText('Смотрите на сайте партнёра');
  assert.ok(b.some((h) => h.ruleId === 'cta_partner_site'));

  assert.ok(textHasListingGarbage('Купите билет прямо сейчас'));
  assert.ok(textHasListingGarbage('Нажмите сюда для оплаты'));
});

test('HTML tags only in title; entities in title or description', () => {
  assert.ok(
    findListingGarbageHits({ title: 'Цена&nbsp;от 500', description: null }).some(
      (h) => h.reason === 'html_parasite',
    ),
  );
  assert.ok(
    findListingGarbageHits({ title: 'Круиз <br> ночной', description: null }).some(
      (h) => h.ruleId === 'html_tag_in_title',
    ),
  );
  // Partner CMS HTML in description is expected - do not alert on <p>/<br>
  assert.equal(
    findListingGarbageHits({
      title: 'Обычный круиз',
      description: '<p>Отправление в 19:00</p><br>На борту ужин',
    }).length,
    0,
  );
  assert.ok(
    findListingGarbageHits({
      title: 'Обычный круиз',
      description: 'Цена&nbsp;от 500',
    }).some((h) => h.ruleId === 'html_entity'),
  );
});

test('CAPS: soft shout on title only, not single shouted word', () => {
  assert.equal(hasCapsLockSpam('ВНИМАНИЕ акция на билеты сегодня вечером'), false);
  assert.equal(hasCapsLockSpam('Москва'), false);
  assert.ok(hasCapsLockSpam('ВЕЧЕРНИЙ МУЗЫКАЛЬНЫЙ КРУИЗ НА ТЕПЛОХОДЕ С ДИ ДЖЕЕМ'));
  assert.equal(
    findListingGarbageHits({
      title: 'ЗОЛОТОЙ маршрут по Москве-реке вечером',
      description: null,
    }).some((h) => h.reason === 'caps_lock'),
    false,
  );
});

test('findListingGarbageHits catches replacement char and UTF-8-as-Latin1 mojibake', () => {
  assert.ok(
    findListingGarbageHitsInText('Сломанный\uFFFDтекст').some((h) => h.ruleId === 'replacement_char'),
  );
  assert.ok(
    findListingGarbageHitsInText('Ð¿Ñ€Ð¸Ð²ÐµÑ‚').some((h) => h.reason === 'broken_encoding'),
  );
});

test('скидк is intentionally NOT matched (too noisy)', () => {
  assert.equal(textHasListingGarbage('Скидка студентам 20%'), false);
  assert.equal(textHasListingGarbage('Большие скидки по карте'), false);
});

test('scanListingRows + telegram message cap at 10', () => {
  const events = Array.from({ length: 12 }, (_, i) => ({
    id: `id-${i}`,
    slug: `slug-${i}`,
    title: 'ВЕЧЕРНИЙ МУЗЫКАЛЬНЫЙ КРУИЗ НА ТЕПЛОХОДЕ С ДИ ДЖЕЕМ ПО РЕКЕ',
    description: null,
  }));
  const findings = scanListingRows(events, 'https://daibilet.ru');
  assert.equal(findings.length, 12);
  const msg = formatListingAuditTelegramMessage(findings, 10);
  assert.match(msg, /12 шт/);
  assert.match(msg, /…и ещё 2/);
  assert.ok((msg.match(/•/g) || []).length === 10);
});

test('escapeTelegramHtml escapes markup', () => {
  assert.equal(escapeTelegramHtml('a <b> & c'), 'a &lt;b&gt; &amp; c');
});
