/** Moscow painted walking lines (owner 2026-08-15). Hyphen-only copy. */
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

/** Зелёная линия: Золотое кольцо Кремля, ~6.5 км, 12 точек. */
export const MOSCOW_GREEN_LINE_STOPS: any[] = [
  stop('Нулевой километр', 'Старт у бронзового знака нулевого километра у Воскресенских ворот.', 55.755831, 37.617712, {
    dayRouteId: 'moscow-green-nulevoy-km',
    mustSeeFilter: 'views',
  }),
  stop('Красная площадь и Исторический музей', 'Главная площадь страны и красный фасад Исторического музея.', 55.755341, 37.617901, {
    locationSlug: 'moscow-krasnaya-ploschad',
    mustSeeFilter: 'views',
  }),
  stop('Собор Василия Блаженного', 'Цветные купола Покровского собора на Красной площади.', 55.752512, 37.623112, {
    locationSlug: 'moscow-sobor-vasiliya-blazhennogo',
    mustSeeFilter: 'temple',
  }),
  stop('Парк «Зарядье» и Парящий мост', 'Парящий мост и виды на Кремль из «Зарядья».', 55.751211, 37.628311, {
    locationSlug: 'moscow-park-zaryad-e',
    mustSeeFilter: 'park',
  }),
  stop('Москворецкая набережная', 'Променад вдоль Москвы-реки к высотке на Котельнической.', 55.749112, 37.632112, {
    dayRouteId: 'moscow-green-moskvoretskaya-nab',
    mustSeeFilter: 'views',
  }),
  stop('Дом на Котельнической', 'Сталинская высотка у стрелки Яузы и Москвы-реки.', 55.747211, 37.642711, {
    locationSlug: 'moscow-kotelnicheskaya-naberezhnaya',
    mustSeeFilter: 'houses',
  }),
  stop('Большой Каменный мост', 'Классический вид на Кремль с Большого Каменного моста.', 55.748312, 37.613312, {
    dayRouteId: 'moscow-green-bolshoy-kamennyy-most',
    mustSeeFilter: 'views',
  }),
  stop('Храм Христа Спасителя', 'Белокаменный собор на Волхонке.', 55.744711, 37.605611, {
    locationSlug: 'moscow-hram-hrista-spasitelya',
    mustSeeFilter: 'temple',
  }),
  stop('Парк искусств «Музеон»', 'Скульптуры под открытым небом у Крымской набережной.', 55.734711, 37.606912, {
    locationSlug: 'moscow-muzeon',
    mustSeeFilter: 'park',
  }),
  stop('Памятник Петру I', 'Монумент работы Церетели у стрелки острова.', 55.738511, 37.608311, {
    locationSlug: 'moscow-pamyatnik-petru-i-raboty-tsereteli',
    mustSeeFilter: 'monument',
  }),
  stop('Крымский мост', 'Цепной мост к Парку Горького.', 55.734112, 37.599411, {
    dayRouteId: 'moscow-green-krymskiy-most',
    mustSeeFilter: 'views',
  }),
  stop('Парк Горького (Главный вход)', 'Главный вход в Парк Горького - финал зелёной линии.', 55.729112, 37.601211, {
    locationSlug: 'moscow-park-gorkogo',
    mustSeeFilter: 'park',
  }),
];

/** Красная линия: Арт-Якиманка и Замоскворечье, ~4.8 км, 10 точек. */
export const MOSCOW_RED_LINE_STOPS: any[] = [
  stop('Музеон', 'Старт красной линии в парке искусств у Крымской набережной.', 55.734711, 37.606912, {
    locationSlug: 'moscow-muzeon',
    mustSeeFilter: 'park',
  }),
  stop('Памятник Петру I', 'Монумент Церетели у воды.', 55.738511, 37.608311, {
    locationSlug: 'moscow-pamyatnik-petru-i-raboty-tsereteli',
    mustSeeFilter: 'monument',
  }),
  stop('Крымская набережная', 'Пешеходная набережная с волнообразным парком.', 55.736112, 37.604211, {
    locationSlug: 'moscow-krymskaya-naberezhnaya',
    mustSeeFilter: 'views',
  }),
  stop('Якиманская набережная', 'Променад к «Красному Октябрю» и Патриаршему мосту.', 55.740112, 37.608912, {
    dayRouteId: 'moscow-red-yakimanskaya-nab',
    mustSeeFilter: 'views',
  }),
  stop('Красный Октябрь', 'Бывшая фабрика - арт-кластер на острове.', 55.741512, 37.609112, {
    locationSlug: 'moscow-krasnyy-oktyabr',
    mustSeeFilter: 'creative',
  }),
  stop('Патриарший мост', 'Пешеходный мост с видом на храм Христа Спасителя.', 55.742512, 37.608112, {
    locationSlug: 'moscow-patriarshiy-most',
    mustSeeFilter: 'views',
  }),
  stop('ГЭС-2', 'Культурный центр в здании бывшей электростанции.', 55.743112, 37.614411, {
    dayRouteId: 'moscow-red-ges-2',
    address: 'Болотная набережная, 15',
    mustSeeFilter: 'creative',
    visitMinutes: 40,
  }),
  stop('Лужков мост', 'Пешеходный мост к Лаврушинскому переулку.', 55.741112, 37.619112, {
    dayRouteId: 'moscow-red-luzhkov-most',
    mustSeeFilter: 'views',
  }),
  stop('Лаврушинский / Третьяковка', 'Государственная Третьяковская галерея в Замоскворечье.', 55.741912, 37.620512, {
    locationSlug: 'moscow-tret-yakovskaya-galereya',
    mustSeeFilter: 'museum',
    visitMinutes: 45,
  }),
  stop('Пятницкая улица', 'Купеческая улица Замоскворечья - финал красной линии.', 55.740812, 37.628912, {
    locationSlug: 'moscow-pyatnitskaya-ulitsa',
    mustSeeFilter: 'views',
  }),
];

export const MOSCOW_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'moscow-green-line',
    title: 'Зелёная линия',
    description:
      'Золотое кольцо Кремля: ~6,5 км пешком от Нулевого километра через Красную площадь, «Зарядье» и набережные до Парка Горького.',
    travelVector: '~6,5 км · 12 точек',
    timingNote: 'Полдня спокойным шагом; маршрут почти целиком пешеходный.',
    stops: MOSCOW_GREEN_LINE_STOPS,
  },
  {
    id: 'moscow-red-line',
    title: 'Красная линия',
    description:
      'Арт-Якиманка и Замоскворечье: ~4,8 км по Музеону, острову «Красный Октябрь», ГЭС-2 и к Третьяковке.',
    travelVector: '~4,8 км · 10 точек',
    timingNote: 'Короткий пешеходный день без переездов; удобно совместить с музеями.',
    stops: MOSCOW_RED_LINE_STOPS,
  },
];
