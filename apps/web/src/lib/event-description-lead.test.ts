import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicEventDto } from '@daibilet/contracts/public';

import { ARTIST_BIOS } from '../data/artist-bios.ts';
import { formatEventDescriptionHtml } from './event-description-format.ts';
import {
  buildConcertIntro,
  buildConcertLead,
  isConcertLikeEvent,
  lookupArtistBio,
  normalizeArtistKey,
  withConcertLead,
} from './event-description-lead.ts';

const SOVA = {
  title: 'Сова',
  category: 'Мероприятия',
  subcategories: ['Инди'],
  tags: ['Инди'],
  venue: 'ПЛАТФОРМА',
  city: 'Москва',
} as PublicEventDto;

const GENERIC_SOVA_DESCRIPTION = [
  'Сова - мероприятие в Смоленске, на площадке «1865». Программа идёт от начала до конца в одном зале: зрители находятся внутри действия, а не смотрят его со стороны. Программа идёт своим ритмом: есть время и на основное действие, и на то, чтобы осмотреться и перевести дух. Подойдёт и опытным гостям, и тем, кто приходит на такое впервые. После работы - самое время переключиться.',
  '',
  '## Практическая информация',
  '',
  '- Место - «ПЛАТФОРМА», Москва',
  '- Ближайшая дата - 17 декабря 2026, 17:00',
  '- Билеты - от 2 500 ₽',
].join('\n');

test('builds an artist-first concert lead from the event fields', () => {
  assert.equal(
    buildConcertLead(SOVA),
    '«Сова» - инди-концерт на площадке «ПЛАТФОРМА» в Москве.',
  );
  assert.equal(isConcertLikeEvent(SOVA), true);
});

