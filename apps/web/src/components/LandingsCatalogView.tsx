import Link from 'next/link';

import { SiteLayout } from '@/components/SiteLayout';
import { formatPriceFrom, pluralEvents } from '@/lib/format';
import { landingCategoryHref } from '@/lib/landing-routes';

type LandingCatalogItem = {
  slug: string;
  title: string;
  subtitle: string;
  events: number;
  priceFrom?: number | null;
};

export function LandingsCatalogView({
  items,
  city,
}: {
  items: LandingCatalogItem[];
  city: string;
}) {
  return (
    <SiteLayout>
      <div className="container-page py-8">
        <nav className="text-sm text-slate-500">
          <Link href="/" className="hover:text-primary">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <span>Подборки</span>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Подборки событий</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Тематические коллекции: речные прогулки, экскурсии, концерты и сезонные маршруты.
          </p>
        </header>

        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Город</span>
            <select
              name="city"
              defaultValue={city}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Все города</option>
              <option value="moscow">Москва</option>
              <option value="saint-petersburg">Санкт-Петербург</option>
              <option value="kazan">Казань</option>
              <option value="sochi">Сочи</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Показать
          </button>
        </form>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.slug}>
              <Link
                href={landingCategoryHref(item.slug, city !== 'all' ? city : undefined)}
                className="block h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-primary/40 hover:shadow-sm"
              >
                <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{item.subtitle}</p>
                <p className="mt-4 text-sm font-medium text-slate-700">
                  {pluralEvents(item.events)}
                  {item.priceFrom ? ` · от ${formatPriceFrom(item.priceFrom)}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SiteLayout>
  );
}
