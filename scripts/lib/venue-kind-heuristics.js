/**
 * Owner product rules (2026-08-05; plant-on-create 2026-08-13):
 * - OUTDOOR_LOCATION = street / bridge / square / embankment / open street access only.
 *   Place clusters (Новая Голландия, Севкабель) stay here as the parent location.
 * - Buildings → ATTRACTION; parks → PARK; monuments → MONUMENT
 * - Ticketable institutions (museum / theater / concert hall / DK / circus) →
 *   /venues immediately. Do not wait for first event or tickets.
 * - Cafe/restaurant/bar on /locations → GASTRO (not CLUB_BAR_RESTAURANT / not outdoor)
 * - Pier / bus boarding → PIER / MEETING_POINT
 *
 * Shared by must-see seed/enrich and outdoor→* / gastro reclassify scripts.
 */

'use strict';

/** Cyrillic-safe word edge (JS \\b is ASCII-only). */
const W = String.raw`(?<![\p{L}\p{N}_])`;
const WEND = String.raw`(?![\p{L}\p{N}_])`;

/** True open-air / street-access places (stay OUTDOOR_LOCATION when not park/monument/building). */
const TRUE_OUTDOOR_RE = new RegExp(
  [
    'набережн',
    'площад',
    'мост',
    'улиц',
    'проспект',
    'просп\\.',
    `${W}линии${WEND}`,
    'стрелка',
    'ворота',
    `${W}район${WEND}`,
    'дюна',
    `${W}коса${WEND}`,
    'лесопарк',
    'эспланад',
    'променад',
    'бульвар',
    'сквер',
    'аллея',
    'насып',
    `${W}вал${WEND}`,
    'пляж',
    'наб\\.',
    'новая\\s+голланди',
    'севкабель',
    'андерсенград',
    'мозаичн(?:ый|ого)\\s+дворик',
    'рыбн(?:ая|ой)\\s+деревн',
    `${W}остров${WEND}`,
    `${W}порт${WEND}`,
    'арбат',
    'плотинк',
    'слобод',
    'квартал',
    'городищ',
    'писаниц',
    'петроглиф',
    'курган(?!ский)',
  ].join('|'),
  'iu',
);

/** Buildings and indoor/visit destinations → ATTRACTION (locations catalog). */
const BUILDING_ATTRACTION_RE = new RegExp(
  [
    'особняк',
    'дворец(?!\\s*(?:площад|набережн|мост))',
    'замок',
    'собор',
    'храм',
    'церков',
    'монастыр',
    'кирх',
    'кост[её]л',
    'часовн',
    'колокольн',
    'адмиралтейств',
    'доходн(?:ый|ого)\\s+дом',
    'толстовск(?:ий|ого)\\s+дом',
    'дом\\s+советов',
    'дом\\s+павлова',
    'лицей',
    'крепост',
    'кремл',
    'детинец',
    `${W}форт${WEND}`,
    'башня',
    'павильон',
    'ротонд',
    'бирж',
    'мавзоле',
    'резиденц',
    'усадьб',
    'палат[аык]',
    'лофт',
    'смотр(?:овая|овой)',
    'лахта\\s*центр',
    'гауптвахт',
    'казарм',
    'тюрем',
    'тюрьм',
    'вокзал',
    'бертгольд',
    'спас\\s+на\\s+крови',
    'мечет',
    'синагог',
    'гостиный\\s+двор',
    'гостиные\\s+ряды',
    'торговые\\s+ряды',
    'завод',
    'мельниц',
    'каланч',
    'терем',
    'океанариум',
    'маяк',
    'водонапорн',
    'ледокол',
    'фуникул',
    'метротрам',
    'гэс',
  ].join('|'),
  'iu',
);

const PARK_RE = new RegExp(
  [
    'парк',
    `${W}сад${WEND}`,
    'эспланад',
    'зарядье',
    'вднх',
    'петергоф',
    'монрепо',
    'витославлиц',
    'зоопарк',
    'лесопарк',
    'ботаническ',
    'заповедник',
    'танцующ(?:ий|его)\\s+лес',
    'соснов(?:ый|ого)\\s+бор',
  ].join('|'),
  'iu',
);

