export type CatalogListKey = 'family_kids' | 'family_all' | 'free' | 'weekend';
export type CatalogConfidence = 'high' | 'medium' | 'low';

export interface CatalogTaxonomyNode {
  slug: string;
  title: string;
  category: { slug: string; title: string };
}

export interface EventTaxonomyInput {
  title?: string | null | undefined;
  category?: string | null | undefined;
  categorySlug?: string | null | undefined;
  editorialSubcategorySlug?: string | null | undefined;
  editorialSubcategoryTitle?: string | null | undefined;
  sourceSubcategories?: string[] | null | undefined;
  tags?: string[] | null | undefined;
  venue?: string | null | undefined;
  venuePlaceType?: string | null | undefined;
  venuePlaceSubtype?: string | null | undefined;
  ageLimit?: string | null | undefined;
  priceFrom?: number | null | undefined;
  freeAdmissionConfirmed?: boolean | undefined;
  weekendSessionConfirmed?: boolean | undefined;
  landingSlugs?: string[] | null | undefined;
  startsAt?: string | Date | null | undefined;
  upcomingSlots?: Array<{ startsAt?: string | Date | null | undefined }> | null | undefined;
  timeZone?: string | null | undefined;
}

export interface EventTaxonomyResolution {
  category: CatalogTaxonomyNode['category'] | null;
  subcategory: CatalogTaxonomyNode | null;
  confidence: CatalogConfidence;
  reasons: string[];
}

export const EVENT_CATALOG_TAXONOMY: readonly CatalogTaxonomyNode[] = [
  { slug: 'concerts', title: 'Концерты', category: { slug: 'events', title: 'Афиша' } },
  { slug: 'performances', title: 'Спектакли', category: { slug: 'events', title: 'Афиша' } },
  { slug: 'shows', title: 'Шоу', category: { slug: 'events', title: 'Афиша' } },
  { slug: 'festivals', title: 'Фестивали', category: { slug: 'events', title: 'Афиша' } },
  { slug: 'exhibitions', title: 'Выставки', category: { slug: 'culture', title: 'Культура' } },
  { slug: 'museums', title: 'Музеи', category: { slug: 'culture', title: 'Культура' } },
  { slug: 'excursions', title: 'Экскурсии', category: { slug: 'excursions', title: 'Экскурсии' } },
  { slug: 'entertainment', title: 'Развлечения', category: { slug: 'entertainment', title: 'Развлечения' } },
  { slug: 'active-leisure', title: 'Активный отдых', category: { slug: 'active-leisure', title: 'Активный отдых' } },
];

const NODE_BY_SLUG = new Map(EVENT_CATALOG_TAXONOMY.map((node) => [node.slug, node]));

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  sub_events_concerts: 'concerts', sub_events_theater: 'performances', sub_events_show: 'shows', sub_events_festivals: 'festivals',
  sub_museums_museums: 'museums', sub_museums_exhibitions: 'exhibitions', sub_excursions_water: 'excursions',
  sub_excursions_bus: 'excursions', sub_excursions_walking: 'excursions', sub_excursions_tours: 'excursions',
  sub_active_sport: 'active-leisure', sub_active_activities: 'active-leisure', sub_active_extreme: 'active-leisure',
  concert: 'concerts', concerts: 'concerts', 'концерт': 'concerts', 'концерты': 'concerts', 'музыкальные концерты': 'concerts',
  theatre: 'performances', theater: 'performances', 'театр': 'performances', 'театры': 'performances', 'спектакль': 'performances', 'спектакли': 'performances',
  show: 'shows', 'шоу': 'shows', 'стендап': 'shows', 'стендап и юмор': 'shows', 'юмор': 'shows',
  festival: 'festivals', 'фестиваль': 'festivals', 'фестивали': 'festivals',
  exhibition: 'exhibitions', 'выставка': 'exhibitions', 'выставки': 'exhibitions',
  museum: 'museums', 'музей': 'museums', 'музеи': 'museums',
  excursion: 'excursions', 'экскурсия': 'excursions', 'экскурсии': 'excursions',
  'водные экскурсии': 'excursions', 'автобусные экскурсии': 'excursions', 'пешеходные экскурсии': 'excursions',
  'водные прогулки': 'excursions', 'речные прогулки': 'excursions', 'туры и поездки': 'excursions',
  entertainment: 'entertainment', 'развлечения': 'entertainment', 'развлекательные центры': 'entertainment',
  'зоопарки и фермы': 'entertainment', 'мастер-классы': 'entertainment', 'мастер классы': 'entertainment',
  sport: 'active-leisure', 'спорт': 'active-leisure', 'активности': 'active-leisure', 'экстрим': 'active-leisure', 'активный отдых': 'active-leisure',
};

