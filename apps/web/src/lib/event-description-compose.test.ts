import assert from 'node:assert/strict';
import test from 'node:test';

import {
  composeEventDescription,
  fixCopyGlue,
  promoteStraySectionLabels,
  repairEventDescription,
  SELL_LINE,
} from './event-description-compose.ts';
import { buildNarrativeParagraphs } from './event-narrative-description.ts';

/** Real Lyutova-style provider copy: stray "Релиз" line, glued "Состав" tail, lineup. */
const LYUTOVA_SOURCE = `Анастасия Лютова и Лютый Бэнд

Одна из самых ярких певиц российской джазовой сцены с программой "Some Like It Jazz"

Релиз

Анастасия Лютова - одна из самых ярких певиц современной российской джазовой сцены. В программе прозвучат самые яркие образцы жанра в оригинальных аранжировках. В 2019 году коллектив выпустил дебютный альбом на лейбле Venus Records в Японии. Выпускница Российской академии музыки им. Гнесиных, лауреат международных конкурсов, была отмечена премией радио JAZZ 98.1 FM. Киноманам она запомнилась выступлением на закрытии Московского Международного Кинофестиваля 2020. Состав

Анастасия Лютова - вокал
Денис Юрченко - тенор-саксофон
Алексей Подымкин - рояль`;

const LYUTOVA_INPUT = {
  title: 'Анастасия Лютова и Лютый Бенд с программой Some like it jazz',
  city: 'Пенза',
  venue: 'VL Кино (Высшая лига)',
  venueAddress: 'Московская улица, 37',
  category: 'Концерты',
  ageLimit: '6',
  priceFromRub: 1500,
  nextSession: '2026-11-27T19:00:00+03:00',
  futureSessions: 1,
  sourceDescription: LYUTOVA_SOURCE,
  seed: 'evt_lyutova_test',
};

