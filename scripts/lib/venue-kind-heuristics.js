/**
 * Owner product rule (2026-08-05):
 * - OUTDOOR_LOCATION = street / bridge / square / embankment / open street access
 * - Buildings (palace, mansion, cathedral, fortress, …) → ATTRACTION
 * - Parks → PARK; monuments → MONUMENT; museums → MUSEUM_ART_SPACE
 *
 * Shared by must-see seed/enrich and outdoor→attraction reclassify.
 */

'use strict';

/** Cyrillic-safe word edge (JS \\b is ASCII-only). */
const W = String.raw`(?<![\p{L}\p{N}_])`;
const WEND = String.raw`(?![\p{L}\p{N}_])`;

/** True open-air / street-access places (stay OUTDOOR_LOCATION when not park/monument). */
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
    'кунсткамер',
    'доходн(?:ый|ого)\\s+дом',
    'толстовск(?:ий|ого)\\s+дом',
    'дом\\s+советов',
    'лицей',
    'крепост',
    `${W}форт${WEND}`,
    'башня',
    'павильон',
    'ротонд',
    'бирж',
    'мавзоле',
    'резиденц',
    'усадьб',
    'палат[аы]',
    'лофт',
    'смотр(?:овая|овой)',
    'лахта\\s*центр',
    'гауптвахт',
    'казарм',
    'тюрем',
    'тюрьм',
    'вокзал',
    'консерватор',
    'филармони',
    'дворец\\s+культур',
    'бертгольд',
    '(?:культурн|выставочн|творческ)\\w*\\s+центр',
    'спас\\s+на\\s+крови',
    'мечет',
    'синагог',
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
    'танцующ(?:ий|его)\\s+лес',
  ].join('|'),
  'iu',
);

const MONUMENT_RE = /памятник|скульптур|бюст|медн(?:ый|ого)\s+всадник|голова ленина|тысячелетие россии/i;

const MUSEUM_RE =
  /музей|галере|эрмитаж|третьяков|дацан|хохловк|арт[-\s]?пространств|кунсткамер/i;

const THEATER_RE = /театр|оперн|балет|маска|новат/i;

const GASTRO_RE = /кафе|ресторан|бар|трактир|пельмен|пицц|гастро|кофе|пышечн|пышк/i;

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

  if (GASTRO_RE.test(n) && item && item.familyHint === 'institution') {
    return { kind: 'CLUB_BAR_RESTAURANT', family: 'institution', confident: true };
  }

  if (PARK_RE.test(n) && !/парковк/i.test(n)) {
    return { kind: 'PARK', family: 'location', confident: true };
  }
  if (MONUMENT_RE.test(n)) {
    return { kind: 'MONUMENT', family: 'location', confident: true };
  }
  if (THEATER_RE.test(n)) {
    return { kind: 'THEATER', family: 'institution', confident: true };
  }
  if (MUSEUM_RE.test(n)) {
    return { kind: 'MUSEUM_ART_SPACE', family: 'institution', confident: true };
  }

  // Buildings before outdoor: «Дворцовый мост» stays outdoor via TRUE_OUTDOOR; «Мраморный дворец» → attraction.
  if (BUILDING_ATTRACTION_RE.test(n) && !TRUE_OUTDOOR_RE.test(n)) {
    return { kind: 'ATTRACTION', family: 'location', confident: true };
  }

  // Palace/cathedral even when outdoor tokens absent; exclude дворцовая площадь/наб/мост.
  if (
    /(?:^|[\s«"'(])(?:особняк|дворец|замок|собор|храм|церковь|монастырь|адмиралтейство|крепость|кирха|костёл|костел)(?:[\s"'»),!.]|$)/i.test(
      n,
    ) &&
    !/дворцов(?:ая|ый|ого|ую)\s+(?:площад|набережн|мост)/i.test(n)
  ) {
    return { kind: 'ATTRACTION', family: 'location', confident: true };
  }

  if (TRUE_OUTDOOR_RE.test(n)) {
    return { kind: 'OUTDOOR_LOCATION', family: 'location', confident: true };
  }

  // Tourist gastro on locations catalog (KGD override pattern) → ATTRACTION, not outdoor.
  if (GASTRO_RE.test(n)) {
    return { kind: 'ATTRACTION', family: 'location', confident: false };
  }

  if (item && item.familyHint === 'institution') {
    return { kind: 'VENUE', family: 'institution', confident: false };
  }

  // Unknown must-see name: prefer ATTRACTION over mislabeling a building as outdoor.
  return { kind: 'ATTRACTION', family: 'location', confident: false };
}

/**
 * If stored OUTDOOR_LOCATION is clearly a building, return target kind; else null.
 * @param {string} title
 * @param {string} [slug]
 * @returns {'ATTRACTION' | 'MONUMENT' | 'PARK' | 'MUSEUM_ART_SPACE' | null}
 */
function reclassifyOutdoorBuilding(title, slug = '') {
  const text = `${title || ''} ${slug || ''}`.toLowerCase();
  if (!text.trim()) return null;

  // Keep true outdoors even if name contains «дворц…» (Дворцовая площадь / набережная / мост).
  if (TRUE_OUTDOOR_RE.test(text) && !BUILDING_ATTRACTION_RE.test(text) && !MONUMENT_RE.test(text)) {
    return null;
  }

  if (PARK_RE.test(text) && !BUILDING_ATTRACTION_RE.test(text)) return 'PARK';
  if (MONUMENT_RE.test(text)) return 'MONUMENT';
  if (MUSEUM_RE.test(text) && /музей|кунсткамер|галере|эрмитаж/i.test(text)) {
    // Keep on /locations as ATTRACTION when already a location card; museum upgrade is separate.
    // Кунсткамера etc. wrongly outdoor → ATTRACTION (owner: buildings = достопримечательность).
    return 'ATTRACTION';
  }
  if (BUILDING_ATTRACTION_RE.test(text)) return 'ATTRACTION';
  if (
    /(?:особняк|дворец|замок|собор|храм|церковь|монастырь|адмиралтейство|крепость|кирха|костёл|костел|лицей|лофт|ротонд|башня|дом советов|доходн|пышечн|ресторан|кафе|бар|мечет|синагог|спас\s+на\s+крови)/i.test(
      text,
    ) &&
    !/дворцов(?:ая|ый|ого|ую)\s+(?:площад|набережн|мост)/i.test(text)
  ) {
    return 'ATTRACTION';
  }
  return null;
}

module.exports = {
  TRUE_OUTDOOR_RE,
  BUILDING_ATTRACTION_RE,
  inferMustSeeKindAndFamily,
  reclassifyOutdoorBuilding,
};