const LANDING_LABELS: Readonly<Record<string, string>> = {
  kontserty: 'concerts', concerts: 'concerts', spektakli: 'performances', teatr: 'performances', 'neobychnye-teatry': 'performances',
  shou: 'shows', 'shou-programmy': 'shows', stendap: 'shows', festivals: 'festivals', festi: 'festivals',
  vystavki: 'exhibitions', 'vystavki-i-muzei': 'exhibitions', muzei: 'museums', museums: 'museums',
  ekskursii: 'excursions', 'rechnye-progulki': 'excursions', 'avtobusnye-ekskursii': 'excursions', 'peshiye-ekskursii': 'excursions',
  razvlecheniya: 'entertainment', 'aktivnyy-otdyh': 'active-leisure', sport: 'active-leisure',
};

export function resolveEventTaxonomy(input: EventTaxonomyInput): EventTaxonomyResolution {
  const editorial = normalize(input.editorialSubcategorySlug || input.editorialSubcategoryTitle || '');
  const editorialSlug = SOURCE_LABELS[editorial] || normalizeSlugAlias(editorial);
  const editorialNode = NODE_BY_SLUG.get(editorialSlug);
  if (editorialNode) {
    return { category: editorialNode.category, subcategory: editorialNode, confidence: 'high', reasons: ['editorial_subcategory'] };
  }

  const sourceValues = [input.editorialSubcategoryTitle, ...(input.sourceSubcategories || []), ...(input.tags || [])]
    .filter((value): value is string => Boolean(value));
  const sourceMatch = firstMapped(sourceValues, SOURCE_LABELS);
  if (sourceMatch) {
    const node = NODE_BY_SLUG.get(sourceMatch)!;
    const editorialTitle = input.editorialSubcategoryTitle && normalize(input.editorialSubcategoryTitle) === normalize(sourceValues[0] || '');
    return { category: node.category, subcategory: node, confidence: editorialTitle ? 'high' : 'medium', reasons: [editorialTitle ? 'editorial_subcategory_title' : 'source_taxonomy'] };
  }

  const landingMatch = firstMapped(input.landingSlugs || [], LANDING_LABELS);
  if (landingMatch) {
    const node = NODE_BY_SLUG.get(landingMatch)!;
    return { category: node.category, subcategory: node, confidence: 'medium', reasons: ['landing_rule'] };
  }

  const title = normalize(input.title || '');
  const titleMatch = titleRule(title);
  if (titleMatch) {
    const node = NODE_BY_SLUG.get(titleMatch)!;
    return { category: node.category, subcategory: node, confidence: 'medium', reasons: ['title_rule'] };
  }

  return { category: null, subcategory: null, confidence: 'low', reasons: ['no_confident_mapping'] };
}

export function resolveCatalogLists(input: EventTaxonomyInput): CatalogListKey[] {
  const lists: CatalogListKey[] = [];
  if (input.freeAdmissionConfirmed === true || input.priceFrom === 0) lists.push('free');
  const age = parseAgeLimit(input.ageLimit);
  const audience = scoreFamilyAudience(input, age);
  if (age != null && age <= 6 && !audience.adultOnly) {
    if (audience.childScore >= 5) lists.push('family_kids');
    else if (audience.familyScore >= 5) lists.push('family_all');
  }
  if (input.weekendSessionConfirmed === true || hasWeekendSession(input)) lists.push('weekend');
  return lists;
}

