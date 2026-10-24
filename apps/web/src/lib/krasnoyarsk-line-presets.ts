/** Krasnoyarsk painted walking lines (owner 2026-08-15). Hyphen-only copy. */
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

/** Зелёная линия: купеческая Сибирь по пр. Мира и Ленина, ~4.2 км, 18 точек. */
export const KRASNOYARSK_GREEN_LINE_STOPS: any[] = [
  stop('Памятник Андрею Дубенскому', 'Основатель на Покровской горе.', 56.023342, 92.895611, {
    locationSlug: 'krasnoyarsk-pamyatnik-andreyu-dubenskomu',
    address: 'ул. Белинского',
    mustSeeFilter: 'monument',
  }),
  stop('Краевая филармония (БКЗ)', 'Модернистский комплекс на Стрелке.', 56.016712, 92.896712, {
    locationSlug: 'krasnoyarsk-filarmoniya-bkz',
    address: 'площадь Мира, 2б',
    mustSeeFilter: 'theatre',
    visitMinutes: 25,
  }),
  stop('Памятник Дубенскому на Стрелке', 'Воевода у слияния Качи и Енисея.', 56.016211, 92.894112, {
    locationSlug: 'krasnoyarsk-pamyatnik-dubenskomu-strelka',
    dayRouteId: 'krasnoyarsk-green-dubenskiy-strelka',
    mustSeeFilter: 'monument',
  }),
  stop('Благовещенский собор', 'Краснокирпичный духовный комплекс XIX века.', 56.016112, 92.891211, {
    locationSlug: 'krasnoyarsk-blagoveschenskiy-sobor',
    address: 'ул. 9 Января, 30',
    mustSeeFilter: 'temple',
  }),
  stop('Художественный музей им. Сурикова', 'Особняк Гадалова.', 56.013411, 92.884112, {
    locationSlug: 'krasnoyarsk-hudozhestvennyy-muzey-surikova',
    address: 'ул. Парижской Коммуны, 20',
    mustSeeFilter: 'museum',
    visitMinutes: 35,
  }),
  stop('Скульптура «Дядя Яша и стажёр»', 'Сантехник из люка - любимый жанр.', 56.015112, 92.884211, {
    locationSlug: 'krasnoyarsk-dyadya-yasha-i-stazher',
    address: 'ул. Парижской Коммуны, 41',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Покровский кафедральный собор', 'Сибирское барокко, старейшее каменное здание.', 56.014112, 92.871112, {
    locationSlug: 'krasnoyarsk-pokrovskiy-sobor',
    address: 'ул. Сурикова, 26',
    mustSeeFilter: 'temple',
  }),
  stop('Ресторан «0.75 Please»', 'Новая сибирская кухня в кирпичном подвале.', 56.012511, 92.867211, {
    locationSlug: 'krasnoyarsk-restoran-075-please',
    address: 'пр. Мира, 86',
    mustSeeFilter: 'gastro',
    visitMinutes: 40,
  }),
  stop('Памятник фотографу', 'Фотограф с аппаратом-гармошкой на Мира.', 56.012612, 92.868112, {
    locationSlug: 'krasnoyarsk-pamyatnik-fotografu',
    address: 'пр. Мира, 96',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Белая ротонда', 'Пушкин и Гончарова в сквере.', 56.012341, 92.863911, {
    locationSlug: 'krasnoyarsk-belaya-rotonda',
    address: 'пр. Мира / ул. Кирова',
    mustSeeFilter: 'monument',
  }),
  stop('Драмтеатр им. Пушкина', 'Историческое здание с колоннадой.', 56.012511, 92.862112, {
    locationSlug: 'krasnoyarsk-dramteatr-pushkina',
    address: 'пр. Мира, 73',
    mustSeeFilter: 'theatre',
  }),
  stop('Дом офицеров', 'Бывшее Общественное собрание.', 56.011811, 92.865112, {
    locationSlug: 'krasnoyarsk-dom-ofitserov',
    address: 'ул. Перенсона, 20',
    mustSeeFilter: 'houses',
  }),
  stop('Музей-усадьба В. И. Сурикова', 'Казачья усадьба, где родился художник.', 56.012811, 92.866111, {
    venueSlug: 'krasnoyarsk-muzey-usad-ba-v-i-surikova',
    address: 'ул. Ленина, 98',
    mustSeeFilter: 'museum',
    visitMinutes: 40,
  }),
  stop('Электротехзавод (Гостиный двор)', 'Классицизм XIX века.', 56.010511, 92.868112, {
    locationSlug: 'krasnoyarsk-elektrotehzavod-gostinyy-dvor',
    address: 'ул. Карла Маркса, 96',
    mustSeeFilter: 'houses',
  }),
  stop('Памятник архиепископу Луке', 'Святитель и хирург эвакогоспиталя.', 56.011842, 92.850511, {
    locationSlug: 'krasnoyarsk-pamyatnik-arkhiepiskopu-luke',
    address: 'ул. Горького / пр. Мира',
    mustSeeFilter: 'monument',
  }),
  stop('Органный зал (костёл)', 'Неоготика из красного кирпича.', 56.010213, 92.848411, {
    locationSlug: 'krasnoyarsk-organnyy-zal-kostel',
    address: 'ул. Декабристов, 20',
    mustSeeFilter: 'temple',
  }),
  stop('Музыкальный театр', 'Советский модернизм на пр. Мира.', 56.011122, 92.839711, {
    locationSlug: 'krasnoyarsk-muzykalnyy-teatr',
    address: 'пр. Мира, 129',
    mustSeeFilter: 'theatre',
  }),
  stop('Вокзал Красноярск-Пассажирский', 'Финал у шпиля со львом.', 56.011511, 92.829112, {
    locationSlug: 'krasnoyarsk-vokzal-passazhirskiy',
    address: 'ул. 30 Июля, 1',
    mustSeeFilter: 'houses',
  }),
];

