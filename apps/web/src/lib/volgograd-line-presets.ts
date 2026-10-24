/** Volgograd painted walking lines (owner 2026-08-21). Hyphen-only copy. */
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

/** Зеленая линия: Царицын купеческий - Сталинград монументальный, 7 точек. */
export const VOLGOGRAD_GREEN_LINE_STOPS: any[] = [
  stop(
    'Железнодорожный вокзал Волгоград-1',
    'Парадные ворота города, эталон послевоенного сталинского ампира.',
    48.712915,
    44.511125,
    {
      locationSlug: 'volgograd-vokzal-volgograd-1',
      address: 'Привокзальная площадь, 1',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Пожарная каланча Царицына',
    'Уцелевшее дореволюционное здание пожарного депо из красного кирпича.',
    48.711345,
    44.513612,
    {
      locationSlug: 'volgograd-pozharnaya-kalancha',
      address: 'ул. Коммунистическая, 5',
      mustSeeFilter: 'houses',
      visitMinutes: 10,
    },
  ),
  stop(
    'Кафедральный собор Александра Невского',
    'Величественный новодел византийского стиля на площади Павших Борцов.',
    48.708621,
    44.5141,
    {
      locationSlug: 'volgograd-sobor-aleksandra-nevskogo',
      address: 'площадь Павших Борцов',
      mustSeeFilter: 'temple',
      visitMinutes: 20,
    },
  ),
  stop(
    'Новый экспериментальный театр (НЭТ)',
    'Исторический Дом науки Репникова с нарядной неоклассической колоннадой.',
    48.708464,
    44.512303,
    {
      locationSlug: 'volgograd-net-teatr',
      address: 'ул. Мира, 5',
      mustSeeFilter: 'creative',
      visitMinutes: 15,
    },
  ),
  stop(
    'Сталинградский тополь на Аллее Героев',
    'Дерево, пережившее битву и сохранившее в стволе осколки.',
    48.707312,
    44.515125,
    {
      locationSlug: 'volgograd-stalingradskiy-topol',
      address: 'Аллея Героев',
      mustSeeFilter: 'houses',
      visitMinutes: 10,
    },
  ),
  stop(
    'Центральная набережная им. 62-й Армии',
    'Парадная лестница-пропилеи и фонтан «Искусство» у кромки Волги.',
    48.704422,
    44.522343,
    {
      locationSlug: 'volgograd-tsentral-naya-naberezhnaya-imeni-62-y-armii',
      address: 'Набережная 62-й Армии',
      mustSeeFilter: 'main',
      visitMinutes: 30,
    },
  ),
  stop(
    'Храм Иоанна Предтечи',
    'Финал линии на месте первой церкви крепости Царицын у речного обрыва.',
    48.702148,
    44.516516,
    {
      locationSlug: 'volgograd-hram-ioanna-predtechi',
      address: 'ул. Краснопитерская, 1А',
      mustSeeFilter: 'temple',
      visitMinutes: 20,
    },
  ),
];

/** Красная линия: неформальный, креативный и индустриальный Волгоград, 7 точек. */
export const VOLGOGRAD_RED_LINE_STOPS: any[] = [
  stop(
    'Станция метротрама «Комсомольская»',
    'Подземный спот на стыке трамвая и сталинской эстетики метро.',
    48.70932,
    44.51785,
    {
      locationSlug: 'volgograd-volgogradskiy-metrotram',
      address: 'станция «Комсомольская»',
      mustSeeFilter: 'main',
      visitMinutes: 20,
    },
  ),
  stop(
    'Арт-пространство «Икра»',
    'Креативный кластер с галереями и кофейнями в здании речного вокзала.',
    48.70185,
    44.51934,
    {
      locationSlug: 'volgograd-art-prostranstvo-ikra',
      address: 'Набережная 62-й Армии, 6',
      mustSeeFilter: 'creative',
      visitMinutes: 30,
    },
  ),
  stop(
    'Стрит-арт стена в пойме Царицы',
    'Легальная галерея масштабных граффити под мостом.',
    48.70245,
    44.51221,
    {
      locationSlug: 'volgograd-street-art-tsaritsa',
      address: 'пойма реки Царицы',
      mustSeeFilter: 'creative',
      visitMinutes: 20,
    },
  ),
  stop(
    'Парк «Раздолье»',
    'Неформальная зона отдыха со скейт-площадками и поп-арт инсталляциями.',
    48.702045,
    44.511456,
    {
      locationSlug: 'volgograd-park-razdole',
      address: 'пойма реки Царицы',
      mustSeeFilter: 'park',
      visitMinutes: 30,
    },
  ),
  stop(
    'Мурал «Девочка с синей птицей»',
    'Крупное стрит-арт граффити на фасаде в Центральном районе.',
    48.70612,
    44.51381,
    {
      locationSlug: 'volgograd-mural-devochka-s-siney-ptitsey',
      address: 'Центральный район',
      mustSeeFilter: 'creative',
      visitMinutes: 10,
    },
  ),
  stop(
    'Променад улицы Маршала Чуйкова',
    'Точка встреч лонгбордистов, фотографов и уличных музыкантов у обрыва к Волге.',
    48.71123,
    44.52683,
    {
      locationSlug: 'volgograd-promenad-chuikova',
      address: 'ул. имени Маршала Чуйкова',
      mustSeeFilter: 'views',
      visitMinutes: 20,
    },
  ),
  stop(
    'Дом Павлова',
    'Финал линии у полуразрушенной стены-памятника в ткани жилого квартала.',
    48.71624,
    44.53112,
    {
      locationSlug: 'volgograd-dom-pavlova',
      address: 'ул. Советская, 39',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
];

export const VOLGOGRAD_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'volgograd-green-line',
    title: 'Зеленая линия',
    description:
      'Царицын купеческий и Сталинград монументальный: вокзал, каланча, собор Невского, НЭТ, тополь, набережная и храм Иоанна Предтечи. Компактный трек по центру.',
    travelVector: '7 точек · пешком по центру',
    timingNote: 'Связный трек от вокзала к обрыву у Волги без логистических разрывов.',
    coverImageUrl: '/images/venues/volgograd/tsentral-naya-naberezhnaya-imeni-62-y-armii.jpg',
    stops: VOLGOGRAD_GREEN_LINE_STOPS,
  },
  {
    id: 'volgograd-red-line',
    title: 'Красная линия',
    description:
      'Неформальный Волгоград: метротрам, «Икра», стрит-арт у Царицы, «Раздолье», мурал, променад Чуйкова и Дом Павлова. Вечером рядом - гастробары центра.',
    travelVector: '7 точек · пешком и метротрам',
    timingNote: 'От «Комсомольской» к Дому Павлова с короткими переходами.',
    coverImageUrl: '/images/venues/volgograd/volgogradskiy-metrotram.jpg',
    gastroStop: {
      name: 'Гастро у Красной линии',
      blurb:
        '«Angel Cakes» на Чуйкова, «Булгаков» у Ополовникова, «Швейн» на Краснознаменской и котлета по-волгоградски в городских кулинариях.',
    },
    stops: VOLGOGRAD_RED_LINE_STOPS,
  },
];
