/** Nizhny Novgorod painted walking lines (owner 2026-08-15). Hyphen-only copy. */
/* eslint-disable @typescript-eslint/no-explicit-any */

function stop(
  name: string,
  desc: string,
  latitude: number,
  longitude: number,
  opts: {
    locationSlug?: string;
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
    ...(opts.dayRouteId ? { dayRouteId: opts.dayRouteId } : {}),
    ...(opts.address ? { address: opts.address } : {}),
  };
}

/** Зелёная линия: Холмы, Кремль и Рождественская, ~4.2 км, 10 точек. */
export const NIZHNY_NOVGOROD_GREEN_LINE_STOPS: any[] = [
  stop('Площадь Минина', 'Старт у главной площади у стен Кремля.', 56.326842, 44.005511, {
    locationSlug: 'nizhny-novgorod-ploschad-minina-i-pozharskogo',
    mustSeeFilter: 'views',
  }),
  stop('Дмитриевская башня', 'Главная проездная башня Нижегородского Кремля.', 56.326112, 44.005812, {
    locationSlug: 'nizhny-novgorod-dmitrievskaya-bashnya',
    dayRouteId: 'nn-green-dmitrievskaya-bashnya',
    mustSeeFilter: 'houses',
  }),
  stop('Нижегородский Кремль', 'Крепость на холме над слиянием Оки и Волги.', 56.328312, 44.002811, {
    locationSlug: 'nizhny-novgorod-nizhegorodskiy-kreml',
    mustSeeFilter: 'houses',
    visitMinutes: 40,
  }),
  stop('Михайло-Архангельский собор', 'Белокаменный собор внутри кремлёвских стен.', 56.329112, 44.001112, {
    locationSlug: 'nizhny-novgorod-mihailo-arhangelskiy-sobor',
    mustSeeFilter: 'temple',
  }),
  stop('Памятник Чкалову', 'Монумент лётчику у начала Чкаловской лестницы.', 56.330112, 44.009411, {
    locationSlug: 'nizhny-novgorod-pamyatnik-valeriyu-chkalovu',
    mustSeeFilter: 'monument',
  }),
  stop('Чкаловская лестница', 'Монументальный спуск к Волге с видовыми площадками.', 56.330542, 44.011911, {
    locationSlug: 'nizhny-novgorod-chkalovskaya-lestnitsa',
    mustSeeFilter: 'views',
  }),
  stop('Нижне-Волжская набережная', 'Набережная у подножия холма после лестницы.', 56.331211, 43.998311, {
    locationSlug: 'nizhny-novgorod-nizhne-volzhskaya-naberezhnaya',
    mustSeeFilter: 'views',
  }),
  stop('Катер «Герой»', 'Корабль-музей у набережной.', 56.331912, 44.012112, {
    locationSlug: 'nizhny-novgorod-kater-geroy',
    mustSeeFilter: 'museum',
  }),
  stop('Рождественская улица', 'Историческая купеческая улица под холмом.', 56.328612, 43.988311, {
    locationSlug: 'nizhny-novgorod-rozhdestvenskaya-ulitsa',
    mustSeeFilter: 'views',
  }),
  stop('Литературное кафе «Безухов»', 'Кафе на Рождественской - финал зелёной линии.', 56.328912, 43.991211, {
    locationSlug: 'nizhny-novgorod-bezuhov-cafe',
    address: 'ул. Рождественская, 12/5',
    mustSeeFilter: 'gastro',
    visitMinutes: 40,
  }),
];

/** Красная линия: Стрелка, Ярмарка и Пакгаузы, ~3.8 км, 8 точек. */
export const NIZHNY_NOVGOROD_RED_LINE_STOPS: any[] = [
  stop('Нижегородская ярмарка', 'Старт у главного ярмарочного комплекса.', 56.327912, 43.963312, {
    locationSlug: 'nizhny-novgorod-nizhegorodskaya-yarmarka',
    mustSeeFilter: 'houses',
  }),
  stop('Ярмарочная фильтровальная станция', 'Историческая водонапорная станция у ярмарки.', 56.329112, 43.961211, {
    locationSlug: 'nizhny-novgorod-filtrovalnaya-stantsiya',
    dayRouteId: 'nn-red-filtrovalnaya',
    mustSeeFilter: 'houses',
  }),
  stop('Площадь Ленина', 'Площадь на пути к собору и Стрелке.', 56.329812, 43.968112, {
    locationSlug: 'nizhny-novgorod-ploschad-lenina',
    dayRouteId: 'nn-red-ploschad-lenina',
    mustSeeFilter: 'views',
  }),
  stop('Улица Советская', 'Подход к собору Александра Невского.', 56.331212, 43.971112, {
    locationSlug: 'nizhny-novgorod-ulitsa-sovetskaya',
    dayRouteId: 'nn-red-ulitsa-sovetskaya',
    mustSeeFilter: 'views',
  }),
  stop('Собор Александра Невского', 'Новоярмарочный собор у слияния рек.', 56.333312, 43.971211, {
    locationSlug: 'nizhny-novgorod-sobor-aleksandra-nevskogo',
    mustSeeFilter: 'temple',
  }),
  stop('Пакгаузы на Стрелке', 'Реконструированные складские пакгаузы у воды.', 56.334411, 43.975612, {
    locationSlug: 'nizhny-novgorod-pakgauzy-na-strelke',
    mustSeeFilter: 'creative',
  }),
  stop('Арт-объект «Стрелка»', 'Инсталляция на мысе у слияния Оки и Волги.', 56.335112, 43.977211, {
    locationSlug: 'nizhny-novgorod-art-strelka',
    dayRouteId: 'nn-red-art-strelka',
    mustSeeFilter: 'monument',
  }),
  stop('Мыс Стрелки', 'Точка слияния Оки и Волги - финал красной линии.', 56.335512, 43.978112, {
    locationSlug: 'nizhny-novgorod-strelka-rek-volgi-i-oki',
    mustSeeFilter: 'views',
  }),
];

export const NIZHNY_NOVGOROD_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'nizhny-novgorod-green-line',
    title: 'Зелёная линия',
    description:
      'Холмы, Кремль и Рождественская: ~4,2 км от площади Минина через Кремль и Чкаловскую лестницу к купеческой улице.',
    travelVector: '~4,2 км · 10 точек',
    timingNote: 'Пеший маршрут с перепадом высоты; лестница - главный набор ступеней.',
    coverImageUrl: '/images/venues/nizhny-novgorod/nn-green-line-cover.jpg',
    stops: NIZHNY_NOVGOROD_GREEN_LINE_STOPS,
  },
  {
    id: 'nizhny-novgorod-red-line',
    title: 'Красная линия',
    description:
      'Стрелка, Ярмарка и Пакгаузы: ~3,8 км от ярмарки к собору Александра Невского и мысу Стрелки.',
    travelVector: '~3,8 км · 8 точек',
    timingNote: 'Короткий пешеходный променад без крутых подъёмов.',
    coverImageUrl: '/images/venues/nizhny-novgorod/nn-red-line-cover.jpg',
    stops: NIZHNY_NOVGOROD_RED_LINE_STOPS,
  },
];
