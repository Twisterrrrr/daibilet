/**
 * Minimal factual description builder for events that have no provider copy.
 *
 * Owner task 2026-10-11: cards without any description should get at least a
 * short two-paragraph text. The builder never invents facts: it only uses
 * fields already present in the catalogue (title, city, venue, address,
 * category, next session, duration from sessions, price, age limit).
 *
 * Output contract matches formatEventDescriptionHtml:
 * - `## Заголовок` (rendered as H3), `- item` lists, blank-line paragraphs.
 */

import { normalizeUserFacingCopy } from './event-description-format.ts';

export type MinimalDescriptionInput = {
  title: string;
  city?: string | null;
  venue?: string | null;
  venueAddress?: string | null;
  category?: string | null;
  subcategory?: string | null;
  kind?: string | null;
  nextSession?: string | Date | null;
  futureSessions?: number | null;
  durationMin?: number | null;
  priceFromRub?: number | null;
  ageLimit?: string | null;
};

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/** Category -> neutral noun phrase about the format. Never a fact claim. */
const CATEGORY_FORMAT: Array<[RegExp, string]> = [
  [/концерт|музык|филармони|оркестр|джаз|рок/iu, 'концерт'],
  [/спектакл|театр|перформанс|мюзикл/iu, 'спектакль'],
  [/экскурс|прогулк|круиз|теплоход|речн/iu, 'экскурсия'],
  [/мастер-класс|мастер.?класс|творческ/iu, 'мастер-класс'],
  [/выставк|экспозиц|музе|полотн|живопис|галере/iu, 'выставка'],
  [/квест/iu, 'квест'],
  [/стендап|стенд-ап/iu, 'стендап-концерт'],
  [/цирк|шоу|шапито/iu, 'шоу'],
  [/фестивал/iu, 'фестиваль'],
  [/спорт|матч|игр(а|ы) с/iu, 'спортивное событие'],
];

/**
 * Russian city names in the prepositional case ("в Москве", "в Бийске").
 * Heuristic morphology with a small dictionary of exceptions; indeclinable
 * names (Сочи, Тбилиси, …) stay as-is. Never used for anything but "в {city}".
 */
const CITY_PREPOSITIONAL: Record<string, string> = {
  москва: 'Москве',
  'санкт-петербург': 'Санкт-Петербурге',
  петербург: 'Петербурге',
  сочи: 'Сочи',
  казань: 'Казани',
  пермь: 'Перми',
  тверь: 'Твери',
  'нижний новгород': 'Нижнем Новгороде',
  'великий новгород': 'Великом Новгороде',
  'петропавловск-камчатский': 'Петропавловске-Камчатском',
  тольятти: 'Тольятти',
  батуми: 'Батуми',
  сухум: 'Сухуме',
  // Plural / indeclinable forms fixed during the live audit (2026-10-11):
  химки: 'Химках',
  мытищи: 'Мытищах',
  'набережные челны': 'Набережных Челнах',
  балтаси: 'Балтасях',
  рославль: 'Рославле',
  севастополь: 'Севастополе',
  раменское: 'Раменском',
  тбилиси: 'Тбилиси',
  дели: 'Дели',
  кемерово: 'Кемерове',
  самара: 'Самаре',
};

/** Cities that take the "во" preposition ("во Владивостоке"). */
const CITY_VO_PREPOSITION = new Set(['владивосток', 'владимир']);

function declinePart(part: string): string {
  const lower = part.toLowerCase();
  if (CITY_PREPOSITIONAL[lower]) return CITY_PREPOSITIONAL[lower];
  if (/[оеуэю]$/u.test(lower)) return part; // Сочи, Токио, Батуми
  if (/[ая]$/u.test(lower)) return `${part.slice(0, -1)}е`; // Самара -> Самаре, Сортавала -> Сортавале
  if (/ск$/u.test(lower)) return `${part}е`; // Бийск -> Бийске
  if (/(бург|град|ов|ев|ин)$/u.test(lower)) return `${part}е`; // Саратов -> Саратове
  if (/ль$/u.test(lower)) return `${part.slice(0, -1)}е`; // Рославль -> Рославле, Ярославль -> Ярославле
  if (/ец$/u.test(lower)) return `${part.slice(0, -2)}це`; // Череповец -> Череповце
  if (/ь$/u.test(lower)) return `${part.slice(0, -1)}и`; // Казань -> Казани
  if (/ий$/u.test(lower)) return `${part.slice(0, -2)}ем`; // Нижний -> Нижнем
  if (/ый$/u.test(lower)) return `${part.slice(0, -2)}ом`;
  if (/[ыи]$/u.test(lower)) return `${part.slice(0, -1)}ах`; // Апатиты -> Апатитах, Химки -> Химках
  return `${part}е`;
}

export function cityPrepositional(city: string): string {
  const name = String(city || '').trim();
  if (!name) return '';
  const direct = CITY_PREPOSITIONAL[name.toLowerCase()];
  if (direct) return direct;
  // Provider cities often carry a region in parentheses: "Киров (Кировская
  // область)". Decline the head only; the parenthetical stays untouched.
  const parenIndex = name.indexOf('(');
  const head = parenIndex > 0 ? name.slice(0, parenIndex).trim() : name;
  const tail = parenIndex > 0 ? name.slice(parenIndex - 1).replace(/\s+$/, '') : '';
  // Multi-word / hyphenated: decline every part (Нижний Новгород -> Нижнем Новгороде).
  const declinedHead = head
    .split(/(\s+|-)/)
    .map((chunk) => (/^(\s+|-)$/.test(chunk) ? chunk : declinePart(chunk)))
    .join('');
  return `${declinedHead}${tail}`;
}


