import { normalizeUserFacingCopy } from './event-description-format.ts';
import { cityPrepositional } from './event-minimal-description.ts';

/**
 * Music cards used to get a generic "мероприятие в <city>" lead plus narrative
 * filler ("Программа идёт своим ритмом", "После работы - самое время..."). That
 * copy does not name the act and sometimes carries a city/venue from another
 * event in the cluster. This module rebuilds the lead from the event's own
 * title, genre tag, venue and city. It never invents a biography: real provider
 * facts are kept, template sentences are dropped.
 */

export type MusicEventLike = {
  title?: string | null;
  category?: string | null;
  tags?: string[] | null;
  subcategories?: string[] | null;
  city?: string | null;
  venue?: string | null;
};

const STRONG_MUSIC_TAGS = new Set([
  'рок',
  'инди',
  'рэп/хип-хоп',
  'рэп',
  'хип-хоп',
  'джаз',
  'классика',
  'неоклассика',
  'электроника',
  'металл',
  'метал',
  'панк',
  'фолк',
  'шансон',
  'блюз',
  'регги',
  'кантри',
  'опера',
  'симфони',
  'орган',
  'world music',
  'фанк',
  'альтернатива',
  'авторская песня',
  'бард',
]);

const WEAK_MUSIC_TAGS = new Set(['поп', 'эстрада']);
const NON_MUSIC_TAGS = new Set([
  'stand up',
  'стендап',
  'юмор',
  'комедия',
  'импровизация',
  'балет',
  'спектакль',
  'театр',
  'музыкальный театр',
  'драма',
  'мюзикл',
  'выставка',
  'экскурсия',
]);

function eventTags(event: MusicEventLike): string[] {
  return [...(event.tags || []), ...(event.subcategories || [])]
    .map((tag) => String(tag || '').toLowerCase().trim())
    .filter(Boolean);
}

export function isMusicEvent(event: MusicEventLike): boolean {
  const tags = eventTags(event);
  if (tags.some((tag) => NON_MUSIC_TAGS.has(tag))) return false;
  if (tags.some((tag) => STRONG_MUSIC_TAGS.has(tag))) return true;
  if (/концерт/iu.test(String(event.category || ''))) return true;
  const hasWeak = tags.some((tag) => WEAK_MUSIC_TAGS.has(tag));
  return hasWeak;
}

const GENRE_LABELS: Array<[RegExp, string]> = [
  [/неоклассик/u, 'неоклассический концерт'],
  [/классик/u, 'классический концерт'],
  [/джаз/u, 'джазовый концерт'],
  [/блюз/u, 'блюзовый концерт'],
  [/симфони/u, 'симфонический концерт'],
  [/орган/u, 'органный концерт'],
  [/опер/u, 'оперный концерт'],
  [/эстрад/u, 'эстрадный концерт'],
  [/альтернатив/u, 'альтернативный концерт'],
  [/рок/u, 'рок-концерт'],
  [/инди/u, 'инди-концерт'],
  [/рэп|хип-хоп/u, 'рэп-концерт'],
  [/поп/u, 'поп-концерт'],
  [/фолк/u, 'фолк-концерт'],
  [/металл|метал/u, 'метал-концерт'],
  [/панк/u, 'панк-концерт'],
  [/фанк/u, 'фанк-концерт'],
  [/регги/u, 'регги-концерт'],
  [/кантри/u, 'кантри-концерт'],
  [/шансон/u, 'концерт шансона'],
  [/world music/u, 'концерт world music'],
  [/авторская песня|бард/u, 'концерт авторской песни'],
];

function pickGenre(event: MusicEventLike): string | null {
  for (const tag of eventTags(event)) {
    for (const [re, label] of GENRE_LABELS) {
      if (re.test(tag)) return label;
    }
  }
  return null;
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-zа-яё0-9]/gu, '');
}

function cityStem(city: string): string {
  const value = normalized(city);
  return value.slice(0, Math.min(4, value.length));
}

/** Shorter stem for case forms: "Уфа" → "уф" matches "в Уфе". */
function cityMatchStem(city: string): string {
  const value = normalized(city);
  return value.slice(0, value.length <= 4 ? 2 : 4);
}

