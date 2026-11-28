type TaxonomyValue = string | { title?: string; slug?: string } | null | undefined;

type PreviewFormatSource = {
  title: string;
  category?: string | null;
  catalogCategory?: TaxonomyValue;
  catalogSubcategory?: TaxonomyValue;
  subcategories?: string[];
  tags?: string[];
  tagLabels?: string[];
};

function taxonomyTitle(value?: TaxonomyValue): string {
  if (typeof value === 'string') return value;
  return value?.title || '';
}

function taxonomySlug(value?: TaxonomyValue): string {
  return typeof value === 'object' && value ? value.slug || '' : '';
}

const NEW_YEAR_FORMATS = [
  'Ёлки',
  'Концерты',
  'Спектакли',
  'Шоу',
  'Экскурсии',
  'Квесты',
] as const;

const SECONDARY_NEW_YEAR_FORMATS = ['Выставки', 'Мастер-классы'] as const;
const OPTIONAL_FORMAT_MIN_COUNT = 5;

export type PreviewTheme = 'new-year' | 'concerts-genre' | 'family-kids';

const CONCERT_GENRES: Array<{ label: string; patterns: RegExp[] }> = [
  { label: 'Рок', patterns: [/\bрок\b/i, /rock/i, /металл/i, /metal/i, /альтернатив/i, /инди/i] },
  { label: 'Поп', patterns: [/\bпоп\b/i, /эстрад/i, /pop/i] },
  { label: 'Джаз и блюз', patterns: [/джаз/i, /jazz/i, /блюз/i, /blues/i] },
  { label: 'Классическая музыка', patterns: [/классик/i, /classical/i, /симфони/i, /оркестр/i, /орган/i, /камерн/i, /академическ/i] },
  { label: 'Электронная музыка', patterns: [/электрон/i, /electron/i, /dj[-\s]?set/i, /рейв/i] },
  { label: 'Рэп и хип-хоп', patterns: [/рэп/i, /хип[\s-]?хоп/i, /hip[\s-]?hop/i] },
  { label: 'Авторская песня', patterns: [/авторск/i, /бард/i, /шансон/i] },
];

const FAMILY_FORMATS: Array<{ label: string; patterns: RegExp[] }> = [
  { label: 'Детские спектакли', patterns: [/детск.*спектакл/i, /спектакл.*дет/i, /театр.*дет/i, /детям/i] },
  { label: 'Цирк', patterns: [/цирк/i] },
  { label: 'Шоу и представления', patterns: [/шоу/i, /представлени/i, /иллюзион/i] },
  { label: 'Мастер-классы', patterns: [/мастер.?класс/i, /творческ.*занят/i] },
  { label: 'Экскурсии', patterns: [/экскурс/i] },
  { label: 'Музеи и выставки', patterns: [/музе/i, /выставк/i, /экспозиц/i] },
  { label: 'Интерактивные программы', patterns: [/интерактив/i, /анимац/i, /квест/i, /научн.*шоу/i] },
  { label: 'Развлечения', patterns: [/развлечен/i, /аттракцион/i, /батут/i, /парк/i] },
];

function taxonomySource(event: PreviewFormatSource): string[] {
  const taxonomy = [
    event.category,
    taxonomyTitle(event.catalogCategory),
    taxonomySlug(event.catalogCategory),
    taxonomyTitle(event.catalogSubcategory),
    taxonomySlug(event.catalogSubcategory),
    ...(event.subcategories || []),
    ...(event.tagLabels || []),
    ...(event.tags || []),
  ];
  return taxonomy.map((item) => String(item || '').trim()).filter(Boolean);
}

/** Genre facets use catalog taxonomy only; event-title keywords do not define a genre. */
export function resolveConcertGenres(event: PreviewFormatSource): string[] {
  const source = taxonomySource(event).join(' ');
  const matches = CONCERT_GENRES.filter((genre) => genre.patterns.some((pattern) => pattern.test(source))).map((genre) => genre.label);
  return matches.length ? matches : ['Другие жанры'];
}

