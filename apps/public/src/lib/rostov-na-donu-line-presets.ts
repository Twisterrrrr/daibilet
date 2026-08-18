/** Rostov-on-Don painted walking lines (owner 2026-08-18). Hyphen-only copy. */
/* eslint-disable @typescript-eslint/no-explicit-any */

function stop(
  name: string,
  desc: string,
  latitude: number,
  longitude: number,
  opts: {
    locationSlug?: string;
    venueSlug?: string;
    dayRouteId?: string;
    address?: string;
    mustSeeFilter?: string;
    visitMinutes?: number | string;
    alsoMain?: boolean;
  } = {},
): any {
  return {
    name,
    desc,
    latitude,
    longitude,
    mustSeeFilter: opts.mustSeeFilter || 'main',
    visitMinutes: opts.visitMinutes ?? 20,
    ...(opts.locationSlug ? { locationSlug: opts.locationSlug } : {}),
    ...(opts.venueSlug ? { venueSlug: opts.venueSlug } : {}),
    ...(opts.dayRouteId ? { dayRouteId: opts.dayRouteId } : {}),
    ...(opts.address ? { address: opts.address } : {}),
    ...(typeof opts.alsoMain === 'boolean' ? { alsoMain: opts.alsoMain } : {}),
  };
}

export const ROSTOV_GREEN_LINE_STOPS: any[] = [
  stop('Здание Городской думы', 'Помпезный купеческий дворец с кариатидами на главной улице.', 47.221912, 39.714112, {
    locationSlug: 'rostov-na-donu-zdanie-gorodskoy-dumy',
    address: 'ул. Большая Садовая, 47',
    mustSeeFilter: 'houses',
    visitMinutes: 20,
    alsoMain: true,
  }),
  stop('Торговый дом Яблоковых', 'Ростовский модерн с тонкой пластикой фасада и маскаронами.', 47.220912, 39.709891, {
    locationSlug: 'rostov-na-donu-torgovyy-dom-yablokovyh',
    address: 'ул. Большая Садовая, 38',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  stop('Пассаж Генч-Оглуева', 'Первый многоэтажный доходный дом города у пересечения с Семашко.', 47.222912, 39.716112, {
    locationSlug: 'rostov-na-donu-passazh-gench-oglueva',
    address: 'ул. Большая Садовая, 68',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  stop('Особняк Сариева', 'Гранитный фасад и поздний модерн с почти индустриальным характером.', 47.224112, 39.722312, {
    locationSlug: 'rostov-na-donu-osobnyak-sarieva',
    address: 'ул. Большая Садовая, 94',
    mustSeeFilter: 'mansions',
    visitMinutes: 15,
    alsoMain: true,
  }),
  stop('Особняк Парамонова', 'Неоклассический дворец на Пушкинской, сегодня дом ЮФУ.', 47.227812, 39.728912, {
    locationSlug: 'rostov-na-donu-osobnyak-paramonova',
    address: 'ул. Пушкинская, 148',
    mustSeeFilter: 'mansions',
    visitMinutes: 20,
    alsoMain: true,
  }),
  stop('Смотровая на Седова', 'Панорама порта, Ворошиловского моста и Дона с высокого холма.', 47.219612, 39.728912, {
    locationSlug: 'rostov-na-donu-smotrovaya-na-sedova',
    address: 'ул. Седова / ул. Нижнебульварная',
    mustSeeFilter: 'views',
    visitMinutes: 30,
    alsoMain: true,
  }),
];

export const ROSTOV_RED_LINE_STOPS: any[] = [
  stop('Центральный рынок', 'Южный гастро-театр с раками, рыбой и овощами на Старом базаре.', 47.217912, 39.710912, {
    locationSlug: 'rostov-na-donu-tsentralnyy-rynok-staryy-bazar',
    address: 'Буденновский проспект, 12',
    mustSeeFilter: 'gastro',
    visitMinutes: 60,
    alsoMain: true,
  }),
  stop('Доходный дом Кисина', 'Купеческая визитка старого центра у Московской улицы.', 47.218112, 39.710891, {
    locationSlug: 'rostov-na-donu-dohodnyy-dom-kisina',
    address: 'ул. Московская, 37',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  stop('Дом Врангеля', 'Тихий исторический особняк в глубине Газетного переулка.', 47.218912, 39.714902, {
    locationSlug: 'rostov-na-donu-dom-vrangelya',
    address: 'пер. Газетный, 8',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  stop('Рюмочная «Хрусталь»', 'Ретро-спот во дворах центра с настойками и бутербродами.', 47.221912, 39.714512, {
    locationSlug: 'rostov-na-donu-ryumochnaya-hrustal',
    address: 'пер. Газетный, 52',
    mustSeeFilter: 'gastro',
    visitMinutes: 40,
  }),
  stop('Бар «Голодранец»', 'Культовый крафтовый бар без лишнего пафоса и со стойкой вместо стульев.', 47.220412, 39.715811, {
    locationSlug: 'rostov-na-donu-bar-golodranets',
    address: 'ул. Шаумяна, 67',
    mustSeeFilter: 'gastro',
    visitMinutes: 50,
  }),
  stop('Театр драмы им. Горького', 'Финал у главного тракторного шедевра конструктивизма.', 47.223412, 39.744112, {
    venueSlug: 'rostov-na-donu-teatr-dramy-im-gorkogo',
    address: 'Театральная площадь, 1',
    mustSeeFilter: 'creative',
    visitMinutes: 45,
    alsoMain: true,
  }),
];

export const ROSTOV_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'rostov-green-line',
    title: 'Зеленая линия',
    description:
      'Купеческий Ростов, Пушкинская и панорама Дона: парадные фасады, модерн и финал на холме Седова.',
    travelVector: '6 точек · пешком по центру',
    timingNote: 'Связный трек от Большой Садовой к Пушкинской и панораме порта.',
    stops: ROSTOV_GREEN_LINE_STOPS,
  },
  {
    id: 'rostov-red-line',
    title: 'Красная линия',
    description:
      'Старый Базар, дворики Газетного и финал у театра-трактора: гастро и южный андеграунд без логистических разрывов.',
    travelVector: '6 точек · пешком по старому центру',
    timingNote: 'От рынка через дворики Шаумяна к Театральной площади.',
    gastroStop: {
      name: 'Рынок, настойки и крафт',
      blurb:
        'На линии удобно чередовать рынок, рюмочную и бар - это цельный вечерний маршрут, а не три разрозненные точки.',
    },
    stops: ROSTOV_RED_LINE_STOPS,
  },
];
