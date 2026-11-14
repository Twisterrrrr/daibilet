/** Tyumen painted walking lines (owner 2026-08-17). Hyphen-only copy. */
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

/** Зеленая линия: сибирское барокко и купеческие палаты, 6 точек. */
export const TYUMEN_GREEN_LINE_STOPS: any[] = [
  stop(
    'Троицкий монастырь',
    'Сибирское барокко на высоком берегу Туры: белокаменный ансамбль, с которого удобно начинать купеческий трек.',
    57.1697,
    65.5278,
    {
      locationSlug: 'tyumen-troitskiy-monastyr',
      address: 'ул. Коммунистическая, 10',
      mustSeeFilter: 'temple',
      visitMinutes: 40,
    },
  ),
  stop(
    'Городская дума',
    'Историческое здание думы на площади у Ленина: короткий переход от монастыря к купеческому центру.',
    57.1615,
    65.524,
    {
      venueSlug: 'tyumen-gorodskaya-duma',
      address: 'ул. Ленина, 2',
      mustSeeFilter: 'museum',
      visitMinutes: 40,
    },
  ),
  stop(
    'Дворянское собрание',
    'Парадный особняк на Республике: губернский классицизм рядом с купеческими палатами.',
    57.1575,
    65.5335,
    {
      locationSlug: 'tyumen-dvoryanskoe-sobranie',
      address: 'ул. Республики, 16',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Усадьба Колокольниковых',
    'Купеческие палаты с лавкой и детским музеем сказки во флигеле.',
    57.1578,
    65.5345,
    {
      locationSlug: 'tyumen-usadba-kolokolnikovyh',
      address: 'ул. Республики, 18',
      mustSeeFilter: 'houses',
      visitMinutes: 45,
    },
  ),
  stop(
    'Знаменский собор',
    'Ярусное сибирское барокко на Семакова - визуальный якорь исторического центра.',
    57.1575,
    65.541,
    {
      locationSlug: 'tyumen-znamenskiy-kafedral-nyy-sobor',
      address: 'ул. Семакова, 13',
      mustSeeFilter: 'temple',
      visitMinutes: 25,
    },
  ),
  stop(
    'Спасская церковь',
    'Камерный храм на Ленина: финал зеленой линии перед выходом на Арбат.',
    57.155,
    65.5385,
    {
      locationSlug: 'tyumen-spasskaya-tserkov',
      address: 'ул. Ленина, 43',
      mustSeeFilter: 'temple',
      visitMinutes: 20,
    },
  ),
];

/** Красная линия: Арбат, креатив и четыре яруса Туры, 6 точек. */
export const TYUMEN_RED_LINE_STOPS: any[] = [
  stop(
    'Дом Буркова',
    'Деревянный особняк на Дзержинского: старт Арбата и точка у памятника дворнику.',
    57.156112,
    65.536912,
    {
      locationSlug: 'tyumen-dom-burkova',
      address: 'ул. Дзержинского, 30',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Чайная «Наличники»',
    'Чай и сибирские сладости в деревянном доме на Дзержинского, 34С.',
    57.1559,
    65.5364,
    {
      locationSlug: 'tyumen-chaynaya-nalichniki',
      address: 'ул. Дзержинского, 34С',
      mustSeeFilter: 'gastro',
      visitMinutes: 30,
    },
  ),
  stop(
    'Мост Влюбленных',
    'Вантовый пешеходный мост через Туру: бесплатная панорама на четыре яруса набережной.',
    57.1538,
    65.534,
    {
      locationSlug: 'tyumen-most-vlyublennyh',
      address: 'Мост Влюбленных',
      mustSeeFilter: 'views',
      visitMinutes: 20,
    },
  ),
  stop(
    'Нижняя набережная и амфитеатр',
    'Нижний ярус гранитной набережной: амфитеатр у воды и бронзовые рельефы Сибири.',
    57.1555,
    65.53,
    {
      locationSlug: 'tyumen-amfiteatr-nizhney-naberezhnoy',
      address: 'Нижняя набережная Туры',
      mustSeeFilter: 'views',
      visitMinutes: 30,
    },
  ),
  stop(
    'Пароходная контора Колмакова',
    'Историческая контора и фудкорт у Туры: обед между ярусами и Словцовым.',
    57.1635,
    65.5375,
    {
      locationSlug: 'tyumen-parohodnaya-kontora-kolmakova',
      address: 'ул. 25 Октября, 23А',
      mustSeeFilter: 'houses',
      visitMinutes: 40,
    },
  ),
  stop(
    'Музей Словцова',
    'Хай-тек краеведческий комплекс на Советской: финал красной линии.',
    57.1536,
    65.5473,
    {
      venueSlug: 'tyumen-muzey-slovtsova',
      address: 'ул. Советская, 63',
      mustSeeFilter: 'museum',
      visitMinutes: 75,
    },
  ),
];

export const TYUMEN_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'tyumen-green-line',
    title: 'Зеленая линия',
    description:
      'Сибирское барокко и купеческие палаты: Троицкий монастырь, дума, дворянское собрание, Колокольниковы, Знаменский и Спасская.',
    travelVector: '6 точек · пешком по центру',
    timingNote: 'Связный трек: от монастыря на высоком берегу к Спасской на Ленина.',
    stops: TYUMEN_GREEN_LINE_STOPS,
  },
  {
    id: 'tyumen-red-line',
    title: 'Красная линия',
    description:
      'Тюменский Арбат, креатив и четыре яруса Туры: Бурков, «Наличники», Мост Влюбленных, нижняя набережная, пароходная контора и Словцов.',
    travelVector: '6 точек · пешком по Арбату и Туре',
    timingNote: 'От дома Буркова к Словцову без логистических разрывов.',
    gastroStop: {
      name: 'Чай и фудкорт на красной линии',
      blurb:
        'Чайная «Наличники» на Дзержинского, 34С и фудкорт пароходной конторы у Туры - паузы между Арбатом и ярусами.',
    },
    stops: TYUMEN_RED_LINE_STOPS,
  },
];