export function cityInPhrase(city: string): string {
  const name = String(city || '').trim();
  if (!name) return '';
  const preposition = CITY_VO_PREPOSITION.has(name.toLowerCase()) ? 'во' : 'в';
  return `${preposition} ${cityPrepositional(name)}`;
}

export function describeFormat(input: MinimalDescriptionInput): string {
  const haystack = `${input.category || ''} ${input.subcategory || ''} ${input.title || ''}`;
  for (const [re, label] of CATEGORY_FORMAT) {
    if (re.test(haystack)) return label;
  }
  return 'мероприятие';
}

export function formatRuDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);
  const day = parts.find((p) => p.type === 'day')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;
  if (!day || !month || !year) return null;
  const monthName = MONTHS_GENITIVE[Number(month) - 1] || month;
  return `${Number(day)} ${monthName} ${year}`;
}

/** Duration from sessions rounded to the nearest 5 minutes (project canon). */
export function roundDurationMinutes(minutes: number | null | undefined): number | null {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return null;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

const OPENERS = [
  (titleQuoted: string, format: string, place: string) => `${titleQuoted} - ${format}${place}.`,
  (titleQuoted: string, format: string, place: string) => `${format.charAt(0).toUpperCase()}${format.slice(1)} ${titleQuoted}${place}.`,
  (titleQuoted: string, format: string, place: string) => `${format.charAt(0).toUpperCase()}${format.slice(1)} ${titleQuoted}${place} - подробности и билеты в блоке ниже.`,
  (titleQuoted: string, format: string, place: string) => `${format.charAt(0).toUpperCase()}${format.slice(1)} ${titleQuoted} ждет зрителей${place}.`,
];

/** Wrap in «guillemets» unless the name already carries quotes. */
function quoteName(value: string): string {
  return /[«"']/u.test(value) ? value : `«${value}»`;
}

/** Date + Moscow time ("20 ноября 2026, 19:00"); time omitted at midnight. */
export function formatRuDateTime(value: string | Date | null | undefined): string | null {
  const base = formatRuDate(value);
  if (!base || !value) return base;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return base;
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const hour = get('hour');
  const minute = get('minute');
  if (!hour || !minute) return base;
  const normalizedHour = hour === '24' ? '00' : hour;
  if (normalizedHour === '00' && minute === '00') return base;
  return `${base}, ${normalizedHour}:${minute}`;
}

/** Russian plural: 1 сеанс / 2 сеанса / 5 сеансов. */
export function pluralizeRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

/**
 * Canonical "## Практическая информация" fact block: place, address, next
 * session, duration, age, price. Built only from catalogue fields; returns an
 * empty string when there is nothing factual to show.
 */
export function buildPracticalInfoBlock(input: MinimalDescriptionInput): string {
  const city = normalizeUserFacingCopy(String(input.city || '').trim());
  const venue = normalizeUserFacingCopy(String(input.venue || '').trim());
  const address = normalizeUserFacingCopy(String(input.venueAddress || '').trim());
  const facts: string[] = [];

  const place: string[] = [];
  if (venue) place.push(quoteName(venue));
  if (city) place.push(city);
  if (place.length) facts.push(`Место - ${place.join(', ')}`);
  if (address) facts.push(`Адрес - ${address}`);

  const next = formatRuDateTime(input.nextSession);
  if (next) {
    const sessions = Number(input.futureSessions || 0);
    facts.push(sessions > 1 ? `Ближайшая дата - ${next} (всего ${pluralizeRu(sessions, 'сеанс', 'сеанса', 'сеансов')})` : `Ближайшая дата - ${next}`);
  }
  const duration = roundDurationMinutes(input.durationMin);
  if (duration) facts.push(`Продолжительность - около ${duration} минут`);
  const age = String(input.ageLimit || '').trim();
  if (age && age !== '0') facts.push(`Возрастное ограничение - ${age}+`);
  // Project canon: prices below MIN_DISPLAY_PRICE_RUB (100 ₽) are not shown.
  const price = Number(input.priceFromRub || 0);
  if (price >= 100) {
    const formatted = price.toLocaleString('ru-RU').replace(/\u00A0/g, ' ');
    facts.push(`Билеты - от ${formatted} ₽`);
  }

  if (!facts.length) return '';
  return ['## Практическая информация', '', ...facts.map((fact) => `- ${fact}`)].join('\n');
}

export function buildMinimalEventDescription(input: MinimalDescriptionInput, variant = 0): string {
  const title = normalizeUserFacingCopy(String(input.title || '').trim());
  if (!title) return '';

  const format = describeFormat(input);
  const city = normalizeUserFacingCopy(String(input.city || '').trim());
  const venue = normalizeUserFacingCopy(String(input.venue || '').trim());
  const titleHasCity = city && title.toLowerCase().includes(city.toLowerCase());
  const placeParts: string[] = [];
  if (city && !titleHasCity) placeParts.push(cityInPhrase(city));
  if (venue && venue.toLowerCase() !== city.toLowerCase()) placeParts.push(`на площадке ${quoteName(venue)}`);
  const place = placeParts.length ? ` ${placeParts.join(', ')}` : '';

  const opener = OPENERS[Math.abs(variant) % OPENERS.length];
  const paragraphs: string[] = [opener(quoteName(title), format, place)];

  const sections: string[] = [];
  const factBlock = buildPracticalInfoBlock(input);
  if (factBlock) sections.push(factBlock);
  sections.push('Билеты продаются онлайн. Оплата на сайте, электронный билет приходит на почту.');

  return [paragraphs.join(' '), ...sections].join('\n\n').trim();
}
