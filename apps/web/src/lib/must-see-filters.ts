/**
 * Must-see place filters for «Мой день» chips and city hub «Главные места».
 * Classifies cityInfo mustSee by venueSlug/locationSlug + optional catalog kind + text heuristics.
 * Empty categories are omitted from tabs.
 */

import type { CityMustSeeItem, CityPlaceLinkFields } from './cityInfo';
import { normalizeVenueKind, resolvePublicVenueType } from './venue-meta';

export type MustSeeFilterId =
  | 'main'
  | 'gastro'
  | 'museum'
  | 'science'
  | 'literature'
  | 'views'
  | 'street'
  | 'park'
  | 'temple'
  | 'monument'
  | 'creative'
  | 'secret'
  | 'houses'
  | 'mansions';

export type MustSeeFilterTab = {
  id: MustSeeFilterId;
  label: string;
  count: number;
};

export type MustSeeClassifyInput = CityPlaceLinkFields & {
  name?: string | null;
  desc?: string | null;
  /** Catalog / editorial kind when resolved (e.g. CLUB_BAR_RESTAURANT, PARK, MUSEUM). */
  type?: string | null;
  /** Optional cityInfo chip override. */
  mustSeeFilter?: MustSeeFilterId | null;
};

const FILTER_LABELS: Record<MustSeeFilterId, string> = {
  main: 'Главные места',
  gastro: 'Гастрономические точки',
  museum: 'Музеи',
  science: 'Семейное',
  literature: 'Литература',
  views: 'Виды / набережные',
  street: 'Улицы / дворы',
  park: 'Парки',
  temple: 'Храмы',
  monument: 'Памятники',
  creative: 'Необычное',
  secret: 'Секретные',
  houses: 'Доходные дома и парадные',
  mansions: 'Особняки и городские усадьбы',
};

/** Tab order in UI (main always first when present). */
const FILTER_ORDER: MustSeeFilterId[] = [
  'main',
  'museum',
  'science',
  'literature',
  'views',
  'street',
  'park',
  'temple',
  'monument',
  'creative',
  'secret',
  'houses',
  'mansions',
  'gastro',
];

const GASTRO_KINDS = new Set(['club_bar_restaurant', 'bar']);
const MUSEUM_KINDS = new Set(['museum', 'art_space', 'museum_art_space']);
const PARK_KINDS = new Set(['park']);

function haystack(place: MustSeeClassifyInput): string {
  const venueSlug = String(place.venueSlug || '').trim();
  const locationSlug = String(place.locationSlug || '').trim();
  const href = String(place.href || '').trim();
  const name = String(place.name || '').trim();
  const desc = String(place.desc || '').trim();
  return `${venueSlug} ${locationSlug} ${href} ${name} ${desc}`.toLowerCase();
}

function slugHaystack(place: MustSeeClassifyInput): string {
  return `${place.venueSlug || ''} ${place.locationSlug || ''} ${place.href || ''}`.toLowerCase();
}

function nameHaystack(place: MustSeeClassifyInput): string {
  return String(place.name || '').toLowerCase();
}

function isGastro(place: MustSeeClassifyInput, kind: string): boolean {
  if (GASTRO_KINDS.has(kind)) return true;
  const slug = slugHaystack(place);
  const name = nameHaystack(place);
  // venueSlug gastro pack: cafe/restaurant/bar tokens (do not use locationSlug streets with «гастро» in desc).
  if (String(place.venueSlug || '').trim()) {
    if (
      /(?:^|[-_/])(?:cafe|restaurant|bar|pizza|traktir|kofe|coffee|bistro|pub)(?:$|[-_/])/i.test(slug) ||
      /seledka|bezuhov|lepi-testo|yale|mitrich|fonoteca|yula-pizza|mednye-truby|pyatkin|red-wall/i.test(
        slug,
      )
    ) {
      return true;
    }
    if (/кафе|ресторан|бар|пицц|трактир|кофейня|стейкхаус|коктейльн/i.test(name)) return true;
  }
  // Editorial gastro rows without catalog slug (cityInfo-only).
  if (/ресторан|гастробар|пивной ресторан|магазин-музей/i.test(name)) return true;
  return false;
}

function isMuseum(place: MustSeeClassifyInput, kind: string): boolean {
  if (MUSEUM_KINDS.has(kind)) return true;
  const slug = slugHaystack(place);
  const name = nameHaystack(place);
  const text = haystack(place);
  if (/muzey|museum|gtsisi|galere|gallery/i.test(slug)) return true;
  if (/музей|галерея|гцси/i.test(name)) return true;
  // Palace-museum / house-museum / «Музей детства…» in desc (Усадьба, Домик Каширина).
  if (/дворец-музей|дом-музей|музей/i.test(text) && !isGastro(place, kind)) return true;
  // Contemporary art centre in Arsenal (Nizhny).
  if (/arsenal|арсенал/i.test(slug) && /гцси|искусств/i.test(text)) return true;
  return false;
}

function isParkOrEmbankment(place: MustSeeClassifyInput, kind: string): boolean {
  if (PARK_KINDS.has(kind)) return true;
  const slug = slugHaystack(place);
  const name = nameHaystack(place);
  if (
    /(?:^|[-_/])(?:park|naberezhnaya|bulvar|sad|hutor|skver|grove)(?:$|[-_/])/i.test(slug) ||
    /park-|naberezhnaya-|bulvar-|sad-|hutor-/i.test(slug)
  ) {
    return true;
  }
  // Avoid JS \b - it does not treat Cyrillic as word chars.
  if (/парк|набережн|бульвар|сад|сквер|хутор/i.test(name)) return true;
  return false;
}