test('replaces only a generated generic lead and keeps the practical block', () => {
  const out = withConcertLead({ ...SOVA, description: GENERIC_SOVA_DESCRIPTION } as PublicEventDto);
  assert.match(out, /^«Сова» - инди-концерт на площадке «ПЛАТФОРМА» в Москве\./);
  assert.doesNotMatch(out, /Смоленске|1865|Программа идёт|После работы|перевести дух/);
  assert.match(out, /## Практическая информация/);
  assert.match(out, /- Билеты - от 2 500 ₽/);
});

test('provider biographies and non-concert events stay untouched', () => {
  const bio = [
    '«Сова» - московская инди-группа, играет на стыке гитарного рока и электроники.',
    '',
    'В программе - материал нового альбома.',
  ].join('\n');
  assert.equal(withConcertLead({ ...SOVA, description: bio } as PublicEventDto), bio);

  const exhibition = {
    title: 'Выставка современного искусства',
    category: 'Музеи и арт',
    subcategories: ['Выставки'],
    tags: ['Выставки'],
    venue: 'Галерея',
    city: 'Москва',
    description: 'Выставка работает до конца месяца.',
  } as PublicEventDto;
  assert.equal(isConcertLikeEvent(exhibition), false);
  assert.equal(withConcertLead(exhibition), exhibition.description);
});

test('rendered concert copy has no nearest-session date', () => {
  const html = formatEventDescriptionHtml(
    withConcertLead({ ...SOVA, description: GENERIC_SOVA_DESCRIPTION } as PublicEventDto),
  );
  assert.match(html, /^<p>«Сова» - инди-концерт/);
  assert.doesNotMatch(html, /Ближайшая дата|17 декабря 2026|17:00/);
});

test('concert lead without a venue or city stays short', () => {
  assert.equal(
    buildConcertLead({
      title: 'Сова',
      category: 'Концерты',
      tags: ['Инди'],
      venue: '',
      city: '',
    }),
    '«Сова» - инди-концерт.',
  );
});

test('adds a verified artist bio from the registry', () => {
  const intro = buildConcertIntro(SOVA);
  assert.match(intro, /^«Сова» - инди-концерт на площадке «ПЛАТФОРМА» в Москве\./);
  assert.match(intro, /Екатеринбургская группа, основанная в 2017 году/);
  assert.match(intro, /инди-попа и пост-панка/);
  assert.doesNotMatch(intro, /—|–/);
});

test('artist key ignores venue parentheses and generic prefixes', () => {
  assert.equal(normalizeArtistKey('Группа «Сова» (Москва)'), 'сова');
  assert.equal(normalizeArtistKey('Концерт группы Сова'), 'сова');
  assert.equal(normalizeArtistKey('Сова. Большой концерт'), 'сова');
  assert.equal(normalizeArtistKey('Би-2'), 'би 2');
});

test('does not attach the Sova bio to a different act', () => {
  assert.equal(lookupArtistBio('Сова и волки'), undefined);
  assert.equal(lookupArtistBio('Сова. Большой концерт')?.artist, 'Сова');
});

test('matches top artists through tour-title noise', () => {
  assert.equal(
    lookupArtistBio('Нурминский | Саратов | 23 октября | Harat’s Pub')?.artist,
    'Нурминский',
  );
  assert.equal(lookupArtistBio('МЕГАМОЗГ - ПРЕЗЕНТАЦИЯ АЛЬБОМА')?.artist, 'МЕГАМОЗГ');
  assert.equal(lookupArtistBio('Интонация. Хиты сериала Молодёжка')?.artist, 'Интонация');
  assert.equal(lookupArtistBio('Света Соллар'), undefined);
});

test('top artist intro carries the registered bio', () => {
  const intro = buildConcertIntro({
    title: 'Нурминский | Саратов | 23 октября | Harat’s Pub',
    category: 'Концерты',
    tags: ['Рэп/Хип-хоп'],
    venue: 'Harat’s Pub',
    city: 'Саратов',
  });
  assert.match(intro, /^«Нурминский» - рэп-концерт/);
  assert.match(intro, /Рэпер из Татарстана/);
  assert.match(intro, /Tatlanta Music/);
});

test('a noisy tour title is replaced by the registered artist lead', () => {
  const raw =
    'Нурминский | Саратов | 23 октября | Harat’s Pub - мероприятие в Смоленске, на площадке «1865».';
  const out = withConcertLead({
    title: 'Нурминский | Саратов | 23 октября | Harat’s Pub',
    category: 'Концерты',
    tags: ['Рэп/Хип-хоп'],
    venue: 'Harat’s Pub',
    city: 'Саратов',
    description: raw,
  } as PublicEventDto);
  assert.match(out, /^«Нурминский» - рэп-концерт/);
  assert.doesNotMatch(out, /Смоленске|1865/);
  assert.match(out, /Рэпер из Татарстана/);
});

test('registered artists resolve through their aliases', () => {
  assert.equal(lookupArtistBio('Lizer')?.artist, 'Lizer');
  assert.equal(lookupArtistBio('Anna Asti | Москва')?.artist, 'Anna Asti');
  assert.equal(lookupArtistBio('Мираж')?.artist, 'Мираж');
  assert.equal(lookupArtistBio('Сергей Маврин')?.artist, 'Сергей Маврин');
  assert.equal(lookupArtistBio('Многоточие')?.artist, 'Многоточие');
  assert.equal(
    lookupArtistBio('Анастасия Высоцкая LADYNSAX - 18 октября в Екатеринбурге')?.artist,
    'Анастасия Высоцкая LADYNSAX',
  );
  assert.equal(lookupArtistBio('Питоны 3000 |25.03.2027| Ижевск')?.artist, 'Питоны 3000');
});

test('artist bios use a hyphen, not a long dash', () => {
  for (const entry of ARTIST_BIOS) {
    assert.doesNotMatch(entry.bio, /[—–]/u, entry.artist);
    assert.ok(entry.sourceUrl.startsWith('https://'), entry.artist);
  }
});

test('an empty concert description gets a factual intro', () => {
  const out = withConcertLead({ ...SOVA, description: '' } as PublicEventDto);
  assert.match(out, /^«Сова» - инди-концерт/);
  assert.match(out, /2017/);
});

test('an already applied bio is not duplicated', () => {
  const raw = `${buildConcertIntro(SOVA)}\n\nПрограмма идёт своим ритмом.`;
  const out = withConcertLead({ ...SOVA, description: raw } as PublicEventDto);
  assert.equal(out.match(/Екатеринбургская группа/gu)?.length, 1);
  assert.doesNotMatch(out, /Программа идёт/);
});
