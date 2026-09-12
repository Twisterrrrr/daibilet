/** Omsk painted walking lines (owner 2026-08-17). Hyphen-only copy. */
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

/** Зеленая линия: Белая столица и сибирское барокко, 6 точек. */
export const OMSK_GREEN_LINE_STOPS: any[] = [
  stop(
    'Воскресенский военный собор',
    'Первый каменный храм крепости: сибирское барокко у Тобольских ворот.',
    54.98621,
    73.36241,
    {
      locationSlug: 'omsk-voskresenskiy-voennyy-sobor',
      address: 'ул. Партизанская, 16',
      mustSeeFilter: 'temple',
      visitMinutes: 25,
    },
  ),
  stop(
    'Казенная палата (казначейство)',
    'Строгий классицизм казенного двора на крепостной линии.',
    54.98531,
    73.36382,
    {
      locationSlug: 'omsk-kaznacheystvo',
      address: 'ул. Партизанская, 5С',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Тобольские ворота',
    'Западный портал Омской крепости: через них вели на каторгу.',
    54.98561,
    73.36311,
    {
      locationSlug: 'omsk-tobolskie-vorota',
      address: 'ул. Партизанская, 5/1',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Тарские ворота',
    'Северный портал XVIII века и визуальный символ старого Омска.',
    54.986912,
    73.366112,
    {
      locationSlug: 'omsk-tarskie-vorota',
      address: 'ул. Спартаковская',
      mustSeeFilter: 'main',
      visitMinutes: 15,
    },
  ),
  stop(
    'Успенский кафедральный собор',
    'Пятиглавый храм на Соборной площади - главная святыня Белой столицы.',
    54.98921,
    73.36951,
    {
      locationSlug: 'omsk-uspenskiy-kafedral-nyy-sobor',
      address: 'ул. Тарская, 7',
      mustSeeFilter: 'temple',
      visitMinutes: 25,
    },
  ),
  stop(
    'Особняк Батюшкина и памятник Колчаку',
    'Дом, где жил адмирал Колчак, и бронзовый портрет на Иртышской набережной.',
    54.976112,
    73.371112,
    {
      locationSlug: 'omsk-osobnyak-batyushkina',
      address: 'Иртышская набережная, 9',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
];

/** Красная линия: купеческий Любинский, панк-рок и Камергерский, 6 точек. */
export const OMSK_RED_LINE_STOPS: any[] = [
  stop(
    'Московские торговые ряды',
    'Купеческий пассаж на Любинском: витрины, арки и старт гастро-улицы.',
    54.984112,
    73.371901,
    {
      locationSlug: 'omsk-moskovskie-torgovye-ryady',
      address: 'ул. Ленина, 14',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Камергерский переулок',
    'Петербургский дворик в Сибири: кирпич начала XX века и ресторанная улица.',
    54.984312,
    73.371412,
    {
      locationSlug: 'omsk-kamergerskiy-pereulok',
      address: 'ул. Ленина, 14/1',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Гастродвор «Любинский»',
    'Фудхолл в купеческом квартале: сибирская дичь, настойки и сгущенка к чаю.',
    54.98422,
    73.37162,
    {
      locationSlug: 'omsk-gastrodvor-lyubinskiy',
      address: 'ул. Ленина, 14/1, корпус Б',
      mustSeeFilter: 'gastro',
      visitMinutes: 40,
    },
  ),
  stop(
    'Омский театр драмы',
    'Парадный фасад на Ленинской площади - купеческая сцена Белой столицы.',
    54.985112,
    73.373912,
    {
      venueSlug: 'omsk-teatr-dramy',
      address: 'ул. Ленина, 8А',
      mustSeeFilter: 'creative',
      visitMinutes: 15,
    },
  ),
  stop(
    'Эрмитаж-Сибирь',
    'Филиал Государственного Эрмитажа в здании на Музейной.',
    54.98951,
    73.36782,
    {
      venueSlug: 'omsk-ermitazh-sibir',
      address: 'ул. Музейная, 4',
      mustSeeFilter: 'museum',
      visitMinutes: 50,
    },
  ),
  stop(
    'Музей изобразительных искусств имени Врубеля',
    'Сибирская коллекция Врубеля и билеты в Эрмитаж-Сибирь через этот сайт.',
    54.98351,
    73.37421,
    {
      venueSlug: 'omsk-muzey-izobrazitelnyh-iskusstv-vrubelya',
      address: 'ул. Ленина, 3',
      mustSeeFilter: 'museum',
      visitMinutes: 60,
    },
  ),
];

export const OMSK_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'omsk-green-line',
    title: 'Зеленая линия',
    description:
      'Белая столица и сибирское барокко: Воскресенский собор, казначейство, Тобольские и Тарские ворота, Успенский собор и особняк Батюшкина у памятника Колчаку. Весь трек держится крепости и Иртыша.',
    travelVector: '6 точек · пешком по крепости',
    timingNote: 'Связный трек: от Воскресенского собора к набережной у дома Колчака.',
    stops: OMSK_GREEN_LINE_STOPS,
  },
  {
    id: 'omsk-red-line',
    title: 'Красная линия',
    description:
      'Купеческий Любинский, панк-рок и Камергерский: Московские ряды, Камергерский, Гастродвор, театр драмы, Эрмитаж-Сибирь и музей Врубеля. Вечером рядом - «Викинг», «Одно вино» и кофе Skuratov.',
    travelVector: '6 точек · пешком по Любинскому',
    timingNote: 'От Московских рядов к Врубелю без логистических разрывов.',
    gastroStop: {
      name: 'Гастродвор и Камергерский',
      blurb:
        'Обед в Гастродворе «Любинский», кофе в Skuratov на Лермонтова и вечер в «Викинге» или «Одно вино».',
    },
    stops: OMSK_RED_LINE_STOPS,
  },
];
