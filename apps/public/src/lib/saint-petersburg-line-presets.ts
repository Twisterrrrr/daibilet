/** Saint Petersburg painted walking lines (owner 2026-08-15). Hyphen-only copy. */
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

/** Зелёная линия: Золотой треугольник, ~3.5 км, 10 точек. */
export const SAINT_PETERSBURG_GREEN_LINE_STOPS: any[] = [
  stop('Дворцовая площадь и Эрмитаж', 'Старт у Зимнего дворца и Александровской колонны.', 59.939095, 30.315868, {
    locationSlug: 'saint-petersburg-dvortsovaya-ploschad',
    mustSeeFilter: 'views',
  }),
  stop('Арка Главного штаба', 'Триумфальная арка на Дворцовой площади.', 59.937146, 30.319812, {
    locationSlug: 'saint-petersburg-glavnyy-shtab-ermitazh',
    mustSeeFilter: 'houses',
  }),
  stop('Пышечная Большая Конюшенная', 'Классическая пышечная на Большой Конюшенной.', 59.938341, 30.322511, {
    locationSlug: 'saint-petersburg-pyshechnaya-na-bolshoy-konyushennoy',
    mustSeeFilter: 'gastro',
    visitMinutes: 25,
  }),
  stop('Малая Конюшенная', 'Пешеходная улица у Спаса на Крови.', 59.936512, 30.324112, {
    locationSlug: 'saint-petersburg-peshehodnaya-malaya-konyushennaya',
    mustSeeFilter: 'views',
  }),
  stop('Спас на Крови', 'Собор Воскресения Христова на крови.', 59.940112, 30.328912, {
    locationSlug: 'saint-petersburg-spas-na-krovi',
    mustSeeFilter: 'temple',
  }),
  stop('Михайловский сад', 'Сад у Михайловского дворца и Спаса на Крови.', 59.941211, 30.331212, {
    locationSlug: 'saint-petersburg-mihaylovskiy-sad',
    mustSeeFilter: 'park',
  }),
  stop('Строгановский дворец', 'Барочный дворец на Невском проспекте.', 59.935812, 30.321112, {
    locationSlug: 'saint-petersburg-stroganovskiy-dvorets',
    mustSeeFilter: 'houses',
  }),
  stop('Казанский собор', 'Колоннада Казанского собора на Невском.', 59.934112, 30.324511, {
    locationSlug: 'saint-petersburg-kazanskiy-sobor',
    mustSeeFilter: 'temple',
  }),
  stop('Адмиралтейская набережная', 'Набережная у Адмиралтейства с видом на Неву.', 59.938912, 30.309411, {
    locationSlug: 'saint-petersburg-admiralteystvo',
    mustSeeFilter: 'views',
  }),
  stop('Исаакиевский собор', 'Золотой купол Исаакия - финал зелёной линии.', 59.934112, 30.306112, {
    locationSlug: 'saint-petersburg-isaakievskiy-sobor',
    mustSeeFilter: 'temple',
  }),
];

/** Красная линия: Креативная Коломна и Севкабель, ~4.2 км, 9 точек. */
export const SAINT_PETERSBURG_RED_LINE_STOPS: any[] = [
  stop('Юсуповский сад', 'Старт у сада в Коломне.', 59.924112, 30.315612, {
    locationSlug: 'saint-petersburg-yusupovskiy-sad',
    mustSeeFilter: 'park',
  }),
  stop('Семимостье (Пикалов мост)', 'Точка, откуда видно семь мостов.', 59.921821, 30.299812, {
    locationSlug: 'saint-petersburg-semimoste',
    mustSeeFilter: 'views',
  }),
  stop('Никольский сад и собор', 'Николо-Богоявленский морской собор и сад.', 59.922112, 30.301512, {
    locationSlug: 'saint-petersburg-nikolo-bogoyavlenskiy-morskoy-sobor',
    mustSeeFilter: 'temple',
  }),
  stop('Никольские ряды', 'Исторические торговые ряды на Садовой.', 59.920412, 30.297812, {
    dayRouteId: 'spb-red-nikolskie-ryady',
    address: 'ул. Садовая, 62',
    mustSeeFilter: 'creative',
  }),
  stop('Новая Голландия', 'Остров-парк с гастрономией и событиями.', 59.929811, 30.289412, {
    locationSlug: 'saint-petersburg-novaya-gollandiya',
    mustSeeFilter: 'creative',
    visitMinutes: 40,
  }),
  stop('Причал Университетская наб.', 'Причал на Университетской набережной.', 59.937812, 30.291112, {
    locationSlug: 'saint-petersburg-universitetskaya-naberezhnaya',
    mustSeeFilter: 'views',
  }),
  stop('Стрелка ВО', 'Ростральные колонны на Стрелке Васильевского острова.', 59.944112, 30.306412, {
    locationSlug: 'saint-petersburg-strelka-vasilevskogo-ostrova',
    mustSeeFilter: 'views',
  }),
  stop('Двор ГЦСИ', 'Двор Государственного центра современного искусства.', 59.939112, 30.271512, {
    dayRouteId: 'spb-red-gtsi',
    mustSeeFilter: 'creative',
  }),
  stop('Севкабель Порт', 'Креативный кластер на Васильевском - финал красной линии.', 59.924511, 30.241211, {
    locationSlug: 'saint-petersburg-sevkabel-port',
    mustSeeFilter: 'creative',
    visitMinutes: 45,
  }),
];

export const SAINT_PETERSBURG_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'saint-petersburg-green-line',
    title: 'Зелёная линия',
    description:
      'Золотой треугольник: ~3,5 км от Дворцовой площади через Конюшенные, Спас на Крови и Невский к Исаакию.',
    travelVector: '~3,5 км · 10 точек',
    timingNote: 'Плотный пешеходный центр; почти без переездов.',
    stops: SAINT_PETERSBURG_GREEN_LINE_STOPS,
  },
  {
    id: 'saint-petersburg-red-line',
    title: 'Красная линия',
    description:
      'Креативная Коломна и Севкабель: ~4,2 км от Юсуповского сада через Новую Голландию и Стрелку к Севкабель Порту.',
    travelVector: '~4,2 км · 9 точек',
    timingNote: 'Пеший день с выходом на остров; финал у воды в Севкабеле.',
    stops: SAINT_PETERSBURG_RED_LINE_STOPS,
  },
];
