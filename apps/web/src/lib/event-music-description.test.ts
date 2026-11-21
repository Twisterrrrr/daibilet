import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMusicEventLead,
  isMusicEvent,
  rewriteMusicEventDescription,
} from './event-music-description.ts';
import { normalizeUserFacingCopy } from './event-description-format.ts';

const SOVA = {
  title: 'Сова',
  category: 'Мероприятия',
  tags: ['Инди'],
  subcategories: ['Инди'],
  city: 'Москва',
  venue: 'ПЛАТФОРМА',
};

const SOVA_RAW = [
  'Сова - мероприятие в Смоленске, на площадке «1865». Программа идёт от начала до конца в одном зале: зрители находятся внутри действия, а не смотрят его со стороны. Программа идёт своим ритмом: есть время и на основное действие, и на то, чтобы осмотреться и перевести дух. Подойдёт и опытным гостям, и тем, кто приходит на такое впервые. После работы - самое время переключиться.',
  '',
  '## Практическая информация',
  '',
  '- Место - «ПЛАТФОРМА», Москва',
  '- Адрес - ул. Смирновская, д. 2, стр. 1.',
  '- Ближайшая дата - 17 декабря 2026, 17:00',
  '- Продолжительность - около 120 минут',
  '- Возрастное ограничение - 12+',
  '- Билеты - от 2 500 ₽',
].join('\n');

test('music detector keeps genre concerts and drops stand-up with pop tags', () => {
  assert.equal(isMusicEvent(SOVA), true);
  assert.equal(
    isMusicEvent({
      title: 'Константин Бутаков',
      category: 'Мероприятия',
      tags: ['Stand up', 'Поп', 'Шоу - программа', 'Эстрада'],
      city: 'Барнаул',
      venue: 'Паб URBAN',
    }),
    false,
  );
});

test('genre label is derived from the event tag', () => {
  assert.equal(buildMusicEventLead(SOVA), '«Сова» - инди-концерт на площадке «ПЛАТФОРМА» в Москве.');
  assert.match(
    buildMusicEventLead({ ...SOVA, tags: ['Классика'] }),
    /классический концерт/,
  );
  assert.match(buildMusicEventLead({ ...SOVA, tags: ['Джаз'] }), /джазовый концерт/);
  assert.match(buildMusicEventLead({ ...SOVA, tags: ['Рэп/Хип-хоп'] }), /рэп-концерт/);
});

