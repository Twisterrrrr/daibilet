import { landingCategoryHref } from '@/lib/landing-routes';

export type CatalogInterstitial = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
};

/** Editorial breaks for the catalog card grid - every N cards. */
export const CATALOG_INTERSTITIAL_EVERY = 8;

export function catalogInterstitialsForCity(citySlug?: string | null): CatalogInterstitial[] {
  const city = citySlug?.trim() || undefined;
  const cityQs = city ? `?city=${encodeURIComponent(city)}` : '';

  return [
    {
      id: 'rooftops',
      eyebrow: 'Гид',
      title:
        city === 'sankt-peterburg' || city === 'saint-petersburg'
          ? 'Впервые в Питере?'
          : 'Куда сходить с высоты',
      description: 'Подборка прогулок по крышам и смотровых - без хаоса в поиске.',
      href: landingCategoryHref('rooftops', city),
      cta: 'Смотреть гид',
    },
    {
      id: 'river',
      eyebrow: 'На воде',
      title: 'Речные прогулки',
      description: 'Дневные рейсы, закаты и круизы с ужином - сравните причал и время.',
      href: landingCategoryHref('river-cruises', city),
      cta: 'Выбрать рейс',
    },
    {
      id: 'weekend',
      eyebrow: 'План',
      title: 'Что посмотреть на выходных',
      description: 'Готовые сценарии под настроение: с детьми, для двоих или большой компанией.',
      href: `/podborki${cityQs}`,
      cta: 'Открыть подборки',
    },
    {
      id: 'blog',
      eyebrow: 'Блог',
      title: 'Маршруты и советы',
      description: 'Статьи с картами и ссылками на билеты - удобно перед поездкой.',
      href: '/blog',
      cta: 'Читать блог',
    },
  ];
}
