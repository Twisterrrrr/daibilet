import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractAddressFromListDescription,
  formatListDescription,
  isLogisticsListDescription,
  resolveFeaturedCardTeaserLines,
  splitListDescriptionSentences,
} from './event-card-meta.ts';
import { resolveEventCardLocationLabel } from './event-location.ts';

test('formatListDescription strips meeting-point labels', () => {
  assert.equal(
    formatListDescription('Место встречи: г. Санкт-Петербург, ст.м. пл. Восстания'),
    'г. Санкт-Петербург, ст.м. пл. Восстания',
  );
  assert.equal(
    formatListDescription('Место и время встречи • Адрес: г. Санкт Петербург, ст. м. «Площадь»'),
    'г. Санкт Петербург, ст. м. «Площадь»',
  );
});

test('formatListDescription keeps at most three sentences', () => {
  const long =
    'Первое предложение про квиз. Второе - про стендап. Третье про караоке. Четвёртое уже лишнее. Пятое тоже.';
  const clipped = formatListDescription(long);
  assert.equal(clipped, 'Первое предложение про квиз. Второе - про стендап. Третье про караоке.');
});

test('formatListDescription does not split on city abbreviations', () => {
  assert.equal(
    formatListDescription(
      'Шоу в г. Санкт-Петербурге у м. Маяковская. Второй абзац. Третий абзац. Четвёртый лишний.',
    ),
    'Шоу в г. Санкт-Петербурге у м. Маяковская. Второй абзац. Третий абзац.',
  );
});

test('formatListDescription clips long unpunctuated supplier dumps', () => {
  const long = `${'Слово '.repeat(80)}ещё хвост про билеты и депозит без точек вообще`;
  const clipped = formatListDescription(long);
  assert.ok(clipped.length <= 330, `got ${clipped.length}`);
  assert.match(clipped, /…$/);
});

test('splitListDescriptionSentences returns one line per teaser sentence', () => {
  const long =
    'Первое предложение про квиз. Второе - про стендап. Третье про караоке. Четвёртое уже лишнее.';
  assert.deepEqual(splitListDescriptionSentences(long), [
    'Первое предложение про квиз.',
    'Второе - про стендап.',
    'Третье про караоке.',
  ]);
});

test('splitListDescriptionSentences does not split on city abbreviations', () => {
  assert.deepEqual(
    splitListDescriptionSentences(
      'Шоу в г. Санкт-Петербурге у м. Маяковская. Второй абзац. Третий абзац.',
    ),
    ['Шоу в г. Санкт-Петербурге у м. Маяковская.', 'Второй абзац.', 'Третий абзац.'],
  );
});

test('formatListDescription keeps lowercase sentence starts after period', () => {
  const long =
    'Первая мысль про джаз. вторая мысль без заглавной. третья тоже. четвёртая уже лишняя.';
  assert.equal(
    formatListDescription(long),
    'Первая мысль про джаз. вторая мысль без заглавной. третья тоже.',
  );
});

test('isLogisticsListDescription detects supplier address dumps', () => {
  assert.equal(
    isLogisticsListDescription('Место встречи: г. Санкт-Петербург, ст.м. пл. Восстания'),
    true,
  );
  assert.equal(
    isLogisticsListDescription('Река Карповка, парадная акватория Невы, известные дворцы.'),
    false,
  );
});

test('extractAddressFromListDescription only for logistics text', () => {
  assert.equal(
    extractAddressFromListDescription('Место встречи: ул. Итальянская, 5'),
    'ул. Итальянская, 5',
  );
  assert.equal(extractAddressFromListDescription('Космическое путешествие под куполом'), '');
});

test('resolveFeaturedCardTeaserLines splits marketing copy into 1–2 paragraphs', () => {
  const lines = resolveFeaturedCardTeaserLines(
    'Пешком по стенам центра: дворы и крупные росписи. Гид расскажет про авторов и безопасные точки для фото.',
  );
  assert.equal(lines.length, 2);
  assert.match(lines[0]!, /Пешком/);
  assert.match(lines[1]!, /Гид/);
});

test('resolveFeaturedCardTeaserLines pads single sentence with structural second line', () => {
  const lines = resolveFeaturedCardTeaserLines(
    'Спокойный маршрут по набережной с короткими остановками для фото и видом на реку без гонки.',
    { category: 'Экскурсии', city: 'Пермь', duration: '2 часа' },
  );
  assert.equal(lines.length, 2);
  assert.match(lines[0]!, /набережной/);
  assert.match(lines[1]!, /2 часа/);
});

test('resolveFeaturedCardTeaserLines falls back when description is logistics', () => {
  const lines = resolveFeaturedCardTeaserLines('Место встречи: ул. Ленина, 1', {
    category: 'Экскурсии',
    city: 'Пермь',
    venue: 'Набережная',
    duration: '2 часа',
  });
  assert.equal(lines.length, 2);
  assert.match(lines[0]!, /Экскурсии в Пермь/);
  assert.match(lines[1]!, /2 часа/);
});

test('resolveEventCardLocationLabel prefers street address over venue name', () => {
  assert.equal(
    resolveEventCardLocationLabel({
      venue: 'Планетарий 1',
      venueAddress: 'Александровский парк, 4',
      city: 'Санкт-Петербург',
    }),
    'ул. Александровский парк, 4',
  );
});