test('generic lead with another city and venue is replaced, Prak block is kept', () => {
  const out = rewriteMusicEventDescription(SOVA, SOVA_RAW);
  assert.match(out, /^«Сова» - инди-концерт на площадке «ПЛАТФОРМА» в Москве\./);
  assert.doesNotMatch(out, /Смоленске|1865|Программа идёт|После работы|перевести дух/);
  assert.match(out, /## Практическая информация/);
  assert.match(out, /- Место - «ПЛАТФОРМА», Москва/);
  assert.match(out, /- Билеты - от 2 500 ₽/);
});

test('a real provider bio is not overwritten', () => {
  const bio = [
    '«Сова» - инди-группа из Москвы. На концерте прозвучат новые песни и уже знакомые треки.',
    '',
    '## Практическая информация',
    '',
    '- Место - «ПЛАТФОРМА», Москва',
  ].join('\n');
  assert.equal(rewriteMusicEventDescription(SOVA, bio), bio);
});

test('generic wording is removed even when the city is correct', () => {
  const raw = 'Сова - мероприятие в Москве, на площадке «ПЛАТФОРМА». Программа идёт своим ритмом.';
  const out = rewriteMusicEventDescription(SOVA, raw);
  assert.equal(out, '«Сова» - инди-концерт на площадке «ПЛАТФОРМА» в Москве.');
});

test('non-music events are left untouched', () => {
  const raw = 'Константин Бутаков - мероприятие в Барнауле. Программа идёт своим ритмом.';
  assert.equal(
    rewriteMusicEventDescription(
      {
        title: 'Константин Бутаков',
        category: 'Мероприятия',
        tags: ['Stand up', 'Поп'],
        city: 'Барнаул',
        venue: 'Паб URBAN',
      },
      raw,
    ),
    raw,
  );
});

test('title already carrying the city does not duplicate it', () => {
  const lead = buildMusicEventLead({ ...SOVA, title: 'Сова в Москве' });
  assert.equal(lead, '«Сова в Москве» - инди-концерт на площадке «ПЛАТФОРМА».');
});

test('ballet and theatre are not rewritten as concerts', () => {
  assert.equal(
    isMusicEvent({
      title: 'Спящая красавица',
      category: 'Мероприятия',
      tags: ['Балет', 'Искусство', 'Классика', 'Музыкальный театр', 'Спектакль'],
      city: 'Москва',
      venue: 'Театр',
    }),
    false,
  );
  assert.equal(
    isMusicEvent({
      title: 'Спектакль с оркестром',
      category: 'Мероприятия',
      tags: ['Классика', 'Драма'],
      city: 'Москва',
      venue: 'Театр',
    }),
    false,
  );
});

test('a registered artist name replaces a noisy tour title', () => {
  const lead = buildMusicEventLead(
    {
      title: 'Нурминский | Саратов | 23 октября | Harat’s Pub',
      category: 'Концерты',
      tags: ['Рэп/Хип-хоп'],
      city: 'Саратов',
      venue: 'Harat’s Pub',
    },
    'Нурминский',
  );
  assert.equal(lead, '«Нурминский» - рэп-концерт на площадке «Harat’s Pub» в Саратове.');
});

test('a correct city in another case does not trigger a rewrite', () => {
  const ufa = {
    title: 'ГДЕ МОЙ 2008? @ОГНИ УФЫ',
    category: 'Мероприятия',
    tags: ['Электроника'],
    city: 'Уфа',
    venue: 'Огни Уфы',
  };
  const raw =
    'Мероприятие «ГДЕ МОЙ 2008? @ОГНИ УФЫ» в Уфе, на площадке «Огни Уфы». ## В эту ночь мы открываем портал в ту эпоху: клубные хиты 2008-го.';
  const out = rewriteMusicEventDescription(ufa, raw);
  assert.equal(out, raw);
});

test('a provider mention of another country does not truncate the bio', () => {
  const raw =
    'В субботу в клубе пройдёт вечеринка с резидентами, которые выступали в России и на Ибице. Гости услышат клубные хиты 2008 года.';
  assert.equal(rewriteMusicEventDescription(SOVA, raw), raw);
});

test('normalizeUserFacingCopy keeps newlines around list dashes', () => {
  const text = '## Практическая информация\n\n- Место - Москва\n- Билеты - от 500 ₽';
  assert.equal(normalizeUserFacingCopy(text), text);
  assert.equal(normalizeUserFacingCopy('Москва — Питер'), 'Москва - Питер');
});

test('long dashes in a title are normalized to a hyphen', () => {
  const lead = buildMusicEventLead({ ...SOVA, title: 'Сова — Большой концерт' });
  assert.doesNotMatch(lead, /[—–]/u);
  assert.match(lead, /Сова - Большой концерт/);
});

test('venue-show filler is replaced with a factual lead', () => {
  const sveta = {
    title: 'Света. Большой сольный концерт',
    category: 'Мероприятия',
    tags: ['Поп', 'Эстрада'],
    city: 'Москва',
    venue: 'TAU',
  };
  const raw =
    'Большой сольный концерт в Москве. Вечер живой музыки: программа исполняется на сцене, а зал становится частью выступления. Певица Света с грандиозной сольной программой!';
  const out = rewriteMusicEventDescription(sveta, raw);
  assert.equal(out, '«Света. Большой сольный концерт» на площадке «TAU» в Москве.');
  assert.doesNotMatch(out, /Вечер живой музыки|зал становится частью выступления/);
});
