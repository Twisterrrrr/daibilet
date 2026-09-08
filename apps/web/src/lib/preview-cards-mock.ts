import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';

/** Catalog card fixture for `/preview-cards` UX smoke (not live catalog). */
export type PreviewCardMock = PublicCatalogListItemDto & {
  isFeatured: boolean;
};

type PreviewSeed = {
  title: string;
  city: string;
  citySlug: string;
  venue: string;
  category: string;
  priceFrom: number;
  priceTo?: number;
  ageLimit?: string;
  description?: string;
  imageSlug: string;
};

const SEEDS: PreviewSeed[] = [
  {
    title: 'Обзорная пешком: Пермь от набережной до театра',
    city: 'Пермь',
    citySlug: 'perm',
    venue: 'Набережная Камы',
    category: 'Экскурсии',
    priceFrom: 890,
    priceTo: 1490,
    ageLimit: '0+',
    description: '2 часа · 1.5–2 км',
    imageSlug: 'perm',
  },
  {
    title: 'Ночной теплоход: огни Москвы-реки',
    city: 'Москва',
    citySlug: 'moscow',
    venue: 'Причал Китай-город',
    category: 'Речные прогулки',
    priceFrom: 1200,
    priceTo: 2800,
    ageLimit: '0+',
    description: '1.5 часа',
    imageSlug: 'moscow',
  },
  {
    title: 'Эрмитаж без очереди: утренний вход',
    city: 'Санкт-Петербург',
    citySlug: 'saint-petersburg',
    venue: 'Зимний дворец',
    category: 'Музеи',
    priceFrom: 1500,
    ageLimit: '6+',
    description: '3 часа',
    imageSlug: 'saint-petersburg',
  },
  {
    title: 'Красная линия: стрит-арт Екатеринбурга',
    city: 'Екатеринбург',
    citySlug: 'ekaterinburg',
    venue: 'Плотинка',
    category: 'Экскурсии',
    priceFrom: 750,
    priceTo: 1100,
    ageLimit: '12+',
    description: '2 часа',
    imageSlug: 'ekaterinburg',
  },
  {
    title: 'Нижегородский Кремль и Чкаловская лестница',
    city: 'Нижний Новгород',
    citySlug: 'nizhny-novgorod',
    venue: 'Нижегородский кремль',
    category: 'Экскурсии',
    priceFrom: 990,
    ageLimit: '0+',
    description: '2.5 часа',
    imageSlug: 'nizhny-novgorod',
  },
  {
    title: 'Вечерний джаз на крыше',
    city: 'Уфа',
    citySlug: 'ufa',
    venue: 'Конгресс-холл',
    category: 'Концерты',
    priceFrom: 1800,
    priceTo: 3500,
    ageLimit: '16+',
    description: '2 часа',
    imageSlug: 'ufa',
  },
  {
    title: 'Казань: Старо-Татарская слобода',
    city: 'Казань',
    citySlug: 'kazan',
    venue: 'ул. Каюма Насыри',
    category: 'Экскурсии',
    priceFrom: 1100,
    ageLimit: '0+',
    description: '2 часа',
    imageSlug: 'kazan',
  },
  {
    title: 'Сочи: парк Ривьера и набережная',
    city: 'Сочи',
    citySlug: 'sochi',
    venue: 'Парк Ривьера',
    category: 'Экскурсии',
    priceFrom: 650,
    priceTo: 950,
    ageLimit: '0+',
    description: '1.5 часа',
    imageSlug: 'sochi',
  },
  {
    title: 'Калининград: остров Канта и рыбная деревня',
    city: 'Калининград',
    citySlug: 'kaliningrad',
    venue: 'Остров Канта',
    category: 'Экскурсии',
    priceFrom: 1300,
    ageLimit: '6+',
    description: '3 часа',
    imageSlug: 'kaliningrad',
  },
  {
    title: 'Владивосток: Золотой мост на закате',
    city: 'Владивосток',
    citySlug: 'vladivostok',
    venue: 'Цесаревича набережная',
    category: 'Экскурсии',
    priceFrom: 1400,
    priceTo: 2100,
    ageLimit: '0+',
    description: '2 часа',
    imageSlug: 'vladivostok',
  },
];

const BASE_STARTS = Date.parse('2026-09-12T18:00:00+03:00');

/**
 * 10 mock excursions for UX Catalog 2.0 grid smoke.
 * Every 4th card (4, 8, …) has `isFeatured: true` for bento/badge «Выбор редакции».
 */
export function buildPreviewCardsMock(): PreviewCardMock[] {
  return SEEDS.map((seed, index) => {
    const n = index + 1;
    const isFeatured = n % 4 === 0;
    const startsAt = new Date(BASE_STARTS + index * 86_400_000).toISOString();
    const hour = 10 + (index % 8);
    const timeLabel = `${String(hour).padStart(2, '0')}:00`;

    return {
      id: `preview-card-${n}`,
      slug: `preview-card-${n}`,
      title: seed.title,
      city: seed.city,
      citySlug: seed.citySlug,
      destination: seed.city,
      destinationType: 'city',
      venue: seed.venue,
      venueAddress: seed.venue,
      venueKind: 'attraction',
      category: seed.category,
      tags: [],
      startsAt,
      dateLabel: `12 сен · ${timeLabel}`,
      timeLabel,
      timeBucket: 'evening',
      priceFrom: seed.priceFrom,
      priceTo: seed.priceTo ?? seed.priceFrom,
      ageLimit: seed.ageLimit ?? null,
      description: seed.description ?? null,
      imageUrl: `/images/cities/top/${seed.imageSlug}.jpg`,
      purchaseReady: false,
      isFeatured,
    };
  });
}

export const PREVIEW_CARDS_MOCK = buildPreviewCardsMock();
