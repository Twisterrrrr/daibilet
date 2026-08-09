'use client';

import { useSearchParams } from 'next/navigation';

import { PageBreadcrumbBar } from '@/components/PageBreadcrumbs';
import { useCity } from '@/components/CityProvider';
import { getCityLabelGenitive } from '@/lib/cities';

/**
 * Compact catalog header: breadcrumbs + H1 + short subtitle.
 * Search/filters live in CatalogToolbar below - keep first viewport dense.
 */
export function EventsCatalogHero() {
  const searchParams = useSearchParams();
  const { city } = useCity();
  const cityLabel = getCityLabelGenitive(city);
  const q = (searchParams.get('q') || '').trim();
  const category = (searchParams.get('category') || '').trim();

  const title = q
    ? `Результаты поиска: «${q}»`
    : category
      ? `События: ${category}`
      : `Афиша событий в ${cityLabel}`;

  const subtitle = q
    ? `Подборка по запросу в ${cityLabel}`
    : category
      ? `Афиша в категории «${category}» - ${cityLabel}`
      : `Билеты и расписание - выбирайте по дате и интересам`;

  return (
    <>
      <PageBreadcrumbBar
        items={[
          { label: 'Главная', href: '/' },
          { label: 'События', href: '/events' },
          ...(category ? [{ label: category }] : []),
        ]}
      />
      <header className="border-b border-slate-100 bg-white">
        <div className="container-page py-4 sm:py-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-graphite sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-snug text-graphite-muted sm:text-[15px]">{subtitle}</p>
        </div>
      </header>
    </>
  );
}
