import Link from 'next/link';

import { pluralEvents } from '@/lib/format';
import { landingCategoryHref } from '@/lib/landing-routes';
import type { PodborkiCatalogItem } from '@/lib/podborki-categories';

export function PodborkiCatalogSsrFallback({
  items,
  citySlug,
  title,
  description,
}: {
  items: PodborkiCatalogItem[];
  citySlug?: string;
  title: string;
  description: string;
}) {
  const visible = items.filter((item) => item.events > 0);

  return (
    <div data-ssr-podborki-list>
      <section className="border-b border-slate-100 bg-white">
        <div className="container-page py-10 sm:py-14">
          <h1 className="max-w-4xl font-display text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">
            {description}
          </p>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10" aria-labelledby="podborki-ssr-title">
        <h2 id="podborki-ssr-title" className="font-display text-xl font-bold text-slate-950 sm:text-2xl">
          Выберите готовый сценарий
        </h2>
        {visible.length ? (
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <li key={item.slug}>
                <Link
                  href={landingCategoryHref(item.slug, citySlug)}
                  className="group flex h-full min-h-40 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary-300 hover:shadow-md"
                >
                  <h3 className="font-display text-lg font-bold leading-snug text-slate-950 group-hover:text-primary-700">
                    {item.title}
                  </h3>
                  {item.subtitle ? (
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.subtitle}</p>
                  ) : null}
                  <p className="mt-auto pt-5 text-sm font-semibold text-primary-700">
                    {pluralEvents(item.events)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600">
            Подборки для этого города скоро появятся.
          </p>
        )}
      </section>
    </div>
  );
}
