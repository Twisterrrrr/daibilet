import Link from 'next/link';
import type { PublicCatalogDto, PublicCatalogListItemDto } from '@daibilet/contracts/public';
import type { PublicUnifiedCatalogDto, PublicUnifiedCatalogItemDto } from '@daibilet/contracts/catalog';

import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { EventCard } from '@/components/EventCard';
import { SafeImage } from '@/components/SafeImage.client';
import { isCatalogExcludedMuseumAdmission } from '@/lib/catalog-exclusions';
import { pluralEvents } from '@/lib/format';
import { collapseCatalogComboFamilies } from '@/lib/home-showcase-sections';
import { inCityPrepositional } from '@/lib/city-declension';

const EVENTS_SUPPORT =
  'Официальные билеты на экскурсии, концерты и музеи более чем в 100 городах России.';

export function selectEventsCatalogSsrItems(
  items: PublicCatalogListItemDto[],
): PublicCatalogListItemDto[] {
  return collapseCatalogComboFamilies(items).filter(
    (item) => !isCatalogExcludedMuseumAdmission(item),
  );
}

export function EventsCatalogSsrHero({ cityName }: { cityName?: string }) {
  return (
    <div className="border-b border-slate-100 bg-white" data-ssr-events-hero>
      <div className="container-page py-3 sm:py-5">
        <h1 className="font-display text-2xl font-bold text-graphite sm:text-3xl">
          {cityName ? `Афиша событий ${inCityPrepositional(cityName)}` : 'Афиша событий'}
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
  basePath = '/events',
}: {
  catalog: PublicUnifiedCatalogDto | PublicCatalogDto | null;
  basePath?: string;
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

  const normalizedItems: PublicUnifiedCatalogItemDto[] = catalog.items.map((item) => 'productKind' in item ? item : ({
    ...item,
    productKind: 'EVENT' as const,
    href: `/events/${encodeURIComponent(item.eventPageIndexableSlug || item.eventPageSlug || item.slug || item.id)}`,
  }));
  const events = normalizedItems.filter((item) => item.productKind === 'EVENT');
  const visibleEvents = new Set(selectEventsCatalogSsrItems(events).map((item) => `${item.id}:${item.startsAt}`));
  const items = normalizedItems.filter((item) => item.productKind === 'ADMISSION' || visibleEvents.has(`${item.id}:${item.startsAt}`));
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
          {items.map((item, index) => <li key={item.productKind === 'ADMISSION' ? `admission-${item.id}` : `event-${item.id}-${item.startsAt}`} className="min-w-0">
            {item.productKind === 'ADMISSION' ? <AdmissionCatalogCard item={item} /> : <EventCard session={item} compact catalogDense imagePriority={index < 4} />}
          </li>)}
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
        basePath={basePath}
      />
    </section>
  );
}

function AdmissionCatalogCard({ item }: { item: Extract<PublicUnifiedCatalogItemDto, { productKind: 'ADMISSION' }> }) {
  return <Link href={item.href} className="group block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="relative aspect-[4/3] bg-slate-100">
      <SafeImage src={item.imageUrl} alt="" fill sizes="(max-width: 640px) 50vw, 300px" className="object-cover" fallback={<div className="h-full w-full bg-slate-100" />} />
      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700">Входной билет</span>
    </div>
    <div className="p-3 sm:p-4">
      <p className="text-xs font-medium text-slate-500">{item.dateLabel}</p>
      <h3 className="mt-1 line-clamp-2 font-semibold text-slate-950 group-hover:text-primary-700">{item.title}</h3>
      <p className="mt-1 line-clamp-1 text-sm text-slate-600">{[item.venue, item.city].filter(Boolean).join(' · ')}</p>
      {item.priceFrom != null ? <p className="mt-3 font-bold text-slate-950">от {item.priceFrom.toLocaleString('ru-RU')} ₽</p> : null}
    </div>
  </Link>;
}
