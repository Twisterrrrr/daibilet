import { BRIDGES_LANDING } from '@/data/bridges-landing';

export const BRIDGES_AGGREGATE_RATING = {
  ratingValue: '4.8',
  reviewCount: 42,
};

export function buildBridgesProductJsonLd(params: {
  canonicalUrl: string;
  priceFrom: number | null;
  priceTo: number | null;
  offerCount: number;
  description: string;
}) {
  const low = Math.round(params.priceFrom || 1100);
  const high = Math.max(low, Math.round(params.priceTo || low));

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Ночные экскурсии на разводные мосты Санкт-Петербурга',
    description: params.description,
    brand: { '@type': 'Brand', name: 'Дайбилет' },
    url: params.canonicalUrl,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: BRIDGES_AGGREGATE_RATING.ratingValue,
      reviewCount: String(BRIDGES_AGGREGATE_RATING.reviewCount),
      bestRating: '5',
      worstRating: '1',
    },
    review: BRIDGES_LANDING.reviews.map((review) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.author },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: String(review.stars),
        bestRating: '5',
      },
      reviewBody: review.text,
    })),
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: String(low),
      highPrice: String(high),
      priceCurrency: 'RUB',
      offerCount: String(Math.max(params.offerCount, 1)),
      availability: 'https://schema.org/InStock',
      url: params.canonicalUrl,
    },
  };
}

export function formatBridgesEventsLabel(count: number): string {
  if (count >= 10) return `${count}+`;
  if (count > 0) return String(count);
  return '10+';
}

export function formatBridgesSeoTitle(priceFrom?: number | null): string {
  const price = Math.round(priceFrom && priceFrom > 0 ? priceFrom : 1100);
  return `Разводные мосты СПб: ночные экскурсии и билеты от ${price}₽`;
}

export function formatBridgesSeoDescription(
  events: number,
  priceFrom: number | null | undefined,
  scheduleDate: string,
): string {
  const price = Math.round(priceFrom && priceFrom > 0 ? priceFrom : 1100);
  const eventsLabel = formatBridgesEventsLabel(events);
  return (
    `Сравните ${eventsLabel} ночных прогулок к разводным мостам СПб на одном сайте! ` +
    `Цены от ${price} руб., актуальное расписание на ${scheduleDate}. ` +
    'Покупка билетов онлайн за 2 минуты.'
  );
}
