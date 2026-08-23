/** Ryazan painted walking lines (owner 2026-08-17). Hyphen-only copy. */
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

/** Зеленая линия: древний Кремль и купеческое кружево, 6 точек. */
export const RYAZAN_GREEN_LINE_STOPS: any[] = [
  stop(
    'Успенский собор Кремля',
    'Стартовая точка. Грандиозный барочный храм, главный визуальный маркер древнего города.',
    54.636667,
    39.749167,
    {
      locationSlug: 'ryazan-uspenskiy-sobor',
      address: 'ул. Кремль, 14',
      mustSeeFilter: 'temple',
      visitMinutes: 25,
    },
  ),
  stop(
    'Дворец Олега',
    'Крупнейший гражданский корпус Кремля XVII века с белокаменной резьбой окон, в минуте ходьбы от собора.',
    54.636112,
    39.749102,
    {
      locationSlug: 'ryazan-dvorets-olega',
      address: 'ул. Кремль, 15',
      mustSeeFilter: 'houses',
      visitMinutes: 30,
    },
  ),
  stop(
    'Смотровая площадка на Кремлевском валу',
    'Исторический земляной оборонительный вал с панорамным обзором заокских далей.',
    54.634901,
    39.747112,
    {
      locationSlug: 'ryazan-smotrovaya-kremlevskiy-val',
      address: 'ул. Кремлевский Вал',
      mustSeeFilter: 'views',
      visitMinutes: 20,
    },
  ),
  stop(
    'Музей истории рязанского леденца',
    'Сладкий интерактивный музей у подножия Соборного парка.',
    54.633112,
    39.744112,
    {
      venueSlug: 'ryazan-muzey-istorii-ryazanskogo-ledentsa',
      address: 'ул. Соборная, 14/2',
      mustSeeFilter: 'museum',
      visitMinutes: 40,
    },
  ),
  stop(
    'Дом Херасковых',
    'Старинный каменный особняк конца XVIII века на улице Свободы.',
    54.634112,
    39.751212,
    {
      locationSlug: 'ryazan-dom-heraskovyh',
      address: 'ул. Свободы, 7',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Дом Морозова',
    'Финал линии. Шедевр сохранившегося деревянного зодчества с кружевными наличниками.',
    54.629112,
    39.754891,
    {
      locationSlug: 'ryazan-dom-morozova',
      address: 'ул. Салтыкова-Щедрина, 19',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
];

/** Красная линия: театральный, гастрономический и креативный город, 7 точек. */
export const RYAZAN_RED_LINE_STOPS: any[] = [
  stop(
    'Музей истории Воздушно-десантных войск',
    'Стартовая точка. Уникальный военный музей на Семинарской улице.',
    54.631212,
    39.733901,
    {
      venueSlug: 'ryazan-muzey-istorii-vdv',
      address: 'ул. Семинарская, 20',
      mustSeeFilter: 'museum',
      visitMinutes: 50,
    },
  ),
  stop(
    'Рязанский ТЮЗ («Театр на Соборной»)',
    'Историческое здание старейшего детского театра на площади.',
    54.632912,
    39.742112,
    {
      venueSlug: 'ryazan-tyuz-teatr-na-sobornoy',
      address: 'Соборная площадь, 16',
      mustSeeFilter: 'creative',
      visitMinutes: 15,
    },
  ),
  stop(
    'Пешеходная улица Почтовая',
    'Рязанский Арбат, эпицентр уличных музыкантов, кафе и баров.',
    54.628901,
    39.741112,
    {
      locationSlug: 'ryazan-ulitsa-pochtovaya',
      address: 'ул. Почтовая, 53',
      mustSeeFilter: 'street',
      visitMinutes: 25,
    },
  ),
  stop(
    'Бар «Червячок»',
    'Скрытый неформальный сидрери-спот в кирпичных дворах-колодцах Почтовой.',
    54.629102,
    39.741412,
    {
      locationSlug: 'ryazan-bar-chervyachok',
      address: 'ул. Почтовая, 57',
      mustSeeFilter: 'gastro',
      visitMinutes: 40,
    },
  ),
  stop(
    'Кофейня «Кофе Культ»',
    'Концептуальный кофейный спот у Гостиного двора.',
    54.626891,
    39.737112,
    {
      locationSlug: 'ryazan-kofeynya-kofe-kult',
      address: 'ул. Кольцова, 4',
      mustSeeFilter: 'gastro',
      visitMinutes: 25,
    },
  ),
  stop(
    'Лыбедский бульвар',
    'Современная благоустроенная прогулочная ландшафтная зона с сухими фонтанами.',
    54.628912,
    39.743112,
    {
      locationSlug: 'ryazan-lybedskiy-bulvar',
      address: 'ул. Лыбедский бульвар',
      mustSeeFilter: 'park',
      visitMinutes: 30,
    },
  ),
  stop(
    'Рязанский художественный музей им. Пожалостина',
    'Финал линии. Роскошный дворец Живаго со знаменитой коллекцией живописи.',
    54.626912,
    39.747901,
    {
      venueSlug: 'ryazan-hudozhestvennyy-muzey-pozhalostina',
      address: 'ул. Свободы, 57',
      mustSeeFilter: 'museum',
      visitMinutes: 60,
    },
  ),
];

export const RYAZAN_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'ryazan-green-line',
    title: 'Зеленая линия',
    description:
      'Древний Кремль и купеческое кружево: Успенский собор, Дворец Олега, вал, музей леденца, дом Херасковых и деревянный дом Морозова. Весь трек без разрывов по старейшей части города.',
    travelVector: '6 точек · пешком по центру',
    timingNote: 'Связный трек: от Успенского собора к улице Салтыкова-Щедрина.',
    coverImageUrl: '/images/venues/ryazan/ryazanskiy-kreml.jpg',
    stops: RYAZAN_GREEN_LINE_STOPS,
  },
  {
    id: 'ryazan-red-line',
    title: 'Красная линия',
    description:
      'Театральный и гастрономический город: музей ВДВ, Театр на Соборной, Почтовая, «Червячок», «Кофе Культ», Лыбедский бульвар и дворец Живаго.',
    travelVector: '7 точек · пешком по дворам',
    timingNote: 'От Семинарской к художественному музею без логистических разрывов.',
    gastroStop: {
      name: 'Почтовая и дворы',
      blurb:
        'Каравайцы и кофе на Почтовой, сидр во дворах «Червячка» и фильтр у Гостиного двора - удобные паузы Красной линии.',
    },
    coverImageUrl: '/images/venues/ryazan/tyuz-teatr-na-sobornoy.jpg',
    stops: RYAZAN_RED_LINE_STOPS,
  },
];