export function familyAudienceReviewReason(input: EventTaxonomyInput): string | null {
  const age = parseAgeLimit(input.ageLimit);
  const audience = scoreFamilyAudience(input, age);
  if (audience.adultOnly) return null;
  if ((audience.childScore >= 4 || audience.familyScore >= 4) && age == null) return 'audience_signal_without_age_confirmation';
  if ((audience.childScore >= 4 || audience.familyScore >= 4) && age != null && age > 6 && age < 12) return 'audience_signal_age_over_6';
  return null;
}

export function catalogListsWithTitles(keys: CatalogListKey[]): Array<{ key: CatalogListKey; title: string }> {
  const titles: Record<CatalogListKey, string> = {
    family_kids: 'Для детей', family_all: 'Для всей семьи', free: 'Бесплатно', weekend: 'На выходных',
  };
  return keys.map((key) => ({ key, title: titles[key] }));
}

export function normalizeCatalogTagLabels(tags: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags || []) {
    const label = String(raw || '').trim().replace(/\s+/g, ' ');
    const key = normalize(label);
    if (!label || !key || seen.has(key) || /^(wc|туалет|парковка|гардероб|кондиционер|wifi|wi-fi)$/i.test(key)) continue;
    if (/^(теплоход|катер|яхт|судно|лодк|площадка)\s*:/i.test(label)) continue;
    seen.add(key);
    result.push(label);
    if (result.length >= 8) break;
  }
  return result;
}

function scoreFamilyAudience(input: EventTaxonomyInput, age: number | null) {
  const tags = (input.tags || []).map(normalize);
  const subcategories = (input.sourceSubcategories || []).map(normalize);
  const title = normalize(input.title || '');
  const venue = normalize([input.venue, input.venuePlaceSubtype].filter(Boolean).join(' '));
  const childTerms = /(^|[^\p{L}])(?:детск(?:ий|ая|ое|ие)?|для детей|детям|малыш(?:ам|и)?|сказк\p{L}*|мульт\p{L}*|елк\p{L}*|кукольн\p{L}*|детское шоу)(?=$|[^\p{L}])/u;
  const familyTerms = /(^|[^\p{L}])(?:семейн\p{L}*|для всей семьи|для взрослых и детей|взрослым и детям)(?=$|[^\p{L}])/u;
  const negatedChild = /(?:не для детей|детский сад|детсад)/u.test(title);
  const adultOnly = /^(?:12|16|18)\s*\+?$/u.test(normalize(input.ageLimit || '')) ||
    /(^|[^\p{L}])(?:ночн\p{L}*|бар|клуб|стендап|комеди\p{L}*|юмор для взрослых|андеграунд|дискотек\p{L}* до утра)(?=$|[^\p{L}])/u.test(title);
  if (adultOnly || negatedChild) return { childScore: 0, familyScore: 0, adultOnly: true };

  let childScore = 0;
  let familyScore = 0;
  if (tags.some((tag) => /(^|[^\p{L}])(?:детск\p{L}*|детям|для детей)(?=$|[^\p{L}])/u.test(tag)) ||
      subcategories.some((tag) => /^(детям|для детей|детские мероприятия|sub[_-]entertainment[_-]children)$/.test(tag))) childScore += 5;
  if (tags.some((tag) => /(^|[^\p{L}])(?:семейн\p{L}*|для всей семьи|для семейного просмотра)(?=$|[^\p{L}])/u.test(tag)) ||
      subcategories.some((tag) => /(^|[^\p{L}])(?:семейн\p{L}*|для всей семьи|для семейного просмотра)(?=$|[^\p{L}])/u.test(tag))) familyScore += 5;
  if (subcategories.some((tag) => /^(зоопарки и фермы|развлекательные центры|sub[_-]entertainment[_-](?:zoo|fun))$/.test(tag))) familyScore += 5;
  if (childTerms.test(title)) childScore += 4;
  if (familyTerms.test(title)) familyScore += 4;
  if (['circus', 'zoo', 'aquarium', 'water_park', 'planetarium', 'amusement_park', 'puppet_theatre', 'children_theatre'].some((term) => venue.includes(normalize(term)))) {
    familyScore += 4;
  }
  if (/(кукольн\p{L}* театр|детск\p{L}* театр)/u.test(venue)) familyScore += 4;
  if (age != null && age <= 6) {
    if (childScore) childScore += 2;
    if (familyScore) familyScore += 2;
  }
  const daytime = (input.upcomingSlots || []).some((slot) => {
    const date = toDate(slot.startsAt);
    return date ? Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: input.timeZone || 'UTC' }).format(date)) < 15 : false;
  });
  if (daytime) {
    if (childScore) childScore += 1;
    if (familyScore) familyScore += 1;
  }
  return { childScore, familyScore, adultOnly: false };
}