test('compose: stray "Релиз"/glued "Состав" become headings, lineup gets В программе', () => {
  const { text, sourceUsed } = composeEventDescription(LYUTOVA_INPUT);
  assert.equal(sourceUsed, 'source');
  assert.match(text, /## Релиз/);
  assert.match(text, /## В программе/);
  assert.doesNotMatch(text, /2020\. Состав/);
  assert.doesNotMatch(text, /\nСостав\s*$/m);
  // Lineup lines stay provider wording.
  assert.match(text, /Анастасия Лютова - вокал/);
  assert.match(text, /Денис Юрченко - тенор-саксофон/);
  // "В программе" heading must come before the lineup lines.
  const headingAt = text.indexOf('## В программе');
  const lineupAt = text.indexOf('Анастасия Лютова - вокал');
  assert.ok(headingAt >= 0 && lineupAt > headingAt);
});

test('compose: canonical fact block and selling line, facts from catalogue only', () => {
  const { text, flags } = composeEventDescription(LYUTOVA_INPUT);
  assert.equal(flags.practicalInfoAdded, true);
  assert.equal(flags.sellLineAdded, true);
  assert.match(text, /## Практическая информация/);
  assert.match(text, /- Место - «VL Кино \(Высшая лига\)», Пенза/);
  assert.match(text, /- Адрес - Московская улица, 37/);
  assert.match(text, /- Возрастное ограничение - 6\+/);
  assert.match(text, /- Билеты - от 1 500 ₽/);
  assert.ok(text.endsWith(SELL_LINE));
});

test('compose: no long dashes, no fact invention beyond catalogue fields', () => {
  const { text } = composeEventDescription({
    ...LYUTOVA_INPUT,
    sourceDescription: `${LYUTOVA_SOURCE}\n\nНа сцене — живой звук и ужин.`,
  });
  assert.doesNotMatch(text, /[\u2013\u2014\u2212]/);
  assert.match(text, /На сцене - живой звук и ужин\./);
});

test('compose is deterministic and repair(compose) is a fixed point', () => {
  const once = composeEventDescription(LYUTOVA_INPUT).text;
  const twice = composeEventDescription(LYUTOVA_INPUT).text;
  assert.equal(twice, once);
  assert.equal(repairEventDescription(once), once);
});

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('compose: rich Saphath-style copy gets no narrative filler', () => {
  const source = `18 ноября, Санкт-Петербург. Saphath в клубе Рассвет с большим сольным концертом! Группа Saphath из Южно-Сахалинска делает ставку на максимально тяжёлое, мелодичное, мрачное звучание и творческое разнообразие, объединяя в себе элементы симфонического металла, готического металла и дэт-метала.

Начало Meet&Greet в 18:30 - ранний вход без очереди, встреча и фото с артистом, постер с автографом. Открытие дверей: 19:00

Начало концерта: 20:00.`;
  const [narrative] = buildNarrativeParagraphs({ title: 'Saphath', category: 'Концерты' }, 0);
  const { text } = composeEventDescription({
    title: 'Saphath',
    city: 'Санкт-Петербург',
    venue: 'РАССВЕТ',
    category: 'Концерты',
    sourceDescription: source,
    seed: 'evt_saphath_test',
    variant: 0,
  });
  assert.ok(narrative);
  assert.doesNotMatch(text, new RegExp(escapeRe(narrative.slice(0, 24))));
  assert.match(text, /## Практическая информация/);
  assert.ok(text.endsWith(SELL_LINE));
});

test('repair: glued narrative sentences leave the provider paragraph (Saphath glitch)', () => {
  const [narrative] = buildNarrativeParagraphs({ title: 'Saphath', category: 'Концерты' }, 0);
  assert.ok(narrative && narrative.length > 40);
  const stored = `Анонс концерта группы Saphath в клубе Рассвет, большой сольный концерт с тяжёлым звучанием и мрачной лирикой по мотивам классической поэзии.

Начало концерта: 20:00. ${narrative}

## Практическая информация

- Место - «РАССВЕТ», Санкт-Петербург

${SELL_LINE}`;
  const out = repairEventDescription(stored);
  assert.match(out, /Начало концерта: 20:00\./);
  assert.doesNotMatch(out, new RegExp(escapeRe(narrative.slice(0, 24))));
  // Rich card: facts and sell line survive repair untouched.
  assert.match(out, /## Практическая информация/);
  assert.match(out, /- Место - «РАССВЕТ», Санкт-Петербург/);
  assert.ok(out.endsWith(SELL_LINE));
  // Idempotent.
  assert.equal(repairEventDescription(out), out);
});

test('repair: thin card keeps a narrative paragraph as its own block', () => {
  const input = { title: 'Мастер-класс по росписи', category: 'Мастер-классы' };
  const [narrative] = buildNarrativeParagraphs(input, 3);
  const out = repairEventDescription('Мастер-класс по росписи матрёшки.', input, 3);
  assert.ok(narrative);
  const blocks = out.split('\n\n');
  assert.ok(blocks.includes(narrative), 'narrative must be a standalone block');
  assert.equal(blocks[0], 'Мастер-класс по росписи матрёшки.');
});

test('compose: empty source -> lead + narrative + facts + sell line', () => {
  const input = {
    title: 'Концерт группы X',
    city: 'Москва',
    venue: 'Клуб',
    category: 'Концерты',
    sourceDescription: '',
    seed: 'evt_empty_test',
    variant: 2,
  };
  const first = composeEventDescription(input);
  assert.equal(first.sourceUsed, 'minimal');
  assert.match(first.text, /«Концерт группы X» - концерт в Москве, на площадке «Клуб»\./);
  assert.match(first.text, /## Практическая информация/);
  assert.ok(first.text.endsWith(SELL_LINE));
  const [narrative] = buildNarrativeParagraphs({ title: 'Концерт группы X', category: 'Концерты' }, 2);
  assert.ok(first.text.split('\n\n').includes(narrative));
  // Deterministic across runs.
  assert.equal(composeEventDescription(input).text, first.text);
});

test('compose: legacy fact block in source is dropped and rebuilt from catalogue', () => {
  const source = `Короткое описание события с достаточным количеством осмысленного текста для проверки того, что блок фактов пересобирается из полей каталога, а не копируется из описания провайдера. Второе предложение для объёма.

## Практическая информация

- Место - Старая площадка из описания провайдера`;
  const { text } = composeEventDescription({ ...LYUTOVA_INPUT, sourceDescription: source });
  assert.doesNotMatch(text, /Старая площадка/);
  assert.match(text, /## Практическая информация/);
  assert.match(text, /- Место - «VL Кино \(Высшая лига\)», Пенза/);
});

test('promoteStraySectionLabels: standalone and glued labels, idempotent', () => {
  const once = promoteStraySectionLabels('Текст про альбомы.\n\nРелиз\n\nТекст про альбомы вышел в 2019 году.');
  assert.match(once.text, /## Релиз/);
  assert.equal(once.promoted.length, 1);
  const twice = promoteStraySectionLabels(once.text);
  assert.equal(twice.text, once.text);
  assert.equal(twice.promoted.length, 0);
  const glued = promoteStraySectionLabels('Большой текст о певице. Кинофестиваля 2020. Состав');
  assert.equal(glued.promoted[0], 'В программе');
  assert.doesNotMatch(glued.text, /Состав/);
});

test('fixCopyGlue opens quotes and never changes words', () => {
  assert.equal(fixCopyGlue('журнала«Jazz Perspective» вышла пластинка'), 'журнала «Jazz Perspective» вышла пластинка');
  assert.equal(fixCopyGlue('обычный текст без склеек'), 'обычный текст без склеек');
});