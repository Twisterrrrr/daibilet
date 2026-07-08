const INSTITUTION_KINDS = new Set([
  'MUSEUM_ART_SPACE',
  'THEATER',
  'CONCERT_HALL',
  'ATTRACTION',
  'OTHER',
]);

const INSTITUTION_HINTS = [
  { pattern: /пушкинск[^\s]*\s+музе/i, display: 'ГМИИ им Пушкина', search: /гмии|пушкин/i },
  { pattern: /московск[^\s]*\s+зоопарк/i, display: 'Московский зоопарк', search: /зоопарк/i },
  { pattern: /нов[^\s]*\s+третьяков/i, display: 'Новая Третьяковская галерея', search: /нов[^\s]*\s+третьяков|третьяковск[^\s]*\s+галере/i },
  { pattern: /третьяковск[^\s]*\s+галере/i, display: 'Третьяковская галерея', search: /третьяков|галере/i },
  { pattern: /эрмитаж/i, display: 'Государственный Эрмитаж', search: /эрмитаж/i },
  { pattern: /кремл/i, display: 'Московский Кремль', search: /кремл/i },
  { pattern: /вднх/i, display: 'ВДНХ', search: /вднх/i },
  { pattern: /исаакиевск/i, display: 'Исаакиевский собор', search: /исаакиевск/i },
  { pattern: /петропавловск/i, display: 'Петропавловская крепость', search: /петропавловск/i },
  { pattern: /петергоф/i, display: 'Петергоф', search: /петергоф/i },
  { pattern: /русск[^\s]*\s+музе/i, display: 'Русский музей', search: /русск[^\s]*\s+музе|михайловск/i },
  { pattern: /юсуповск/i, display: 'Юсуповский дворец', search: /юсуповск/i },
  { pattern: /мариинск/i, display: 'Мариинский театр', search: /мариинск/i },
  { pattern: /спас[^\s]*\s+на\s+кров/i, display: 'Спас на Крови', search: /спас|воскресен/i },
  { pattern: /кунсткамер/i, display: 'Кунсткамера', search: /кунсткамер/i },
  { pattern: /казанск[^\s]*\s+собор/i, display: 'Казанский собор', search: /казанск/i },
  { pattern: /екатерининск/i, display: 'Екатерининский дворец', search: /екатерининск|царск[^\s]*\s+сел/i },
  { pattern: /павловск[^\s]*\s+дворец/i, display: 'Павловский дворец', search: /павловск/i },
  { pattern: /оружейн[^\s]*\s+палат/i, display: 'Оружейная палата', search: /оружейн/i },
  { pattern: /алмазн[^\s]*\s+фонд/i, display: 'Алмазный фонд', search: /алмазн/i },
];

const TITLE_INSTITUTION_PATTERNS = [
  /(?:^|[\s,:—-])(?:квест|экскурс(?:ия)?)[^,:]*?\s+по\s+([^,(]+)/iu,
  /(?:^|[\s,:—-])по\s+((?:новой\s+)?[а-яё][^,(]{3,80})/iu,
];

const STREET_MARKER_RE =
  /(?:^|\s)(?:ул\.?|улиц|пр\.?|просп|пр-?т|пер\.?|переулок|наб\.?|набер|ш\.?|шоссе|б-?р\.?|бульвар|пл\.?|площ|д\.|дом\b|,\s*\d)/iu;

const GENERIC_VENUE_LABEL_RE =
  /^(точка сбора|место сбора|точка встречи|не указано|адрес уточняется|сбор группы|место отправления)$/iu;

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/["«»]/g, '')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractInstitutionPhraseFromTitle(title) {
  const text = String(title || '').trim();
  if (!text) return null;

  for (const pattern of TITLE_INSTITUTION_PATTERNS) {
    const match = text.match(pattern);
    const phrase = String(match?.[1] || '').trim().replace(/\s+$/u, '');
    if (phrase.length >= 4 && !/^(дому|улице|набережной|площади)$/iu.test(phrase)) {
      return phrase;
    }
  }
  return null;
}

export function matchInstitutionHint(phrase) {
  const normalized = normalizeKey(phrase);
  if (!normalized) return null;
  return INSTITUTION_HINTS.find((hint) => hint.pattern.test(normalized) || hint.pattern.test(phrase)) || null;
}

export function resolveInstitutionDisplayName(phrase) {
  const hint = matchInstitutionHint(phrase);
  if (hint) return hint.display;
  const trimmed = String(phrase || '').trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function venueTitleLooksLikeAddress(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (GENERIC_VENUE_LABEL_RE.test(text)) return true;
  if (STREET_MARKER_RE.test(text)) return true;
  if (/^\d{5,6}\b/.test(text)) return true;
  if (/^м\.\s|метро\b|у выхода|встреча у/i.test(text)) return true;
  return false;
}

export function shouldResolveInstitutionFromTitle(event = {}) {
  const kind = String(event.venueKind || event.kind || '').toUpperCase();
  if (kind === 'MEETING_POINT') return true;
  return venueTitleLooksLikeAddress(event.venue || event.title);
}

export function resolveContextInstitutionFromTitle(title) {
  const phrase = extractInstitutionPhraseFromTitle(title);
  if (!phrase) return null;
  const displayName = resolveInstitutionDisplayName(phrase);
  if (!displayName) return null;
  const hint = matchInstitutionHint(phrase);
  return {
    phrase,
    displayName: resolveInstitutionDisplayName(phrase),
    searchPattern: hint?.search || buildLooseSearchPattern(phrase),
  };
}

function buildLooseSearchPattern(phrase) {
  const tokens = normalizeKey(phrase)
    .split(' ')
    .filter((token) => token.length >= 4 && !/^(музе|музея|музею|зоопарк|галере|квест|экскурс)$/i.test(token));
  if (!tokens.length) return null;
  return new RegExp(tokens.slice(0, 3).join('|'), 'i');
}

function isFalsePositiveInstitutionVenue(title) {
  return /сектор|причал|метро|памятник|бар\b|клуб\b|ресторан/i.test(String(title || ''));
}

export async function findInstitutionVenueInCity(db, cityId, context) {
  if (!db || !cityId || !context?.searchPattern) return null;

  const { rows } = await db.query(
    `
      select id, title, slug, kind, address
      from "Venue"
      where "cityId" = $1
        and kind = any($2::text[])
        and coalesce("pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
        and title ~* $3
      order by
        case kind
          when 'MUSEUM_ART_SPACE' then 0
          when 'ATTRACTION' then 1
          when 'THEATER' then 2
          else 3
        end,
        length(title)
      limit 10
    `,
    [cityId, Array.from(INSTITUTION_KINDS), context.searchPattern.source],
  );

  return rows.find((row) => !isFalsePositiveInstitutionVenue(row.title)) || null;
}

export async function resolveContextInstitutionForEvent(db, event) {
  if (!shouldResolveInstitutionFromTitle(event)) return null;

  const context = resolveContextInstitutionFromTitle(event.title);
  if (!context) return null;

  const matchedVenue = event.cityId
    ? await findInstitutionVenueInCity(db, event.cityId, context)
    : null;

  return {
    phrase: context.phrase,
    displayName: matchedVenue?.title || context.displayName,
    id: matchedVenue?.id || null,
    slug: matchedVenue?.slug || null,
    kind: matchedVenue?.kind || null,
    matchedInCatalog: Boolean(matchedVenue),
  };
}
