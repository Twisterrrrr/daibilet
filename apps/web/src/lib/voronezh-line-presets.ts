/** Voronezh painted walking lines (owner 2026-08-17). Hyphen-only copy. */
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

/** Зеленая линия: купеческий и губернский Воронеж, 7 точек. */
export const VORONEZH_GREEN_LINE_STOPS: any[] = [
  stop(
    'Дом губернатора',
    'Бывший административный центр губернии, парадный особняк конца XVIII века.',
    51.671801,
    39.211831,
    {
      locationSlug: 'voronezh-dom-gubernatora',
      address: 'проспект Революции, 22',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Дом Казенной палаты',
    'Строгий классический ансамбль в минуте ходьбы от дома губернатора.',
    51.670412,
    39.211104,
    {
      locationSlug: 'voronezh-dom-kazennoy-palaty',
      address: 'проспект Революции, 21',
      mustSeeFilter: 'houses',
      visitMinutes: 10,
    },
  ),
  stop(
    'Здание Управления ЮВЖД',
    'Перекресток истории: довоенный советский классицизм на месте присутственных мест.',
    51.672322,
    39.213233,
    {
      locationSlug: 'voronezh-zdanie-upravleniya-yuvzhd',
      address: 'проспект Революции, 18',
      mustSeeFilter: 'houses',
      visitMinutes: 10,
    },
  ),
  stop(
    'Мещанская полицейская часть',
    'Историческое здание с каланчой на перпендикулярной улице Карла Маркса.',
    51.668541,
    39.20911,
    {
      locationSlug: 'voronezh-meshchanskaya-politseyskaya-chast',
      address: 'ул. Карла Маркса, 32',
      mustSeeFilter: 'houses',
      visitMinutes: 10,
    },
  ),
  stop(
    'Гостиница «Бристоль»',
    'Главный купеческий отель города, шедевр роскошного модерна начала XX века.',
    51.667822,
    39.207914,
    {
      locationSlug: 'voronezh-gostinitsa-bristol',
      address: 'проспект Революции, 43',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Каменный мост',
    'Старинный виадук XIX века над крутым спуском к реке.',
    51.665798,
    39.202354,
    {
      locationSlug: 'voronezh-kamennyy-most',
      address: 'пересечение ул. Карла Маркса и ул. Чернышевского',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Ильинский храм',
    'Барочная церковь на вершине холма - финальная видовая точка купеческого трека.',
    51.65691,
    39.206902,
    {
      locationSlug: 'voronezh-ilinskiy-hram',
      address: 'ул. Севастьяновский Съезд, 26',
      mustSeeFilter: 'temple',
      visitMinutes: 25,
    },
  ),
];

/** Красная линия: неформальный, креативный и гастрономический город, 7 точек. */
export const VORONEZH_RED_LINE_STOPS: any[] = [
  stop(
    'Парк «Орлёнок» и памятник Мандельштаму',
    'Обновленный футуристичный арт-парк и авангардный памятник поэту.',
    51.674315,
    39.207883,
    {
      locationSlug: 'voronezh-pamyatnik-mandelshtamu',
      address: 'ул. Чайковского, 8',
      mustSeeFilter: 'monument',
      visitMinutes: 30,
    },
  ),
  stop(
    'Кофейня «Промка»',
    'Индустриальный хипстерский спот во дворах проспекта для погружения в локальную тусовку.',
    51.668541,
    39.208451,
    {
      locationSlug: 'voronezh-kofeynya-promka',
      address: 'проспект Революции, 39',
      mustSeeFilter: 'gastro',
      visitMinutes: 20,
    },
  ),
  stop(
    'Театр кукол «Шут» и Белый Бим',
    'Площадь со сказочными часами и самой известной контактной скульптурой города.',
    51.666111,
    39.205556,
    {
      locationSlug: 'voronezh-pamyatnik-belomu-bimu',
      address: 'проспект Революции, 50',
      mustSeeFilter: 'monument',
      visitMinutes: 20,
    },
  ),
  stop(
    'Памятник В. Высоцкому',
    'Неформальный музыкальный сквер на пешеходной аллее улицы Карла Маркса.',
    51.663189,
    39.201479,
    {
      locationSlug: 'voronezh-pamyatnik-vysotskomu',
      address: 'ул. Карла Маркса, 59',
      mustSeeFilter: 'monument',
      visitMinutes: 10,
    },
  ),
  stop(
    'Воронежский Камерный театр',
    'Ультрасовременное здание главного независимого театрального символа Черноземья.',
    51.664431,
    39.203812,
    {
      venueSlug: 'voronezh-kamernyy-teatr',
      address: 'ул. Карла Маркса, 55А',
      mustSeeFilter: 'creative',
      visitMinutes: 15,
    },
  ),
  stop(
    'Памятник лечебному стулу',
    'Ироничный городской арт-объект в Платоновском сквере за администрацией.',
    51.664811,
    39.203023,
    {
      locationSlug: 'voronezh-pamyatnik-lechebnomu-stulu',
      address: 'сквер за Домом правительства (Платоновский сквер)',
      mustSeeFilter: 'monument',
      visitMinutes: 10,
    },
  ),
  stop(
    'Бар «Хлам»',
    'Легендарное неформальное сердце ночного Воронежа с рок-концертами и локальными настойками.',
    51.66421,
    39.200311,
    {
      locationSlug: 'voronezh-bar-hlam',
      address: 'ул. Плехановская, 16',
      mustSeeFilter: 'gastro',
      visitMinutes: 40,
    },
  ),
];

export const VORONEZH_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'voronezh-green-line',
    title: 'Зеленая линия',
    description:
      'Купеческий и губернский Воронеж: особняки XVIII-XIX веков, шпиль ЮВЖД, «Бристоль» и спуск к Ильинскому храму. Весь трек компактно уложен в исторический центр.',
    travelVector: '7 точек · пешком по центру',
    timingNote: 'Связный трек без разрывов: от дома губернатора к Ильинскому холму.',
    coverImageUrl: '/images/venues/voronezh/dom-gubernatora.jpg',
    stops: VORONEZH_GREEN_LINE_STOPS,
  },
  {
    id: 'voronezh-red-line',
    title: 'Красная линия',
    description:
      'Неформальный Воронеж вокруг проспекта Революции и Карла Маркса: «Орлёнок», «Промка», Бим, Высоцкий, Камерный, лечебный стул и «Хлам». Вечером рядом - «Культурно Коротко», «Архив», «Цензура» и «Зюзя».',
    travelVector: '7 точек · пешком по дворам',
    timingNote: 'От «Орлёнка» к бару «Хлам» без логистических разрывов.',
    gastroStop: {
      name: 'Секретные бары Красной линии',
      blurb:
        '«Культурно Коротко» у «Шута», спикизи «Архив» между Высоцким и Камерным, крафт «Цензура» у «Хлама» и рюмочная «Зюзя» у лечебного стула.',
    },
    coverImageUrl: '/images/venues/voronezh/pamyatnik-mandelshtamu.jpg',
    stops: VORONEZH_RED_LINE_STOPS,
  },
];