function isTemple(place: MustSeeClassifyInput, kind: string): boolean {
  void kind;
  const slug = slugHaystack(place);
  const name = nameHaystack(place);
  // Match name/slug only - desc often mentions a cathedral next to a square/strelka.
  if (/(?:^|[-_/])(?:sobor|tserkov|monastyr|church|cathedral|hram)(?:$|[-_/])/i.test(slug)) {
    return true;
  }
  if (/собор|церковь|монастырь|храм|кирха/i.test(name)) return true;
  return false;
}

function isMonument(place: MustSeeClassifyInput): boolean {
  const slug = slugHaystack(place);
  const name = nameHaystack(place);
  if (/(?:^|[-_/])(?:pamyatnik|skulptura|monument|memorial)(?:$|[-_/])/i.test(slug)) return true;
  if (/^памятник\b|^скульптур|^монумент\b/i.test(name)) return true;
  // Ship-monument / genre photo stops without «памятник» in the title.
  if (/судно-памятник|катер.?«?герой/i.test(haystack(place))) return true;
  return false;
}

function isStreet(place: MustSeeClassifyInput): boolean {
  const slug = slugHaystack(place);
  const name = nameHaystack(place);
  if (/(?:^|[-_/])(?:ulitsa|street|prospekt|pereulok|ploschad)(?:$|[-_/])/i.test(slug)) return true;
  if (/\bулица\b|\bпроспект\b|\bпереулок\b|^площадь\b/i.test(name)) return true;
  return false;
}

function isViews(place: MustSeeClassifyInput): boolean {
  const slug = slugHaystack(place);
  const name = nameHaystack(place);
  if (/strelka|smotrov|lestnitsa|kanatnaya/i.test(slug)) return true;
  if (/стрелка|смотров|лестниц|канатн/i.test(name)) return true;
  return false;
}

/**
 * Single category for a must-see row. Priority: gastro → museum → park → temple → monument → street → views → main.
 */
export function classifyMustSeePlace(place: MustSeeClassifyInput): MustSeeFilterId {
  const override = place.mustSeeFilter;
  if (
    override === 'main' ||
    override === 'gastro' ||
    override === 'museum' ||
    override === 'science' ||
    override === 'literature' ||
    override === 'views' ||
    override === 'street' ||
    override === 'park' ||
    override === 'temple' ||
    override === 'monument' ||
    override === 'creative' ||
    override === 'secret' ||
    override === 'houses' ||
    override === 'mansions'
  ) {
    return override;
  }
  const kind = resolvePublicVenueType(place.type, place.name);
  const normalized = normalizeVenueKind(place.type);

  if (isGastro(place, kind) || isGastro(place, normalized)) return 'gastro';
  if (isMuseum(place, kind) || isMuseum(place, normalized)) return 'museum';
  if (isParkOrEmbankment(place, kind) || isParkOrEmbankment(place, normalized)) return 'park';
  if (isTemple(place, kind)) return 'temple';
  if (isMonument(place)) return 'monument';
  if (isStreet(place)) return 'street';
  if (isViews(place)) return 'views';
  return 'main';
}

export function mustSeeFilterLabel(id: MustSeeFilterId): string {
  return FILTER_LABELS[id];
}

/** Short stop-card type pill for a must-see category (Мой день). */
const STOP_TYPE_BY_FILTER: Record<MustSeeFilterId, string> = {
  main: 'Главное',
  gastro: 'Еда',
  museum: 'Музей',
  science: 'Семейное',
  literature: 'Литература',
  views: 'Смотровая',
  street: 'Прогулка',
  park: 'Парк',
  temple: 'Храм',
  monument: 'Памятник',
  creative: 'Арт-объект',
  secret: 'Необычное',
  houses: 'Архитектура',
  mansions: 'Особняк',
};

export function mustSeeFilterStopTypeTag(id: MustSeeFilterId): string {
  return STOP_TYPE_BY_FILTER[id] || 'Место';
}

/** Visible tabs: only categories with ≥1 item. Prefer `main` as default when present. */
export function buildMustSeeFilterTabs(
  places: MustSeeClassifyInput[],
): { tabs: MustSeeFilterTab[]; defaultId: MustSeeFilterId } {
  const counts: Record<MustSeeFilterId, number> = {
    main: 0,
    gastro: 0,
    museum: 0,
    science: 0,
    literature: 0,
    views: 0,
    street: 0,
    park: 0,
    temple: 0,
    monument: 0,
    creative: 0,
    secret: 0,
    houses: 0,
    mansions: 0,
  };
  for (const place of places) {
    counts[classifyMustSeePlace(place)] += 1;
  }
  const tabs = FILTER_ORDER.filter((id) => counts[id] > 0).map((id) => ({
    id,
    label: FILTER_LABELS[id],
    count: counts[id],
  }));
  const defaultId =
    tabs.find((tab) => tab.id === 'main')?.id || tabs[0]?.id || 'main';
  return { tabs, defaultId };
}

export function filterMustSeePlaces<T extends MustSeeClassifyInput>(
  places: T[],
  filterId: MustSeeFilterId,
): T[] {
  return places.filter((place) => classifyMustSeePlace(place) === filterId);
}

/** Places for default «Собрать за минуту» / bulk main: landmarks without gastro. */
export function mustSeePlacesForDefaultPreset(places: CityMustSeeItem[]): CityMustSeeItem[] {
  const main = filterMustSeePlaces(places, 'main');
  if (main.length >= 3) return main;
  const nonGastro = places.filter((place) => classifyMustSeePlace(place) !== 'gastro');
  return nonGastro.length ? nonGastro : places;
}
