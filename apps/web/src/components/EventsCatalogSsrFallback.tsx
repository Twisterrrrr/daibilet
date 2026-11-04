import type { PublicCatalogDto, PublicCatalogListItemDto } from '@daibilet/contracts/public';

import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { EventCard } from '@/components/EventCard';
import { isCatalogExcludedMuseumAdmission } from '@/lib/catalog-exclusions';
import { pluralEvents } from '@/lib/format';
import { collapseCatalogComboFamilies } from '@/lib/home-showcase-sections';

const EVENTS_SUPPORT =
  'Официальные билеты на экскурсии, концерты и музеи более чем в 100 городах России.';

export function selectEventsCatalogSsrItems(
  items: PublicCatalogListItemDto[],
): PublicCatalogListItemDto[] {
  return collapseCatalogComboFamilies(items).filter(
    (item) => !isCatalogExcludedMuseumAdmission(item),
  );
}

export function EventsCatalogSsrHero() {
  return (
    <div className="border-b border-slate-100 bg-white" data-ssr-events-hero>
      <div className="container-page py-3 sm:py-5">
        <h1 className="font-display text-2xl font-bold text-graphite sm:text-3xl">
          Афиша событий
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-graphite-muted sm:text-base">
          {EVENTS_SUPPORT}
        </p>
      </div>
    </div>
  );
}

export function EventsCatalogSsrFallback({
  catalog,
}: {
  catalog: PublicCatalogDto | null;
}) {
  if (!catalog) {
    return (
      <section className="py-10 text-center" aria-live="polite">
        <h2 className="font-display text-xl font-bold text-graphite">Афиша загружается</h2>
        <p className="mt-2 text-sm text-graphite-muted">
          Обновите страницу через несколько секунд, если список не появился.
        </p>
      </section>
    );
  }

  const items = selectEventsCatalogSsrItems(catalog.items || []);
  const page = Math.max(1, Math.floor((catalog.offset || 0) / Math.max(catalog.limit, 1)) + 1);

  return (
    <section id="catalog-results" className="scroll-mt-28" data-ssr-event-catalog>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-700">Каталог</p>
          <h2 className="mt-1 font-display text-xl font-bold text-graphite sm:text-2xl">
            Все события
          </h2>
        </div>
        <p className="text-sm text-graphite-muted">{pluralEvents(catalog.total)}</p>
      </div>

      {items.length ? (
        <ul className="catalog-card-grid">
          {items.map((session, index) => (
            <li key={`${session.id}-${session.startsAt}`} className="min-w-0">
              <EventCard
                session={session}
                compact
                catalogDense
                imagePriority={index < 4}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-graphite-muted">
          В ближайшем расписании пока нет событий.
        </p>
      )}

      <CatalogPaginationLinks
        page={page}
        total={catalog.total}
        limit={catalog.limit}
        shownCount={Math.min(items.length, catalog.total)}
        searchParams={{}}
      />
    </section>
  );
}
