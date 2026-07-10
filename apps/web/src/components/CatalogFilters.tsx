import type { PublicCatalogDto } from '@daibilet/contracts/public';

const SORT_OPTIONS = [
  { value: 'time', label: 'По времени' },
  { value: 'price_asc', label: 'Сначала дешевле' },
  { value: 'price_desc', label: 'Сначала дороже' },
  { value: 'popular', label: 'Популярные' },
] as const;

const DATE_OPTIONS = [
  { value: 'all', label: 'Любая дата' },
  { value: 'today', label: 'Сегодня' },
  { value: 'tomorrow', label: 'Завтра' },
  { value: 'weekend', label: 'На выходных' },
] as const;

type CatalogFiltersProps = {
  facets: PublicCatalogDto['facets'];
  values: {
    city?: string;
    date?: string;
    sort?: string;
    q?: string;
  };
};

export function CatalogFilters({ facets, values }: CatalogFiltersProps) {
  const cities = facets.cities.slice(0, 24);

  return (
    <form method="get" className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Город</span>
          <select
            name="city"
            defaultValue={values.city || 'all'}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <option value="all">Все города</option>
            {cities.map((city) => (
              <option key={city.name} value={city.name}>
                {city.name} ({city.events})
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Дата</span>
          <select
            name="date"
            defaultValue={values.date || 'all'}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            {DATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Сортировка</span>
          <select
            name="sort"
            defaultValue={values.sort || 'time'}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Поиск</span>
          <input
            type="search"
            name="q"
            defaultValue={values.q || ''}
            placeholder="Название, тег, площадка"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          Применить
        </button>
        <a href="/events" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:text-primary">
          Сбросить
        </a>
      </div>
    </form>
  );
}
