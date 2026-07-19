import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatEventDescriptionHtml,
  parseEventDescriptionBlocks,
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
