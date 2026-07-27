import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatEventDescriptionHtml,
  parseEventDescriptionBlocks,
  parseCommaSeparatedListAfterIntro,
  parseInlineListAfterColon,
} from './event-description-format.ts';

const CHECKMARK_SAMPLE = `На нашей экскурсии вы узнаете:

✅ Как сексуальная революция 20хх годов нацелилась разрушить брачные устои
✅ Расскажем об экспериментах и концепции «свободной любви»
✅ К чему привели 70 лет советского аскетизма

Наш рассказ будет дополняться архивными материалами.`;

const DASH_SAMPLE = `Организационные детали:
- экскурсия полностью пешая, пожалуйста, одевайтесь по погоде.
- обратите особое внимание, экскурсия строго 18+.
- пожалуйста, возьмите с собой паспорт для подтверждения возраста.`;

test('parses checkmark lines as a list and keeps surrounding paragraphs', () => {
  const blocks = parseEventDescriptionBlocks(CHECKMARK_SAMPLE);
  assert.ok(blocks[0]?.type === 'heading' || blocks[0]?.type === 'paragraph');
  assert.match((blocks[0] as { text: string }).text, /узнаете/i);
  assert.equal(blocks[1]?.type, 'list');
  assert.equal((blocks[1] as { items: string[] }).items.length, 3);
  assert.match((blocks[1] as { items: string[] }).items[0], /сексуальная революция/);
  assert.equal(blocks[2]?.type, 'paragraph');
  assert.match((blocks[2] as { text: string }).text, /архивными материалами/);
});

test('parses dash lines after «Организационные детали:» as a list', () => {
  const blocks = parseEventDescriptionBlocks(DASH_SAMPLE);
  assert.equal(blocks[0]?.type, 'heading');
  assert.match((blocks[0] as { text: string }).text, /Организационные детали/i);
  assert.equal(blocks[1]?.type, 'list');
  assert.equal((blocks[1] as { items: string[] }).items.length, 3);
  assert.match((blocks[1] as { items: string[] }).items[0], /полностью пешая/);
});

test('parses inline list after colon on one line', () => {
  const inline = parseInlineListAfterColon(
    'Организационные детали: - экскурсия пешая. - строго 18+. - возьмите паспорт.',
  );
  assert.ok(inline);
  assert.match(inline!.intro, /Организационные детали:/i);
  assert.equal(inline!.items.length, 3);

  const html = formatEventDescriptionHtml(
    'Организационные детали: - экскурсия пешая. - строго 18+. - возьмите паспорт.',
  );
  assert.match(html, /<ul>/);
  assert.match(html, /<li>экскурсия пешая\.<\/li>/);
  assert.match(html, /<li>строго 18\+\.<\/li>/);
});

test('formatEventDescriptionHtml renders ul/li and escapes HTML', () => {
  const html = formatEventDescriptionHtml(`${CHECKMARK_SAMPLE}\n\n${DASH_SAMPLE}`);
  assert.match(html, /<ul><li>Как сексуальная революция/);
  assert.match(html, /<li>экскурсия полностью пешая/);
  assert.doesNotMatch(html, /✅/);
  assert.match(formatEventDescriptionHtml('Цена A < B & C'), /A &lt; B &amp; C/);
});

test('existing HTML is sanitized and not re-parsed into lists', () => {
  const raw = '<p>Узнаете:</p><ul><li>Первый</li><li>Второй</li></ul>';
  const html = formatEventDescriptionHtml(raw);
  assert.equal(html, raw);

  const withScript = '<p>Ok</p><script>alert(1)</script><ul><li>A</li></ul>';
  assert.equal(formatEventDescriptionHtml(withScript), '<p>Ok</p><ul><li>A</li></ul>');
});

/** Teplohod-style: landmark lines without bullet markers + paragraph breaks via single newlines. */
const KREMLIN_CRUISE_SAMPLE = `Обзорная речная прогулка от Новоспасского моста – это не просто способ увидеть Москву. За 2 час 30 минут прогулки вы сможете дважды увидеть лучшие достопримечательности Москвы:
 Парящий мост парка Зарядье
 Московский Кремль
 Собор Василия Блаженного
 Храм Христа Спасителя
 Памятник Петру Первому
 ЦПКиО им. Горького
 Московский Дом Музыки
 Прогулка на теплоходе позволит вам увидеть множество известных достопримечательностей Москвы.
 Для вашего удобства предлагается два варианта билетов - с вкуснейшим ланчем и без питания.
 Время в пути кругового маршрута составляет 2 часа 30 минут.`;