const MONUMENT_RE =
  /памятник|скульптур|бюст|монумент|мемориал|медн(?:ый|ого)\s+всадник|голова ленина|тысячелетие россии|колонн/i;

const MUSEUM_RE =
  /музей|галере|эрмитаж|третьяков|дацан|хохловк|арт[-\s]?пространств|кунсткамер|выставочн\w*\s+центр|экспоцентр/i;

const THEATER_RE = /театр|оперн|балет|маска|новат|цирк/i;

/** Concert / culture halls: events + future tickets → institution /venues. */
const CONCERT_HALL_RE = new RegExp(
  [
    'филармони',
    'консерватор',
    'концертн',
    'дворец\\s+культур',
    'дом\\s+культур',
    `${W}дк${WEND}`,
    '(?:культурн|творческ)\\w*\\s+центр',
  ].join('|'),
  'iu',
);

const PIER_RE = /причал|пристань|дебаркадер|причальн/i;

const BUS_STOP_RE =
  /автобус|автовокзал|место посадки|точка посадки|посадк(?:а|и)\s+на\s+автобус|автобусн(?:ая|ый)\s+(?:остановк|площадк)/i;

/**
 * Gastro on /locations. Avoid false positives:
 * - кафедральный / кафедра…
 * - …барова / …барский as part of street names (use word-edge бар)
 */
const GASTRO_RE = new RegExp(
  [
    `${W}кафе(?!драл)`,
    'ресторан',
    `${W}бар${WEND}`,
    'гастробар',
    'гастроном',
    'пышечн',
    `${W}пышк`,
    'кофейн',
    `${W}кофе${WEND}`,
    'трактир',
    'пиццери',
    'пельменн',
    'кондитер',
    'рюмочн',
    'бистро',
    'фудмолл',
    'фудкорт',
    'пекарн',
    'булочн',
    'чебуречн',
    'спикизи',
    'гастробар',
    'стейк[\\s-]?хаус',
    'марципан',
    `${W}bier${WEND}`,
    `${W}паб${WEND}`,
    `${W}pub${WEND}`,
    'restaurant',
    `${W}cafe${WEND}`,
    `${W}bar${WEND}`,
  ].join('|'),
  'iu',
);

/** Markets / food halls that are tourist gastro points on locations (not true outdoor). */
const GASTRO_MARKET_RE = /(?:рынок|фудмолл|фудкорт|гастрономическ)/i;

/**
 * Infer Prisma VenueKind for must-see / content places.
 * @param {string} name
 * @param {{ kind?: string, familyHint?: string } | null} [item]
 * @returns {{ kind: string, family: 'location' | 'institution', confident: boolean }}
 */
