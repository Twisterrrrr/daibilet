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

export function resolvePreviewFormat(event: PreviewFormatSource): string {
  const subcategory = taxonomyTitle(event.catalogSubcategory);
  const catalogCategory = taxonomyTitle(event.catalogCategory);
  const category = event.category || catalogCategory;
  const source = [subcategory, category, ...(event.subcategories || []), ...(event.tagLabels || []), ...(event.tags || [])].join(' ').toLocaleLowerCase('ru');
  const title = String(event.title || '').toLocaleLowerCase('ru');
  if (/ёлк|елк/.test(`${source} ${title}`)) return 'Ёлки';
  if (/детск|семь|реб[её]н/.test(`${source} ${title}`)) return 'Детская программа';
  if (/фейерверк|салют/.test(`${source} ${title}`)) return 'Фейерверк';
  if (/гулян/.test(`${source} ${title}`)) return 'Гуляния';
  if (/квартирник|акустик/.test(`${source} ${title}`)) return 'Квартирник';
  if (/концерт|музык|джаз|оркестр/.test(`${source} ${title}`)) return 'Концерт';
  if (/спектакл|представлен|театр/.test(`${source} ${title}`)) return 'Спектакль';
  if (/экскурс|прогулк|квест/.test(`${source} ${title}`)) return 'Экскурсия';
  return subcategory || category || event.subcategories?.[0] || event.tagLabels?.[0] || 'Мероприятие';
}
