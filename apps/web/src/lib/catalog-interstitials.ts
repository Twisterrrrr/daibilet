import { landingCategoryHref } from '@/lib/landing-routes';

export type CatalogInterstitial = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
};

/** Editorial breaks for the catalog card grid — every N full rows. */
export const CATALOG_INTERSTITIAL_ROWS = 2;

/** @deprecated Use `catalogInterstitialInterval(columnsPerRow)` — kept for analytics docs. */
export const CATALOG_INTERSTITIAL_EVERY = 8;

/** Cards between banners; always aligns with complete grid rows. */
export function catalogInterstitialInterval(columnsPerRow: number): number {
  const cols = Math.max(1, Math.trunc(columnsPerRow) || 1);
  return cols * CATALOG_INTERSTITIAL_ROWS;
}

export function catalogInterstitialsForCity(citySlug?: string | null): CatalogInterstitial[] {
  const city = citySlug?.trim() || undefined;
  const cityQs = city ? `?city=${encodeURIComponent(city)}` : '';

  return [
    {
      id: 'rooftops',
      eyebrow: 'Подборка',
      title:
        city === 'sankt-peterburg' || city === 'saint-petersburg'
          ? 'Впервые в Питере?'
          : 'Посмотреть на город с высоты',
      description: 'Подборка прогулок по крышам и смотровым площадкам в разных городах России',
      href: landingCategoryHref('rooftops', city),
      cta: 'Перейти',
    },
    {
      id: 'river',
      eyebrow: 'Подборка',
      title: 'Речные прогулки',
      description: 'Дневные рейсы, закаты и круизы с ужином - сравнивайте цены, причалы и время отправления',
      href: landingCategoryHref('river-cruises', city),
      cta: 'Выбрать рейс',
    },
    {
      id: 'weekend',
      eyebrow: 'Подборка',
      title: 'Что посмотреть на выходных',
      description: 'Готовые сценарии под настроение: с детьми, для двоих или большой компанией.',
      href: `/podborki${cityQs}`,
      cta: 'Открыть подборки',
    },
    {
      id: 'blog',
      eyebrow: 'Из Блога',
      title: 'Маршруты и советы',
      description: 'Статьи с картами и ссылками на билеты - удобно перед поездкой.',
      href: '/blog',
      cta: 'Читать блог',
    },
  ];
}
