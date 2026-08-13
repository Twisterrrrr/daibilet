import { resolveCityPlaceHref, type CityPlaceLinkFields } from './cityInfo';
import { venueHref } from './routes';

type VenueMatchSource = {
  id?: string | null;
  slug?: string | null;
  name: string;
  type?: string | null;
  pageStatus?: string | null;
};

function normalizePlaceName(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»""„']/g, '')
    .replace(/[^a-zа-я0-9]+/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * City demonyms / geo stems that must not alone glue unrelated venues
 * (e.g. «Санкт-Петербургская соборная мечеть» ↔ «МТС Live Холл Санкт-Петербург»).
 */
const GEO_NOISE_TOKENS = new Set([
  'санкт',
  'петербург',
  'петербурга',
  'петербургская',
  'петербургский',
  'петербургское',
  'петроград',
  'петроградская',
  'петроградский',
  'москва',
  'москвы',
  'московская',
  'московский',
  'московское',
  'нижний',
  'нижегородская',
  'нижегородский',
  'новгород',
  'новгорода',
  'новгородская',
  'новгородский',
  'казань',
  'казани',
  'казанская',
  'казанский',
  'екатеринбург',
  'екатеринбурга',
  'екатеринбургская',
  'екатеринбургский',
]);

function isGeoNoiseToken(token: string): boolean {
  return GEO_NOISE_TOKENS.has(token);
}

/**
 * Extra facility words: «Адмиралтейство» must not glue to «Причал Адмиралтейство»,
 * «Эрмитаж» must not glue to «Театр Эрмитажа» / балет.
 */
const EXTRA_KIND_TOKENS = [
  'причал',
  'пристань',
  'пирс',
  'дебаркадер',
  'теплоход',
  'катер',
  'яхта',
  'театр',
  'опера',
  'балет',
  'спектакль',
  'концерт',
  'ресторан',
  'кафе',
  'отель',
  'гостиница',
  'павильон',
];

function nameTokens(value: string): string[] {
  return normalizePlaceName(value).split(' ').filter(Boolean);
}

function tokenHasKind(token: string, kind: string): boolean {
  return token === kind || token.startsWith(kind);
}

function hasKindToken(tokens: string[], kind: string): boolean {
  return tokens.some((token) => tokenHasKind(token, kind));
}

/** True when the longer name adds a facility the query did not ask for. */
export function hasExtraFacilityKind(query: string, candidate: string): boolean {
  const queryTokens = nameTokens(query);
  const candidateTokens = nameTokens(candidate);
  if (!queryTokens.length || !candidateTokens.length) return false;
  return EXTRA_KIND_TOKENS.some(
    (kind) => hasKindToken(candidateTokens, kind) && !hasKindToken(queryTokens, kind),
  );
}

/** Мягкое совпадение названия mustSee с venue из payload города. */
export function namesLooselyMatch(a: string, b: string): boolean {
  const left = normalizePlaceName(a);
  const right = normalizePlaceName(b);
  if (!left || !right) return false;
  if (hasExtraFacilityKind(a, b) || hasExtraFacilityKind(b, a)) return false;
  if (left === right) return true;
  const [shortName, longName] = left.length <= right.length ? [left, right] : [right, left];
  // Короткие токены («парк», «музей») слишком шумные для containment.
  if (shortName.length < 6) return false;
  if (longName.includes(shortName)) return true;

  const shortTokens = shortName
    .split(' ')
    .filter((token) => token.length >= 5 && !isGeoNoiseToken(token));
  // Только гео-токены («санкт» + «петербург») - ложные склейки площадок города.
  if (shortTokens.length < 2) return false;
  return shortTokens.every((token) => longName.includes(token));
}

function isLinkableVenueStatus(pageStatus?: string | null): boolean {
  const status = String(pageStatus || '')
    .trim()
    .toLowerCase();
  // none/hidden - карточка может открываться, но это не editorial destination page.
  return status === 'published' || status === 'candidate';
}

/**
 * Href для заголовка «Главные места»:
 * 1) явные cityInfo fields
 * 2) совпадение по имени с venue города (published/candidate)
 */
export function resolveCityPlaceTitleHref(
  place: CityPlaceLinkFields & { name?: string },
  venues: VenueMatchSource[] = [],
): string | null {
  const explicit = resolveCityPlaceHref(place);
  if (explicit) return explicit;

  const placeName = String(place.name || '').trim();
  if (!placeName || !venues.length) return null;

  const match = venues.find(
    (venue) => isLinkableVenueStatus(venue.pageStatus) && namesLooselyMatch(placeName, venue.name),
  );
  if (!match) return null;
  return venueHref({
    id: match.id || match.slug || match.name,
    slug: match.slug,
    name: match.name,
    type: match.type,
  });
}
