/** Novosibirsk painted walking lines (owner 2026-08-16). Hyphen-only copy. */
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

/** Зелёная линия: купеческий и исторический Ново-Николаевск, 5 точек. */
export const NOVOSIBIRSK_GREEN_LINE_STOPS: any[] = [
  stop(
    'Дом купца Истомина',
    'Стартовая точка - памятник деревянного зодчества.',
    55.023254,
    82.929851,
    {
      locationSlug: 'novosibirsk-dom-kupca-istomina',
      dayRouteId: 'novosibirsk-green-dom-istomina',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Дом купца Маштакова',
    'Монументальное кирпичное здание у главной площади.',
    55.025642,
    82.922123,
    {
      locationSlug: 'novosibirsk-dom-kupca-mashtakova',
      dayRouteId: 'novosibirsk-green-dom-mashtakova',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Краеведческий музей (Городской торговый корпус)',
    'Главное купеческое здание из красного кирпича.',
    55.030214,
    82.920364,
    {
      locationSlug: 'novosibirsk-gorodskoy-torgovyy-korpus',
      address: 'Красный проспект, 23',
      mustSeeFilter: 'museum',
      visitMinutes: 40,
    },
  ),
  stop(
    'Дом Крюкова',
    'Исторический особняк - один из первых кинотеатров и купеческий клуб.',
    55.031201,
    82.915234,
    {
      locationSlug: 'novosibirsk-osobnyak-kryukova',
      address: 'ул. Советская, 25',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Музей сибирской бересты (Дом мещанина Вагина)',
    'Деревянный модерн с резными наличниками - финал зелёной линии.',
    55.033412,
    82.912102,
    {
      locationSlug: 'novosibirsk-muzey-sibirskaya-beresta',
      address: 'ул. Свердлова, 21',
      mustSeeFilter: 'museum',
      visitMinutes: 35,
    },
  ),
];

/** Красная линия: неформальный и креативный Новосибирск, 5 точек (связный трек W→S→SE). */
export const NOVOSIBIRSK_RED_LINE_STOPS: any[] = [
  stop(
    'Креативное пространство «Арт-Ель»',
    'Локальная галерея - старт неформального маршрута.',
    55.03212,
    82.92645,
    {
      locationSlug: 'novosibirsk-art-el',
      dayRouteId: 'novosibirsk-red-art-el',
      mustSeeFilter: 'creative',
      visitMinutes: 25,
    },
  ),
  stop(
    'Дворик за гостиницей «Центральная»',
    'Эпицентр барной культуры и граффити под открытым небом.',
    55.03154,
    82.91986,
    {
      locationSlug: 'novosibirsk-dvorik-centralnaya',
      dayRouteId: 'novosibirsk-red-dvorik-tsentralnaya',
      mustSeeFilter: 'street',
      visitMinutes: 20,
    },
  ),
  stop(
    'Арка со стрит-артом во дворе на Красном',
    'Дворик с граффити местных художников.',
    55.028945,
    82.92182,
    {
      locationSlug: 'novosibirsk-arka-street-art',
      dayRouteId: 'novosibirsk-red-arka-street-art',
      mustSeeFilter: 'street',
      visitMinutes: 15,
    },
  ),
  stop(
    'Конструктивистский дворик у «Дома с часами»',
    'Советский авангард и геометрия двора.',
    55.02485,
    82.92421,
    {
      locationSlug: 'novosibirsk-dom-s-chasami',
      address: 'Красный проспект, 11',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Арт-кластер «Фабрика»',
    'Бывшее индустриальное здание - мастерские, кофейни и шоурумы.',
    55.02158,
    82.93214,
    {
      locationSlug: 'novosibirsk-art-klaster-fabrika',
      dayRouteId: 'novosibirsk-red-fabrika',
      mustSeeFilter: 'creative',
      visitMinutes: 40,
    },
  ),
];

export const NOVOSIBIRSK_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'novosibirsk-green-line',
    title: 'Зелёная линия',
    description:
      'Купеческий и исторический Ново-Николаевск: каменные особняки и деревянное зодчество начала XX века в Центральном и Железнодорожном районах.',
    travelVector: '5 точек · пешком по центру',
    timingNote: 'Связный трек без разрывов: от дома Истомина к музею бересты.',
    coverImageUrl: '/images/venues/novosibirsk/green-line-cover.jpg',
    stops: NOVOSIBIRSK_GREEN_LINE_STOPS,
  },
  {
    id: 'novosibirsk-red-line',
    title: 'Красная линия',
    description:
      'Неформальный и креативный Новосибирск: дворы, стрит-арт и локальные бренды у Октябрьской магистрали и Красного проспекта.',
    travelVector: '5 точек · пешком по дворам',
    timingNote: 'От «Арт-Ели» к арт-кластеру «Фабрика» без логистических разрывов.',
    coverImageUrl: '/images/venues/novosibirsk/red-line-cover.jpg',
    stops: NOVOSIBIRSK_RED_LINE_STOPS,
  },
];
