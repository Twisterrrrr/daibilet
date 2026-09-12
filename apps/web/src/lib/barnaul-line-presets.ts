/** Barnaul painted walking lines (owner 2026-08-23). Hyphen-only copy. */
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
    visitMinutes?: number;
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
  };
}

/** Зеленая линия: купеческая / историческая, 6 точек. */
export const BARNAUL_GREEN_LINE_STOPS: any[] = [
  stop(
    'Здание Городской думы',
    'Старт купеческого променада у старой ратуши с часовой башней.',
    53.327112,
    83.79251,
    {
      locationSlug: 'barnaul-zdanie-gorodskoy-dumy',
      address: 'ул. Льва Толстого, 24',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Красный магазин купца Яковлева',
    'Каменный шедевр модерна через один квартал от Думы.',
    53.328902,
    83.790112,
    {
      locationSlug: 'barnaul-krasnyy-magazin-kuptsa-yakovleva',
      address: 'ул. Короленко, 50',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Магазин Трубицына',
    'Старинная купеческая лавка на улице Пушкина.',
    53.330514,
    83.789121,
    {
      locationSlug: 'barnaul-magazin-trubitsyna',
      address: 'ул. Пушкина, 48',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Дом Полякова и Яковлева',
    'Поворот на улицу Гоголя к узорчатому кирпичному особняку.',
    53.328312,
    83.78791,
    {
      locationSlug: 'barnaul-dom-polyakova-i-yakovleva',
      address: 'ул. Гоголя, 44',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Доходный дом Аверина',
    'Барнаульский столетний «небоскреб» чуть южнее по Гоголя.',
    53.324811,
    83.784402,
    {
      locationSlug: 'barnaul-dohodnyy-dom-averina',
      address: 'ул. Гоголя, 76',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Дом купцов Шадриных',
    'Финал линии у шедевра деревянного зодчества с кружевной резьбой.',
    53.327521,
    83.78521,
    {
      locationSlug: 'barnaul-dom-kuptsov-shadrinyh',
      address: 'Красноармейский пр., 8',
      mustSeeFilter: 'houses',
      visitMinutes: 25,
    },
  ),
];

/** Красная линия: неформальная / креативная, 6 точек. */
export const BARNAUL_RED_LINE_STOPS: any[] = [
  stop(
    'Арт-двор «Винсент»',
    'Креативный кластер со стрит-артом и граффити местных художников.',
    53.332112,
    83.793102,
    {
      locationSlug: 'barnaul-art-dvor-vinsent',
      address: 'центр',
      mustSeeFilter: 'creative',
      visitMinutes: 40,
    },
  ),
  stop(
    'Памятник Чарли Чаплину',
    'Старт неформального отрезка на проспекте Ленина.',
    53.329811,
    83.793751,
    {
      locationSlug: 'barnaul-pamyatnik-charli-chaplinu',
      address: 'пр. Ленина, 7',
      mustSeeFilter: 'monument',
      visitMinutes: 10,
    },
  ),
  stop(
    'Арт-пространство «Спичка»',
    'Территория бывшей спичечной фабрики - площадка для перформансов.',
    53.326102,
    83.785112,
    {
      locationSlug: 'barnaul-art-prostranstvo-spichka',
      address: 'ул. Ползунова, 37',
      mustSeeFilter: 'creative',
      visitMinutes: 35,
    },
  ),
  stop(
    'Скульптурная композиция «Снимается кино»',
    'Интерактивные железные скульптуры на выходе к пешеходному Арбату.',
    53.326211,
    83.79153,
    {
      locationSlug: 'barnaul-skulptura-snimaetsya-kino',
      address: 'ул. Мало-Тобольская, 28',
      mustSeeFilter: 'monument',
      visitMinutes: 15,
    },
  ),
  stop(
    'Арт-объект «Зонтик»',
    'Романтическая кованая инсталляция в середине променада.',
    53.327311,
    83.791102,
    {
      locationSlug: 'barnaul-art-obekt-zontik',
      address: 'ул. Мало-Тобольская, 20',
      mustSeeFilter: 'monument',
      visitMinutes: 10,
    },
  ),
  stop(
    'Скульптура «Медведь»',
    'Финал у брутального деревянного тотема на Мало-Тобольской.',
    53.325514,
    83.79211,
    {
      locationSlug: 'barnaul-skulptura-medved',
      address: 'ул. Мало-Тобольская, 30',
      mustSeeFilter: 'monument',
      visitMinutes: 10,
    },
  ),
];

export const BARNAUL_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'barnaul-green-line',
    title: 'Зеленая линия',
    description:
      'Купеческая и историческая линия: Дума, магазины Яковлева и Трубицына, особняки на Гоголя и дом Шадриных.',
    travelVector: '6 точек · пешком по старому центру',
    timingNote: 'Связный трек с севера на юг по купеческому кварталу без логистических разрывов.',
    coverImageUrl: '/images/venues/barnaul/dom-kuptsov-shadrinyh.jpg',
    stops: BARNAUL_GREEN_LINE_STOPS,
  },
  {
    id: 'barnaul-red-line',
    title: 'Красная линия',
    description:
      'Неформальный и арт-маршрут: «Винсент», Чаплин, «Спичка», «Снимается кино», «Зонтик» и деревянный Медведь.',
    travelVector: '6 точек · дворы и Арбат',
    timingNote: 'От арт-двора «Винсент» к Медведю на Мало-Тобольской через креативные площадки центра.',
    gastroStop: {
      name: '«Бивер» и посикунчики на Арбате',
      blurb:
        'Крафтовый ресторан «Бивер» на Ленина и алтайские посикунчики в павильонах Мало-Тобольской - удобные гастропаузы рядом с Красной линией.',
    },
    coverImageUrl: '/images/venues/barnaul/malo-tobol-skaya-ulitsa-barnaul-skiy-arbat.jpg',
    stops: BARNAUL_RED_LINE_STOPS,
  },
];
