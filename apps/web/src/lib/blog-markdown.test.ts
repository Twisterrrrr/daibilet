import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isUsableBlogHref,
  parseGuideStructure,
  parseHeadingLine,
  parseNoteBlock,
  slugifyBlogHeading,
  tokenizeInlineMarkdown,
} from './blog-markdown';

describe('blog-markdown inline', () => {
  it('parses markdown links with real href (relative CHPU ok)', () => {
    const tokens = tokenizeInlineMarkdown(
      'Смотрите [экскурсии по Казани](/ekskursii/kazan/) и [речные](https://daibilet.ru/rechnye-progulki/kazan/).',
    );
    const links = tokens.filter((t) => t.type === 'link');
    assert.equal(links.length, 2);
    assert.deepEqual(links[0], {
      type: 'link',
      text: 'экскурсии по Казани',
      href: '/ekskursii/kazan/',
    });
    assert.equal(links[1].type, 'link');
    if (links[1].type === 'link') {
      assert.equal(links[1].href, 'https://daibilet.ru/rechnye-progulki/kazan/');
    }
  });

  it('does not invent empty href anchors', () => {
    const tokens = tokenizeInlineMarkdown('[пусто]() и [пробел](   )');
    assert.ok(tokens.every((t) => t.type !== 'link'));
    assert.equal(isUsableBlogHref(''), false);
    assert.equal(isUsableBlogHref('  '), false);
    assert.equal(isUsableBlogHref('/blog'), true);
  });

  it('wraps price phrases as price tokens without eating surrounding text', () => {
    const tokens = tokenizeInlineMarkdown(
      'Билет от 350 ₽, ещё 1 000 рублей и от 850 руб. на входе.',
    );
    const prices = tokens.filter((t) => t.type === 'price').map((t) => (t.type === 'price' ? t.value : ''));
    assert.ok(prices.some((p) => /от\s+350\s*₽/.test(p)));
    assert.ok(prices.some((p) => /1\s*000\s*рублей/.test(p)));
    assert.ok(prices.some((p) => /от\s+850\s*руб/.test(p)));
    assert.ok(tokens.some((t) => t.type === 'text' && t.value.includes('Билет')));
  });

  it('keeps prices inside link labels as link text, not separate price tokens in href', () => {
    const tokens = tokenizeInlineMarkdown('[от 300 ₽](/events/standup)');
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].type, 'link');
    if (tokens[0].type === 'link') {
      assert.equal(tokens[0].text, 'от 300 ₽');
      assert.equal(tokens[0].href, '/events/standup');
    }
  });
});

describe('blog headings', () => {
  it('parses # ## ### with required space', () => {
    assert.deepEqual(parseHeadingLine('## День 1'), { level: 2, text: 'День 1' });
    assert.deepEqual(parseHeadingLine('### Когда нужен гид'), { level: 3, text: 'Когда нужен гид' });
    assert.deepEqual(parseHeadingLine('# Lead'), { level: 1, text: 'Lead' });
    assert.equal(parseHeadingLine('##без-пробела'), null);
  });

  it('slugifies headings for anchors', () => {
    assert.equal(slugifyBlogHeading('Что посмотреть в Казани'), 'что-посмотреть-в-казани');
    assert.match(slugifyBlogHeading('Ссылка [гид](/blog/x)'), /гид/);
  });
});

describe('NOTE shortcode', () => {
  it('parses NOTE with nested markdown link inside text=', () => {
    const note = parseNoteBlock(
      '[NOTE label="Важно" text="Форматы: [экскурсии по Казани](https://daibilet.ru/ekskursii/kazan/)."]',
    );
    assert.ok(note);
    assert.equal(note!.label, 'Важно');
    assert.match(note!.text, /экскурсии по Казани/);
    assert.match(note!.text, /https:\/\/daibilet\.ru\/ekskursii\/kazan\//);
  });

  it('parses bare NOTE without brackets', () => {
    const note = parseNoteBlock(
      'NOTE label="Совет" text="Смотрите [стендап](/stendap-i-yumor/ekaterinburg/)."',
    );
    assert.ok(note);
    assert.equal(note!.label, 'Совет');
    assert.match(note!.text, /стендап/);
  });
});

describe('parseGuideStructure hierarchy', () => {
  it('emits h2/h3/note/paragraph with links preserved in source text', () => {
    const md = [
      '## Первый день',
      '',
      'Текст с [экскурсиями](/ekskursii/kazan/).',
      '',
      '### Когда нужен гид',
      '',
      '[NOTE label="Важно" text="Берите [тур](https://daibilet.ru/ekskursii/kazan/)."]',
      '',
      'Билет от 500 ₽.',
    ].join('\n');

    const blocks = parseGuideStructure(md);
    assert.equal(blocks[0]?.type, 'h2');
    assert.equal(blocks[1]?.type, 'paragraph');
    assert.match(String(blocks[1]?.text), /\[экскурсиями\]\(\/ekskursii\/kazan\/\)/);
    assert.equal(blocks[2]?.type, 'h3');
    assert.equal(blocks[3]?.type, 'note');
    assert.match(String(blocks[3]?.note?.text), /https:\/\/daibilet\.ru\/ekskursii\/kazan\//);
    assert.equal(blocks[4]?.type, 'paragraph');
    assert.match(String(blocks[4]?.text), /от 500 ₽/);
  });
});