function hasWeekendSession(input: EventTaxonomyInput): boolean {
  const values = [...(input.upcomingSlots || []).map((slot) => slot.startsAt), input.startsAt];
  return values.some((value) => {
    const date = toDate(value);
    if (!date) return false;
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: input.timeZone || 'UTC' }).format(date);
    return weekday === 'Sat' || weekday === 'Sun';
  });
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function parseAgeLimit(value: string | null | undefined): number | null {
  // Imported Event.ageLimit values are often stored as "0" / "6" without the plus sign.
  const match = String(value || '').trim().match(/^(0|3|6|7|12|16|18)\s*\+?$/);
  return match ? Number(match[1]) : null;
}

function firstMapped(values: string[], map: Readonly<Record<string, string>>): string | null {
  for (const raw of values) {
    const key = normalize(raw);
    const direct = map[key];
    if (direct) return direct;
    const slug = normalizeSlugAlias(key);
    if (NODE_BY_SLUG.has(slug)) return slug;
  }
  return null;
}

function titleRule(title: string): string | null {
  if (!title) return null;
  const rules: Array<[RegExp, string]> = [
    [/(^|[^\p{L}])(?:концерт|концерты|концертная программа|музыкальный вечер)(?=$|[^\p{L}])/u, 'concerts'],
    [/(^|[^\p{L}])(?:спектакль|спектакли|постановка|балет|опера|мюзикл)(?=$|[^\p{L}])/u, 'performances'],
    [/(^|[^\p{L}])(?:шоу|стендап|цирковое представление)(?=$|[^\p{L}])/u, 'shows'],
    [/(^|[^\p{L}])(?:фестиваль|фестивали)(?=$|[^\p{L}])/u, 'festivals'],
    [/(^|[^\p{L}])(?:выставка|выставки|экспозиция)(?=$|[^\p{L}])/u, 'exhibitions'],
    [/(^|[^\p{L}])(?:музей|музеи|входной билет в музей)(?=$|[^\p{L}])/u, 'museums'],
    [/(^|[^\p{L}])(?:экскурсия|экскурсии|прогулка с гидом)(?=$|[^\p{L}])/u, 'excursions'],
    [/(^|[^\p{L}])(?:квест|аттракцион|мастер-класс|мастер класс)(?=$|[^\p{L}])/u, 'entertainment'],
    [/(^|[^\p{L}])(?:тренировка|турнир|забег|катание|активный отдых)(?=$|[^\p{L}])/u, 'active-leisure'],
  ];
  for (const [pattern, slug] of rules) if (pattern.test(title)) return slug;
  return null;
}

function normalizeSlugAlias(value: string): string {
  const aliases: Record<string, string> = {
    koncerty: 'concerts', spektakli: 'performances', teatr: 'performances', shou: 'shows',
    festivali: 'festivals', vystavki: 'exhibitions', muzei: 'museums', ekskursii: 'excursions',
    razvlecheniya: 'entertainment', 'aktivnyy-otdyh': 'active-leisure',
  };
  return aliases[value] || value;
}

function normalize(value: string): string {
  return String(value || '').trim().toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ').replace(/[–—]/g, '-');
}