/** First prose block: not a markdown heading and not a list. */
function isProseBlock(block: string): boolean {
  const text = block.trim();
  if (!text) return false;
  return !/^(?:##\s|[-*]\s|\d+[.)]\s)/u.test(text);
}

const GENERIC_MARKERS = [
  'мероприятие в ',
  'программа идёт от начала до конца',
  'программа идет от начала до конца',
  'зрители находятся внутри действия',
  'программа идёт своим ритмом',
  'программа идет своим ритмом',
  'есть время и на основное действие',
  'подойдёт и опытным гостям',
  'подойдет и опытным гостям',
  'после работы - самое время переключиться',
  'тем, кто приходит на такое впервые',
  'перевести дух',
  'вечер живой музыки',
  'программа исполняется на сцене',
  'зал становится частью выступления',
  'музыка со сцены звучит иначе',
  'такие вечера ценят за настроение',
  'особая энергия вечера',
];

function hasGenericMarker(text: string): boolean {
  const lower = text.toLowerCase();
  return GENERIC_MARKERS.some((marker) => lower.includes(marker));
}

const CITY_IN_LEAD_RE =
  /(?:мероприятие|программа|концерт|выступление|шоу)\s+(?:идёт\s+|идет\s+)?в\s+([А-ЯЁ][а-яё-]+)/iu;

/**
 * Only the generated "мероприятие в <город>" lead can claim a foreign city.
 * A provider text may mention "в России" or another city in a later sentence
 * without being wrong, so a bare " в <слово>" match is not enough.
 */
function foreignCityIn(text: string, city: string | null | undefined): boolean {
  const value = String(city || '').trim();
  const stem = cityMatchStem(value);
  if (!stem) return false;
  const match = text.match(CITY_IN_LEAD_RE);
  if (!match) return false;
  return !normalized(match[1] || '').includes(stem);
}

function foreignVenueIn(text: string, venue: string | null | undefined): boolean {
  const value = String(venue || '').trim();
  if (!value) return false;
  const expected = normalized(value);
  const matches = [
    ...text.matchAll(/(?:на площадке|в (?:клубе|зале|театре|баре|ресторане))\s+«([^»]+)»/giu),
  ];
  if (!matches.length) return false;
  return matches.some((match) => {
    const got = normalized(match[1] || '');
    if (!got) return false;
    return !got.includes(expected.slice(0, 5)) && !expected.includes(got.slice(0, 5));
  });
}

function contradictsLocation(text: string, event: MusicEventLike): boolean {
  return foreignCityIn(text, event.city) || foreignVenueIn(text, event.venue);
}

export function buildMusicEventLead(event: MusicEventLike, artistName?: string): string {
  const rawTitle = normalizeUserFacingCopy(String(event.title || '').trim());
  const title = normalizeUserFacingCopy(String(artistName || rawTitle).trim());
  if (!title) return '';
  const titleNormalized = normalized(title);
  const genre = pickGenre(event);
  const titleHasFormat = /(?:концерт|шоу|фестивал|стендап)/iu.test(title);
  const parts = [titleHasFormat ? `«${title}»` : `«${title}» - ${genre || 'концерт'}`];

  const venue = normalizeUserFacingCopy(String(event.venue || '').trim());
  const venueKey = normalized(venue).slice(0, 5);
  if (venue && !(venueKey && titleNormalized.includes(venueKey))) {
    parts.push(`на площадке «${venue}»`);
  }

  const city = normalizeUserFacingCopy(String(event.city || '').trim());
  const cityKey = cityStem(city);
  if (city && !(cityKey && titleNormalized.includes(cityKey))) {
    const inCity = cityPrepositional(city) || city;
    parts.push(`в ${inCity}`);
  }

  return `${parts.join(' ')}.`;
}

function removeGenericSentences(block: string): string {
  return block
    .split(/(?<=[.!?…])\s+/u)
    .filter((sentence) => !hasGenericMarker(sentence))
    .join(' ')
    .trim();
}

/**
 * Rewrite only the generic/wrong lead of a music card. A real provider bio is
 * kept as is; template sentences after it are still removed.
 */
export function rewriteMusicEventDescription(
  event: MusicEventLike,
  raw: string | null | undefined,
): string {
  if (!isMusicEvent(event)) return String(raw || '');
  const text = String(raw || '').trim();
  if (!text) return text;

  const blocks = text.split(/\n{2,}/);
  const firstProse = blocks.findIndex(isProseBlock);
  if (firstProse < 0) return text;

  const replaceLead =
    hasGenericMarker(blocks[firstProse]) || contradictsLocation(blocks[firstProse], event);

  const cleaned = blocks
    .map((block, index) => {
      if (index === firstProse && replaceLead) return '';
      if (!isProseBlock(block)) return block;
      return removeGenericSentences(block);
    })
    .filter((block) => block.trim());

  const lead = replaceLead ? buildMusicEventLead(event) : '';
  return [lead, ...cleaned].join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