test('marker-less landmark lines become ul/li and paragraphs stay split', () => {
  const blocks = parseEventDescriptionBlocks(KREMLIN_CRUISE_SAMPLE);
  assert.equal(blocks[0]?.type, 'paragraph');
  assert.match((blocks[0] as { text: string }).text, /достопримечательности Москвы:$/);
  assert.equal(blocks[1]?.type, 'list');
  assert.equal((blocks[1] as { items: string[] }).items.length, 7);
  assert.equal((blocks[1] as { items: string[] }).items[0], 'Парящий мост парка Зарядье');
  assert.equal((blocks[1] as { items: string[] }).items[6], 'Московский Дом Музыки');
  assert.equal(blocks[2]?.type, 'paragraph');
  assert.match((blocks[2] as { text: string }).text, /Прогулка на теплоходе/);
  assert.equal(blocks[3]?.type, 'paragraph');
  assert.equal(blocks[4]?.type, 'paragraph');

  const html = formatEventDescriptionHtml(KREMLIN_CRUISE_SAMPLE);
  assert.match(html, /<ul><li>Парящий мост парка Зарядье<\/li>/);
  assert.match(html, /<li>Московский Кремль<\/li>/);
  assert.equal((html.match(/<p>/g) || []).length, 4);
  assert.doesNotMatch(html, /Москвы: Парящий/);
});

test('section headings render as h3', () => {
  const html = formatEventDescriptionHtml('Программа\nПервый абзац про маршрут.\nВключено\n- аудиогид\n- ланч');
  assert.match(html, /<h3>Программа<\/h3>/);
  assert.match(html, /<h3>Включено<\/h3>/);
  assert.match(html, /<ul><li>аудиогид<\/li><li>ланч<\/li><\/ul>/);
});

/** TC/Ticketscloud: section title without colon + comma-separated landmark list. */
const TC_RIVER_CRUISE_SAMPLE = `За время экскурсии «Реки и каналы» вы узнаете, что такое Семимостье.

Такая прогулка на теплоходе может быть не только прекрасным времяпрепровождением, но и станет отличным подарком.

Основные достопримечательности

Во время экскурсии вы сможете увидеть Троицкий собор, Семимостье, Никольский собор, Мариинский театр, Новую Голландию, Исаакиевский собор и многие другие достопримечательности города.

Экскурсия проходит на однопalubном теплоходе.

Внимание! При увеличении уровня воды основной маршрут может быть изменен.

Маршрут: р. Фонтанка — Крюков канал — р.Мойка — Зимняя канавка — р. Нева — р.Фонтанка
Продолжительность прогулки: 1 час 5 мин. — 1 час 15 мин.`;

test('TC-style headings, comma lists, label lines and attention', () => {
  const comma = parseCommaSeparatedListAfterIntro(
    'Во время экскурсии вы сможете увидеть Троицкий собор, Семимостье, Никольский собор, Мариинский театр, Новую Голландию, Исаакиевский собор и многие другие достопримечательности города.',
  );
  assert.ok(comma);
  assert.equal(comma!.items.length, 6);
  assert.match(comma!.intro, /увидеть:/i);

  const blocks = parseEventDescriptionBlocks(TC_RIVER_CRUISE_SAMPLE);
  const headings = blocks.filter((b) => b.type === 'heading');
  assert.ok(headings.some((h) => (h as { text: string }).text === 'Основные достопримечательности'));
  assert.ok(headings.some((h) => (h as { text: string }).text === 'Внимание'));
  assert.ok(headings.some((h) => (h as { text: string }).text === 'Маршрут'));
  assert.ok(blocks.some((b) => b.type === 'list'));

  const html = formatEventDescriptionHtml(TC_RIVER_CRUISE_SAMPLE);
  assert.match(html, /<h3>Основные достопримечательности<\/h3>/);
  assert.match(html, /<h3>Внимание<\/h3>/);
  assert.match(html, /<h3>Маршрут<\/h3>/);
  assert.match(html, /<ul><li>Троицкий собор<\/li>/);
  assert.match(html, /р\. Фонтанка - Крюков канал/);
  assert.doesNotMatch(html, /[\u2013\u2014]/);
});