/** Красная линия: Енисей, мосты и современный арт, ~5.1 км, 11 точек. */
export const KRASNOYARSK_RED_LINE_STOPS: any[] = [
  stop('Остров Татышев (западный вход)', 'Старт у Виноградовского моста.', 56.016512, 92.901112, {
    locationSlug: 'krasnoyarsk-ostrov-tatyshev',
    mustSeeFilter: 'park',
    visitMinutes: 30,
  }),
  stop('Виноградовский (Вантовый) мост', 'Пешеходный мост на Татышев.', 56.015912, 92.898211, {
    locationSlug: 'krasnoyarsk-peshehodnyy-most-na-ostrov-tatyshev',
    mustSeeFilter: 'views',
  }),
  stop('Музейный центр «Площадь Мира»', 'Современное искусство в брутализме.', 56.015811, 92.893812, {
    locationSlug: 'krasnoyarsk-ploschad-mira-kic',
    address: 'площадь Мира, 1',
    mustSeeFilter: 'museum',
    visitMinutes: 40,
  }),
  stop('Пароход-музей «Святитель Николай»', 'Историческое судно на набережной.', 56.015111, 92.895812, {
    venueSlug: 'krasnoyarsk-parohod-muzey-svyatitel-nikolay',
    address: 'площадь Мира, 1а',
    mustSeeFilter: 'museum',
  }),
  stop('Памятник Виктору Астафьеву', 'Писатель у спуска к реке.', 56.016912, 92.894411, {
    locationSlug: 'krasnoyarsk-pamyatnik-astafievu',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Центральная левобережная набережная', 'Каскадный променад по Дубровинского.', 56.007811, 92.865611, {
    locationSlug: 'krasnoyarsk-tsentral-naya-naberezhnaya-eniseya',
    address: 'ул. Дубровинского',
    mustSeeFilter: 'views',
    visitMinutes: 35,
  }),
  stop('Скульптура «Река Енисей»', 'Фонтан на Театральной площади.', 56.009112, 92.869411, {
    locationSlug: 'krasnoyarsk-skulptura-reka-enisey',
    address: 'ул. Дубровинского',
    mustSeeFilter: 'monument',
  }),
  stop('Коммунальный мост', 'Мост с десятирублевой купюры.', 56.005412, 92.871211, {
    locationSlug: 'krasnoyarsk-kommunalnyy-most',
    mustSeeFilter: 'views',
  }),
  stop('Краеведческий музей', 'Египетский дом на набережной.', 56.008342, 92.867611, {
    locationSlug: 'krasnoyarsk-kraevedcheskiy-muzey',
    address: 'ул. Дубровинского, 84',
    mustSeeFilter: 'museum',
    visitMinutes: 40,
  }),
  stop('Памятник Антону Чехову', 'На Ярыгинской набережной.', 56.009412, 92.879112, {
    locationSlug: 'krasnoyarsk-pamyatnik-chekhovu',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Центральный парк им. Горького', 'Детская железная дорога и старый парк.', 56.009112, 92.853311, {
    locationSlug: 'krasnoyarsk-tsentralnyy-park-gorkogo',
    address: 'ул. Карла Маркса, 151',
    mustSeeFilter: 'park',
    visitMinutes: 40,
  }),
];

export const KRASNOYARSK_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'krasnoyarsk-green-line',
    title: 'Зелёная линия',
    description:
      'Купеческая и историческая Сибирь: ~4,2 км по пр. Мира и Ленина - каменное и деревянное зодчество.',
    travelVector: '~4,2 км · 18 точек',
    timingNote: 'Полдня пешком по историческому центру; линия нанесена краской на тротуары.',
    coverImageUrl: '/images/venues/krasnoyarsk/pamyatnik-andreyu-dubenskomu.jpg',
    stops: KRASNOYARSK_GREEN_LINE_STOPS,
  },
  {
    id: 'krasnoyarsk-red-line',
    title: 'Красная линия',
    description:
      'Природный променад у Енисея: ~5,1 км по мостам, набережным и современному арту.',
    travelVector: '~5,1 км · 11 точек',
    timingNote: 'День у воды: Татышев, Стрелка, Коммунальный мост и парк Горького.',
    coverImageUrl: '/images/venues/krasnoyarsk/ostrov-tatyshev.jpg',
    stops: KRASNOYARSK_RED_LINE_STOPS,
  },
];
