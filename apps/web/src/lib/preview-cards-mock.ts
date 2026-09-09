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
  /** Duration tag for card meta (`extractDurationLabel`). */
  durationTag?: string;
  /** Marketing teaser for featured hero (1–2 sentences). */
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
    durationTag: '2 часа',
    description:
      'Спокойный маршрут от Камы к театральной площади: набережная, купеческие фасады и короткие остановки для фото. Гид держит темп под спокойный ритм без гонки по точкам.',
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
    durationTag: '2 часа',
    description:
      'Вечерний рейс под подсветкой набережных и Сити: палуба, ветер и вид на мосты без спешки. Удобный старт у Китай-города и короткий путь к посадке.',
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
    durationTag: '3 часа',
    description:
      'Ранний вход в залы до основного потока: меньше толпы у шедевров и понятный маршрут по ключевым залам. Подходит для первого знакомства с дворцом без выматывания.',
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
    durationTag: '2 часа',
    description:
      'Пешком по знаковым стенам центра: от Плотинки к дворам с крупными росписями и удобными ракурсами для спокойной съёмки. Гид расскажет про авторов, безопасные точки для фото и как читать городской стрит-арт без туристического шума - маршрут ощущается как прогулка, а не чек-лист точек.',
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
    durationTag: '3 часа',
    description:
      'Кремлёвские стены, смотровые и спуск к Чкаловской лестнице с видами на стрелку. Маршрут собран так, чтобы успеть главные кадры и не потеряться в подъемах.',
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
    durationTag: '2 часа',
    description:
      'Живой сет под открытым небом с видом на вечерний город. Формат для двоих или небольшой компании: приходите ближе к старту, чтобы выбрать удобные места.',
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
    durationTag: '2 часа',
    description:
      'Узкие улицы слободы, мечети и купеческие дома в одном спокойном кольце. Гид связывает историю квартала с понятными остановками для фото и короткого отдыха.',
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
    durationTag: '2 часа',
    description:
      'Зелёный парк Ривьера и выход на набережную без длинных переездов - маршрут собран кольцом, чтобы не терять время на логистику. Лёгкий темп для семьи: тень, короткие паузы и понятные ориентиры по пути, без гонки между точками.',
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
    durationTag: '3 часа',
    description:
      'Кафедральный собор, остров и прогулка к Рыбной деревне одним кольцом. Европейский силуэт города без суеты: короткие переходы, паузы у воды и места для спокойных кадров - удобный темп и для первого визита, и для повторного вечера в центре.',
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
    durationTag: '2 часа',
    description:
      'Набережная и ракурс на Золотой мост в золотой час: ветер, бухта и городские огни. Маршрут короткий, чтобы успеть свет и не торопиться на смотровых.',
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
      tags: seed.durationTag ? [seed.durationTag] : [],
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
