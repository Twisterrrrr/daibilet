/** Samara painted walking lines (owner 2026-08-15). Hyphen-only copy. */
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

/** Зелёная линия: Старая купеческая набережная, ~3.5 км, 10 точек. */
export const SAMARA_GREEN_LINE_STOPS: any[] = [
  stop('Улица Ленинградская', 'Пешеходная купеческая улица - старт зелёной линии.', 53.188311, 50.091512, {
    locationSlug: 'samara-ulitsa-leningradskaya',
    mustSeeFilter: 'views',
  }),
  stop('Дядя Стёпа', 'Скульптура милиционера у Ленинградской.', 53.189112, 50.093112, {
    locationSlug: 'samara-pamyatnik-dyade-stepe',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Бурлаки на Волге', 'Скульптурная группа по мотивам Репина у воды.', 53.187211, 50.084112, {
    locationSlug: 'samara-skulptura-burlaki-na-volge',
    mustSeeFilter: 'monument',
  }),
  stop('Товарищ Сухов', 'Памятник герою «Белого солнца пустыни».', 53.189412, 50.088311, {
    locationSlug: 'samara-pamyatnik-tovarischu-suhovu',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Самарская набережная', 'Главный променад вдоль Волги.', 53.195611, 50.091211, {
    locationSlug: 'samara-samarskaya-naberezhnaya',
    mustSeeFilter: 'views',
  }),
  stop('Музей Модерна', 'Усадьба Курлиной - музей модерна.', 53.197211, 50.104211, {
    locationSlug: 'samara-muzey-moderna-usadba-kurlinoy',
    mustSeeFilter: 'museum',
    visitMinutes: 40,
  }),
  stop('Католический костёл', 'Костёл Пресвятого Сердца Иисуса.', 53.196912, 50.103611, {
    locationSlug: 'samara-katolicheskiy-kostel-presvyatogo-serdtsa-iisusa',
    mustSeeFilter: 'temple',
  }),
  stop('Струковский сад', 'Старейший парк Самары у набережной.', 53.198912, 50.094411, {
    locationSlug: 'samara-strukovskiy-sad',
    mustSeeFilter: 'park',
  }),
  stop('Жигулёвский завод', 'Исторический пивоваренный завод у Волги.', 53.201611, 50.098912, {
    locationSlug: 'samara-zhigulevskiy-pivovarennyy-zavod',
    mustSeeFilter: 'houses',
  }),
  stop('Бар «На Дне»', 'Пивной бар у завода - финал зелёной линии.', 53.200811, 50.098311, {
    locationSlug: 'samara-pivnoy-bar-na-dne',
    mustSeeFilter: 'gastro',
    visitMinutes: 40,
  }),
];

/** Красная линия: Самара Космическая и Авангард, ~2.9 км, 8 точек. */
export const SAMARA_RED_LINE_STOPS: any[] = [
  stop('Ракета «Союз» / Самара Космическая', 'Музейно-выставочный центр с ракетой «Союз».', 53.223112, 50.145611, {
    locationSlug: 'samara-muzey-samara-kosmicheskaya',
    mustSeeFilter: 'museum',
    visitMinutes: 45,
  }),
  stop('Козловская площадь', 'Площадь на пути к домам-кораблям и авангарду.', 53.221512, 50.141211, {
    dayRouteId: 'samara-red-kozlovskaya',
    mustSeeFilter: 'views',
  }),
  stop('Дом-корабль', 'Конструктивистский дом-корабль.', 53.220112, 50.138912, {
    dayRouteId: 'samara-red-dom-korabl',
    mustSeeFilter: 'houses',
  }),
  stop('Сквер борцов революции', 'Сквер у фабрики-кухни ЗИМ.', 53.221211, 50.148112, {
    dayRouteId: 'samara-red-skver-bortsov',
    mustSeeFilter: 'park',
  }),
  stop('Фабрика-кухня ЗИМ', 'Конструктивистская фабрика-кухня - памятник авангарда.', 53.222511, 50.149112, {
    locationSlug: 'samara-fabrika-kuhnya-zim',
    mustSeeFilter: 'houses',
  }),
  stop('КВЦ «Радуга»', 'Выставочный центр на пути к паркам.', 53.223412, 50.151112, {
    dayRouteId: 'samara-red-raduga',
    mustSeeFilter: 'creative',
  }),
  stop('Парк Мира', 'Зелёная пауза перед Загородным парком.', 53.225112, 50.158311, {
    dayRouteId: 'samara-red-park-mira',
    mustSeeFilter: 'park',
  }),
  stop('Загородный парк', 'Крупный парк на окраине маршрута - финал красной линии.', 53.229112, 50.168311, {
    locationSlug: 'samara-zagorodnyy-park',
    mustSeeFilter: 'park',
    visitMinutes: 40,
  }),
];

export const SAMARA_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'samara-green-line',
    title: 'Зелёная линия',
    description:
      'Старая купеческая набережная: ~3,5 км от Ленинградской через скульптуры и Струковский сад к Жигулёвскому заводу.',
    travelVector: '~3,5 км · 10 точек',
    timingNote: 'Короткий пешеходный маршрут по центру и набережной.',
    stops: SAMARA_GREEN_LINE_STOPS,
  },
  {
    id: 'samara-red-line',
    title: 'Красная линия',
    description:
      'Самара Космическая и Авангард: ~2,9 км от ракеты «Союз» через конструктивизм ЗИМ к Загородному парку.',
    travelVector: '~2,9 км · 8 точек',
    timingNote: 'Компактный пеший день; удобно совместить с музеем космоса.',
    stops: SAMARA_RED_LINE_STOPS,
  },
];
