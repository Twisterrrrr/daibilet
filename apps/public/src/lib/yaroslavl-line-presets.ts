/** Yaroslavl painted walking lines (owner 2026-08-21). Hyphen-only copy. */
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

/** Зеленая линия: купеческое узорочье и парадный Ярославль, 7 точек. */
export const YAROSLAVL_GREEN_LINE_STOPS: any[] = [
  stop(
    'Знаменская (Власьевская) башня',
    'Каменный форпост XVII века, открывающий парадный въезд в старый Земляной город.',
    57.626712,
    39.883912,
    {
      locationSlug: 'yaroslavl-znamenskaya-bashnya',
      address: 'Первомайская ул., 2А',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Театр имени Федора Волкова',
    'Главная театральная площадь и триумфальное неоклассическое здание старейшей сцены России.',
    57.626464,
    39.884303,
    {
      venueSlug: 'yaroslavl-teatr-volkova',
      address: 'площадь Волкова, 1',
      mustSeeFilter: 'creative',
      visitMinutes: 20,
    },
  ),
  stop(
    'Ротонда Гостиного двора',
    'Образец торговой купеческой архитектуры начала XIX века на Комсомольской.',
    57.625345,
    39.885612,
    {
      locationSlug: 'yaroslavl-rotonda-gostinogo-dvora',
      address: 'ул. Комсомольская, 4',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Ярославский музей-заповедник (Спасский монастырь)',
    'Белокаменная цитадель, помнящая Ивана Грозного и «Слово о полку Игореве».',
    57.621214,
    39.888514,
    {
      locationSlug: 'yaroslavl-yaroslavskiy-kreml-spaso-preobrazhenskiy-monastyr',
      address: 'Богоявленская площадь, 25',
      mustSeeFilter: 'main',
      visitMinutes: 45,
    },
  ),
  stop(
    'Церковь Ильи Пророка',
    'Сердце радиального плана города на Советской площади, шедевр узорочья.',
    57.626221,
    39.8941,
    {
      locationSlug: 'yaroslavl-tserkov-il-i-proroka',
      address: 'Советская площадь, 7',
      mustSeeFilter: 'temple',
      visitMinutes: 25,
    },
  ),
  stop(
    'Митрополичьи палаты',
    'Древнейший сохранившийся гражданский каменный дом города на набережной.',
    57.622915,
    39.900956,
    {
      locationSlug: 'yaroslavl-mitropolichi-palaty',
      address: 'Волжская набережная, 1',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Успенский кафедральный собор',
    'Финал линии на вершине мыса Стрелки у монументального золотоглавого храма.',
    57.621801,
    39.901354,
    {
      locationSlug: 'yaroslavl-uspenskiy-sobor',
      address: 'Почтовая ул., 3',
      mustSeeFilter: 'temple',
      visitMinutes: 20,
    },
  ),
];

/** Красная линия: неформальный, креативный и кинематографичный Ярославль, 7 точек. */
export const YAROSLAVL_RED_LINE_STOPS: any[] = [
  stop(
    'Дворик комедии «Афоня»',
    'Неформальный скрытый дворик с пивной, бронзовыми скульптурами и советскими артефактами.',
    57.623412,
    39.889912,
    {
      locationSlug: 'yaroslavl-skulptura-afonya-i-kolya',
      address: 'ул. Нахимсона, 21А',
      mustSeeFilter: 'monument',
      visitMinutes: 20,
    },
  ),
  stop(
    'Арт-пространство «Тепло»',
    'Креативный лофт-кластер в зданиях старых складов с шоурумами, кофейнями и мастерскими.',
    57.62511,
    39.88123,
    {
      locationSlug: 'yaroslavl-art-prostranstvo-teplo',
      address: 'ул. Собинова, район бывшей мануфактуры',
      mustSeeFilter: 'creative',
      visitMinutes: 40,
    },
  ),
  stop(
    'Памятник Рычащему Медведю',
    'Интерактивный поп-арт объект, ставший точкой притяжения уличных перформеров.',
    57.622612,
    39.886345,
    {
      locationSlug: 'yaroslavl-pamyatnik-rychashemu-medvedyu',
      address: 'ул. Первомайская, 15А',
      mustSeeFilter: 'monument',
      visitMinutes: 15,
    },
  ),
  stop(
    'Стрит-арт стена за ТЦ «Аура»',
    'Легальная постоянно обновляющаяся галерея масштабных граффити от поволжских райтеров.',
    57.62612,
    39.87381,
    {
      locationSlug: 'yaroslavl-strit-art-aura',
      address: 'за ТЦ «Аура»',
      mustSeeFilter: 'creative',
      visitMinutes: 20,
    },
  ),
  stop(
    'Музей «Музыка и время»',
    'Эксцентричный частный спот на набережной, сломавший советские музейные стереотипы.',
    57.631124,
    39.891956,
    {
      venueSlug: 'yaroslavl-muzey-muzyka-i-vremya',
      address: 'Волжская набережная, 33А',
      mustSeeFilter: 'museum',
      visitMinutes: 45,
    },
  ),
  stop(
    'Волжская набережная (нижний ярус)',
    'Место встреч лонгбордистов, уличных музыкантов и художников у воды.',
    57.62912,
    39.89683,
    {
      locationSlug: 'yaroslavl-volzhskaya-naberezhnaya-nizhniy-yarus',
      address: 'Волжская набережная, нижний ярус',
      mustSeeFilter: 'views',
      visitMinutes: 30,
    },
  ),
  stop(
    'Арт-платформа «Миллениум»',
    'Финал линии у футуристичного концертного центра - площадки современного искусства и фестивалей.',
    57.61412,
    39.86412,
    {
      locationSlug: 'yaroslavl-art-platforma-millennium',
      address: 'Которосльная набережная, КЗЦ «Миллениум»',
      mustSeeFilter: 'creative',
      visitMinutes: 30,
    },
  ),
];

export const YAROSLAVL_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'yaroslavl-green-line',
    title: 'Зеленая линия',
    description:
      'Купеческое узорочье и парадный Ярославль: Знаменская башня, Волковский театр, Гостиный двор, Спасский монастырь, Илья Пророк, Митрополичьи палаты и Успенский собор на Стрелке. Трек компактно уложен в исторический центр ЮНЕСКО.',
    travelVector: '7 точек · пешком по центру',
    timingNote: 'Связный трек без разрывов: от Знаменской башни к золотым куполам Успенского собора.',
    coverImageUrl: '/images/venues/yaroslavl/tserkov-il-i-proroka.jpg',
    stops: YAROSLAVL_GREEN_LINE_STOPS,
  },
  {
    id: 'yaroslavl-red-line',
    title: 'Красная линия',
    description:
      'Неформальный Ярославль: дворик «Афони», лофт «Тепло», Рычащий Медведь, стрит-арт у «Ауры», «Музыка и время», нижний ярус Волжской набережной и «Миллениум».',
    travelVector: '7 точек · пешком по дворам',
    timingNote: 'От дворика «Афони» к КЗЦ «Миллениум» без логистических разрывов.',
    coverImageUrl: '/images/venues/yaroslavl/volzhskaya-naberezhnaya.jpg',
    gastroStop: {
      name: 'Гастро-паузы Красной линии',
      blurb:
        '«Иоанн Васильевич» у «Афони», кофейня «Утро» на Нахимсона, крафт «План Б» ближе к Первомайской и «Честный Стейк» на Кирова.',
    },
    stops: YAROSLAVL_RED_LINE_STOPS,
  },
];
