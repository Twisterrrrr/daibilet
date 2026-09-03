/**
 * Related sessions for public event PDP («Похожие события»).
 * Keeps scoring testable outside the large dto.js surface.
 */

function normalizePart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Collapse date/time noise so «… 10:15» and «… 13:30» share one product key. */
export function normalizeRelatedTitleKey(title) {
  return normalizePart(title)
    .replace(/\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?/g, ' ')
    .replace(/\d{1,2}:\d{2}/g, ' ')
    .replace(/\b\d{1,2}\s*(?:сент|окт|нояб|дек|янв|фев|мар|апр|мая|июн|июл|авг)\w*/gi, ' ')
    .replace(/[•|/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function haystackOf(session) {
  return [
    session.title,
    session.category,
    session.venue,
    ...(session.tags || []),
    ...(session.subcategories || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const KIDS_RE =
  /детск|семейн|с\s*детьми|для\s*детей|интерактивн|мастер[-\s]?класс|0\+|1\+|3\+|6\+|kids|family/i;
const RIVER_RE =
  /речн|теплоход|круиз|канал|причал|водн|нева|фонтанк|катер|яхт|лодк|bridge|мост/i;
const CONCERT_RE =
  /концерт|стендап|standup|club|клуб|рок|ночн|18\+|party|вечеринк|продиджи|prodigy|химическ|tribute/i;
const EXCURSION_RE = /экскурси|обзорн|прогулк|тур\b|маршру/i;

const INSTITUTION_KINDS = new Set([
  'THEATER',
  'CONCERT_HALL',
  'MUSEUM_ART_SPACE',
  'CLUB_BAR_RESTAURANT',
  'BAR',
]);

function normalizeKind(value) {
  return String(value || 'OTHER')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}

function kindFamily(kind) {
  const normalized = normalizeKind(kind);
  if (INSTITUTION_KINDS.has(normalized)) return 'institution';
  if (normalized === 'PIER') return 'pier';
  if (normalized === 'BUS') return 'bus';
  return normalized || 'other';
}

export function isKidsLike(session) {
  const age = Number(session.ageLimit);
  if (Number.isFinite(age) && age >= 0 && age <= 12) return true;
  return KIDS_RE.test(haystackOf(session));
}

export function isRiverLike(session) {
  return RIVER_RE.test(haystackOf(session));
}

export function isConcertLike(session) {
  return CONCERT_RE.test(haystackOf(session));
}

function isExcursionLike(session) {
  const cat = String(session.category || '');
  if (/экскурси/i.test(cat)) return true;
  return EXCURSION_RE.test(haystackOf(session));
}

export function relatedCityMatches(event, session) {
  if (event.cityId && session.cityId) return session.cityId === event.cityId;
  const left = normalizePart(event.city);
  const right = normalizePart(session.city);
  if (!left || !right) return false;
  return left === right;
}

export function relatedProductKey(session) {
  const titleKey = normalizeRelatedTitleKey(session.title);
  const cityKey = normalizePart(session.city);
  if (titleKey) return `${titleKey}|${cityKey}`;
  return normalizePart(session.groupKey || session.id);
}

/**
 * Score a candidate session vs the current event. Returns 0 to drop.
 */
export function scoreRelatedSession(event, session) {
  let value = 0;
  const eventKids = isKidsLike(event);
  const eventRiver = isRiverLike(event);
  const sessionKids = isKidsLike(session);
  const sessionRiver = isRiverLike(session);
  const sessionConcert = isConcertLike(session);

  // Hard filters for kids / river PDPs.
  if (eventKids && sessionConcert && !sessionKids) return 0;
  if (eventRiver && sessionConcert && !sessionRiver) return 0;
  if (eventKids && !sessionKids) {
    // Kids PDP: only kids peers, river/boat, or excursions - never generic «Мероприятия»/festivals.
    if (!sessionRiver && !isExcursionLike(session)) return 0;
  }
  if (
    eventKids &&
    !sessionKids &&
    /фестиваль|festival|k-?pop|клуб|бар\b/i.test(haystackOf(session))
  ) {
    return 0;
  }

  if (event.category && session.category === event.category) value += 4;
  else if (
    eventRiver &&
    isExcursionLike(session) &&
    /мероприяти/i.test(String(event.category || ''))
  ) {
    // Kids river often lands in «Мероприятия»; prefer excursion peers.
    value += 3;
  }

  if (eventKids && sessionKids) value += 5;
  if (eventRiver && sessionRiver) value += 5;
  if (eventKids && !sessionKids) value -= 3;
  if (eventRiver && !sessionRiver && !sessionKids) value -= 2;

  const eventKind = normalizeKind(event.venueKind);
  const sessionKind = normalizeKind(session.venueKind);
  if (eventKind !== 'OTHER' && sessionKind === eventKind) value += 5;
  else if (eventKind !== 'OTHER' && kindFamily(eventKind) === kindFamily(sessionKind)) value += 2;

  const eventTokens = new Set(
    [...(event.subcategories || []), ...(event.tags || [])]
      .filter(Boolean)
      .map((token) => String(token).trim().toLowerCase()),
  );
  const sessionTokens = [...(session.subcategories || []), ...(session.tags || [])]
    .filter(Boolean)
    .map((token) => String(token).trim().toLowerCase());
  let overlap = 0;
  for (const token of sessionTokens) {
    if (eventTokens.has(token)) overlap += 1;
  }
  if (overlap > 0) value += 2 + Math.min(overlap, 2);

  if (event.venueId && session.venueId === event.venueId) value += 2;

  return value > 0 ? value : 0;
}

/**
 * @param {object} event
 * @param {object[]} catalogSessions
 * @param {string[]} groupEventIds - event ids already on this PDP
 * @param {(session: object) => string[]} sessionGroupIds
 * @param {number} [limit=12]
 */
export function pickRelatedSessions(event, catalogSessions, groupEventIds, sessionGroupIds, limit = 12) {
  const exclude = new Set((groupEventIds || []).map(String));
  const relatedCandidates = (catalogSessions || []).filter((session) => {
    if (!relatedCityMatches(event, session)) return false;
    const ids = typeof sessionGroupIds === 'function' ? sessionGroupIds(session) : [];
    if (ids.some((id) => exclude.has(String(id)))) return false;
    return true;
  });

  const relatedScored = relatedCandidates
    .map((session) => ({ session, score: scoreRelatedSession(event, session) }))
    .filter(({ score }) => score > 0);

  relatedScored.sort((left, right) => {
    const byScore = right.score - left.score;
    if (byScore !== 0) return byScore;
    return String(left.session.startsAt || '').localeCompare(String(right.session.startsAt || ''));
  });

  const relatedSeen = new Set();
  const related = [];
  for (const { session } of relatedScored) {
    const key = relatedProductKey(session);
    if (!key || relatedSeen.has(key)) continue;
    relatedSeen.add(key);
    related.push(session);
    if (related.length >= limit) break;
  }
  return related;
}
