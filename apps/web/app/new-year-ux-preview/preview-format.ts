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