/** Family formats are classified from catalog categories/tags, not guessed from the title. */
export function resolveFamilyFormats(event: PreviewFormatSource): string[] {
  const source = taxonomySource(event).join(' ');
  const matches = FAMILY_FORMATS.filter((format) => format.patterns.some((pattern) => pattern.test(source))).map((format) => format.label);
  return matches.length ? matches : ['Другие мероприятия'];
}

export function resolveThematicFormats(event: PreviewFormatSource, theme: PreviewTheme): string[] {
  if (theme === 'concerts-genre') return resolveConcertGenres(event);
  if (theme === 'family-kids') return resolveFamilyFormats(event);
  return [resolvePreviewFormat(event)];
}

export function visibleThematicFormatNames(counts: Map<string, number>, theme: PreviewTheme): string[] {
  if (theme === 'new-year') return visibleNewYearFormatNames(counts);
  return [...counts.keys()].filter((name) => (counts.get(name) || 0) > 0).sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b, 'ru'));
}

export function resolvePreviewFormat(event: PreviewFormatSource): string {
  const title = String(event.title || '').toLocaleLowerCase('ru');
  const subcategory = taxonomyTitle(event.catalogSubcategory).toLocaleLowerCase('ru');
  const subcategorySlug = taxonomySlug(event.catalogSubcategory).toLocaleLowerCase('ru');
  const category = [event.category, taxonomyTitle(event.catalogCategory), taxonomySlug(event.catalogCategory)]
    .filter(Boolean).join(' ').toLocaleLowerCase('ru');
  const source = [subcategory, category, ...(event.subcategories || []), ...(event.tagLabels || []), ...(event.tags || [])]
    .join(' ').toLocaleLowerCase('ru');

  // A specific catalog subcategory takes precedence over broad title words.
  if (/экскурс/.test(subcategory) || subcategorySlug === 'excursions') return 'Экскурсии';

  // Quest and tree programs are explicit New Year formats. A generic seasonal
  // tag such as "Ёлка" must not turn a themed quest into a tree performance.
  if (/квест/.test(`${title} ${subcategory} ${subcategorySlug}`)) return 'Квесты';
  if (/ёлк|елк/.test(title)) return 'Ёлки';

  if (/концерт/.test(subcategory) || subcategorySlug === 'concerts') return 'Концерты';
  if (/спектакл|театр/.test(subcategory) || subcategorySlug === 'performances') return 'Спектакли';
  if (/шоу/.test(subcategory) || subcategorySlug === 'shows') return 'Шоу';
  if (/выставк|музе/.test(subcategory) || ['exhibitions', 'museums'].includes(subcategorySlug)) return 'Выставки';
  if (/мастер.?класс/.test(subcategory) || ['master-class', 'master-classes'].includes(subcategorySlug)) return 'Мастер-классы';

  if (/экскурс|автобусн(?:ая|ый) тур/.test(title)) return 'Экскурсии';
  if (/спектакл|представлени|театр|балет|драма|пьес/.test(`${title} ${source}`)) return 'Спектакли';
  if (/шоу|цирк|кабаре|фейерверк|салют|гулян|стендап|stand\s*[-–—]?\s*up/.test(`${title} ${source}`)) return 'Шоу';
  if (/концерт|музык|джаз|оркестр|квартирник|акустик/.test(`${title} ${source}`)) return 'Концерты';
  if (/выставк|музе|экспозиц/.test(`${title} ${source}`)) return 'Выставки';
  if (/мастер.?класс/.test(`${title} ${source}`)) return 'Мастер-классы';

  return 'Другое';
}

export function visibleNewYearFormatNames(counts: Map<string, number>): string[] {
  const primary = NEW_YEAR_FORMATS.filter((name) => (counts.get(name) || 0) > 0);
  const secondary = SECONDARY_NEW_YEAR_FORMATS.filter((name) => (counts.get(name) || 0) >= OPTIONAL_FORMAT_MIN_COUNT);
  const other = (counts.get('Другое') || 0) > 0 ? ['Другое'] : [];
  return [...primary, ...secondary, ...other];
}