function inferMustSeeKindAndFamily(name, item = null) {
  if (item && item.kind) {
    const family =
      item.familyHint ||
      (['MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'VENUE'].includes(
        item.kind,
      )
        ? 'institution'
        : 'location');
    return { kind: item.kind, family, confident: true };
  }

  const n = String(name || '').toLowerCase();

  // Explicit institution gastro (events / venue catalog) stays CLUB_BAR.
  if (GASTRO_RE.test(n) && item && item.familyHint === 'institution') {
    return { kind: 'CLUB_BAR_RESTAURANT', family: 'institution', confident: true };
  }

  if (PIER_RE.test(n)) {
    return { kind: 'PIER', family: 'location', confident: true };
  }
  if (BUS_STOP_RE.test(n)) {
    return { kind: 'MEETING_POINT', family: 'location', confident: true };
  }

  // «Петергоф» is in PARK_RE for the ensemble hub, but «…Петергофский дворец» is a building.
  if (PARK_RE.test(n) && !/парковк/i.test(n) && !BUILDING_ATTRACTION_RE.test(n)) {
    return { kind: 'PARK', family: 'location', confident: true };
  }
  if (MONUMENT_RE.test(n) && !BUILDING_ATTRACTION_RE.test(n)) {
    return { kind: 'MONUMENT', family: 'location', confident: true };
  }
  if (THEATER_RE.test(n)) {
    return { kind: 'THEATER', family: 'institution', confident: true };
  }
  if (MUSEUM_RE.test(n)) {
    return { kind: 'MUSEUM_ART_SPACE', family: 'institution', confident: true };
  }
  if (CONCERT_HALL_RE.test(n)) {
    return { kind: 'CONCERT_HALL', family: 'institution', confident: true };
  }

  // Tourist gastro on locations catalog → GASTRO (owner 2026-08-05).
  if (GASTRO_RE.test(n) || (GASTRO_MARKET_RE.test(n) && /рынок|фуд/i.test(n))) {
    return { kind: 'GASTRO', family: 'location', confident: true };
  }

  // Buildings before outdoor: «Дворцовый мост» stays outdoor via TRUE_OUTDOOR; «Мраморный дворец» → attraction.
  if (BUILDING_ATTRACTION_RE.test(n) && !TRUE_OUTDOOR_RE.test(n)) {
    return { kind: 'ATTRACTION', family: 'location', confident: true };
  }

  // Palace/cathedral even when outdoor tokens absent; exclude дворцовая площадь/наб/мост.
  if (
    /(?:^|[\s«"'(])(?:особняк|дворец|замок|собор|храм|церковь|монастырь|адмиралтейство|крепость|кремль|кирха|костёл|костел)(?:[\s"'»),!.]|$)/i.test(
      n,
    ) &&
    !/дворцов(?:ая|ый|ого|ую)\s+(?:площад|набережн|мост)/i.test(n)
  ) {
    return { kind: 'ATTRACTION', family: 'location', confident: true };
  }

  // Building + outdoor token (e.g. «Караульная гора и часовня») → attraction when building wins.
  if (BUILDING_ATTRACTION_RE.test(n) && TRUE_OUTDOOR_RE.test(n)) {
    // Prefer outdoor only when outdoor token is the primary noun (площадь/мост/улица/наб as head).
    if (
      /^(?:.*\s)?(?:площад|набережн|мост|улиц|проспект|просп\.|ворота|бульвар|сквер)\w*\s*$/i.test(n) ||
      /дворцов(?:ая|ый|ого|ую)\s+(?:площад|набережн|мост)/i.test(n)
    ) {
      return { kind: 'OUTDOOR_LOCATION', family: 'location', confident: true };
    }
    return { kind: 'ATTRACTION', family: 'location', confident: true };
  }

  if (TRUE_OUTDOOR_RE.test(n)) {
    return { kind: 'OUTDOOR_LOCATION', family: 'location', confident: true };
  }

  if (item && item.familyHint === 'institution') {
    return { kind: 'VENUE', family: 'institution', confident: false };
  }

  // Unknown must-see name: prefer ATTRACTION over mislabeling a building as outdoor.
  return { kind: 'ATTRACTION', family: 'location', confident: false };
}

/**
 * If stored OUTDOOR_LOCATION should be another kind, return target; else null.
 * @param {string} title
 * @param {string} [slug]
 * @returns {'ATTRACTION'|'MONUMENT'|'PARK'|'MUSEUM_ART_SPACE'|'THEATER'|'CONCERT_HALL'|'GASTRO'|'PIER'|'MEETING_POINT'|null}
 */
function reclassifyOutdoorBuilding(title, slug = '') {
  const text = `${title || ''} ${slug || ''}`.toLowerCase();
  if (!text.trim()) return null;

  if (PIER_RE.test(text)) return 'PIER';
  if (BUS_STOP_RE.test(text)) return 'MEETING_POINT';

  if (THEATER_RE.test(text)) return 'THEATER';
  if (MUSEUM_RE.test(text)) return 'MUSEUM_ART_SPACE';
  if (CONCERT_HALL_RE.test(text)) return 'CONCERT_HALL';

  if (GASTRO_RE.test(text)) return 'GASTRO';
  if (GASTRO_MARKET_RE.test(text) && /рынок|фуд/i.test(text) && !TRUE_OUTDOOR_RE.test(text)) {
    return 'GASTRO';
  }
  // «Рыбный рынок» even with outdoor tokens → gastro tourist point
  if (/рынок/i.test(text) && GASTRO_MARKET_RE.test(text)) return 'GASTRO';

  if (PARK_RE.test(text) && !/парковк/i.test(text) && !BUILDING_ATTRACTION_RE.test(text)) {
    return 'PARK';
  }
  if (MONUMENT_RE.test(text) && !TRUE_OUTDOOR_RE.test(text)) return 'MONUMENT';
  if (MONUMENT_RE.test(text) && BUILDING_ATTRACTION_RE.test(text)) return 'MONUMENT';

  // Keep true outdoors when outdoor token is the place head (наб/площадь/мост/улица/ворота…),
  // even if a building word appears as adjective (Кремлёвская набережная).
  // Note: JS \\w is ASCII-only - use \\p{L} for Cyrillic tails.
  if (TRUE_OUTDOOR_RE.test(text) && !MONUMENT_RE.test(text)) {
    const outdoorHead =
      /(?:площад|набережн|мост|улиц|проспект|просп\.|ворота|бульвар|сквер|променад|эспланад|коса|дюна|остров|порт|стрелка)[\p{L}\p{N}_]*\s*$/iu.test(
        text.replace(/\s+/g, ' ').trim(),
      ) ||
      /дворцов(?:ая|ый|ого|ую)\s+(?:площад|набережн|мост)/i.test(text) ||
      /(?:^|[\s«"'])(?:новая\s+голланди|севкабель|рыбн(?:ая|ой)\s+деревн)/i.test(text);
    if (
      outdoorHead &&
      !/собор|храм|церков|монастыр|дворец(?!\s*(?:площад|набережн|мост))|замок|крепост|особняк/i.test(text)
    ) {
      return null;
    }
    if (!BUILDING_ATTRACTION_RE.test(text)) return null;
  }

  if (BUILDING_ATTRACTION_RE.test(text)) return 'ATTRACTION';
  if (
    /(?:особняк|дворец|замок|собор|храм|церковь|монастырь|адмиралтейство|крепость|кремль|кирха|костёл|костел|лицей|лофт|ротонд|башня|дом советов|доходн|пышечн|ресторан|кафе(?!драл)|мечет|синагог|спас\s+на\s+крови|гостиный|ряды|завод|мельниц|каланч|терем|океанариум|маяк)/i.test(
      text,
    ) &&
    !/дворцов(?:ая|ый|ого|ую)\s+(?:площад|набережн|мост)/i.test(text)
  ) {
    return 'ATTRACTION';
  }
  return null;
}

/**
 * Location-family rows that are cafe/restaurant/bar → GASTRO.
 * Does not touch CLUB_BAR_RESTAURANT (institution /venues).
 * @param {string} title
 * @param {string} [slug]
 * @param {string} [storedKind]
 * @returns {'GASTRO'|null}
 */
function reclassifyLocationGastro(title, slug = '', storedKind = '') {
  const kind = String(storedKind || '').toUpperCase();
  if (
    [
      'CLUB_BAR_RESTAURANT',
      'MUSEUM_ART_SPACE',
      'THEATER',
      'CONCERT_HALL',
      'GASTRO',
      'PIER',
      'MEETING_POINT',
      'ONLINE',
    ].includes(kind)
  ) {
    return null;
  }
  const text = `${title || ''} ${slug || ''}`.toLowerCase();
  if (!text.trim()) return null;
  if (GASTRO_RE.test(text)) return 'GASTRO';
  if (/рынок/i.test(text) && /рыбн|гастро|фуд|еды|food/i.test(text)) return 'GASTRO';
  return null;
}

module.exports = {
  TRUE_OUTDOOR_RE,
  BUILDING_ATTRACTION_RE,
  GASTRO_RE,
  inferMustSeeKindAndFamily,
  reclassifyOutdoorBuilding,
  reclassifyLocationGastro,
};
