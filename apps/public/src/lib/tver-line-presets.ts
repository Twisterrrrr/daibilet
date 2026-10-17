/** Tver painted walking lines (owner 2026-08-18). Hyphen-only copy. */
/* eslint-disable @typescript-eslint/no-explicit-any */

function stop(
  name: string,
  desc: string,
  latitude: number,
  longitude: number,
  opts: {
    locationSlug?: string;
    venueSlug?: string;
    address?: string;
    mustSeeFilter?: string;
    visitMinutes?: number | string;
    alsoMain?: boolean;
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
    ...(opts.address ? { address: opts.address } : {}),
    ...(typeof opts.alsoMain === 'boolean' ? { alsoMain: opts.alsoMain } : {}),
  };
}

export const TVER_GREEN_LINE_STOPS: any[] = [
  stop('Спасо-Преображенский собор', 'Старт у белокаменного сердца Соборной площади.', 56.860139, 35.897778, {
    locationSlug: 'tver-spaso-preobrazhenskiy-sobor',
    address: 'Соборная площадь, 1',
    mustSeeFilter: 'temple',
    visitMinutes: 25,
    alsoMain: true,
  }),
  stop('Императорский путевой дворец', 'Парадная резиденция Екатерины II и главный барочный фасад Твери.', 56.860112, 35.898912, {
    locationSlug: 'tver-imperatorskiy-putevoy-dvorets',
    address: 'ул. Советская, 3',
    mustSeeFilter: 'houses',
    visitMinutes: 45,
    alsoMain: true,
  }),
  stop('Здание Реального училища', 'Классический корпус XIX века, сейчас областной краеведческий музей.', 56.859112, 35.901112, {
    locationSlug: 'tver-zdanie-realnogo-uchilishcha',
    address: 'ул. Советская, 5',
    mustSeeFilter: 'houses',
    visitMinutes: 40,
  }),
  stop('Тверской Гостиный двор', 'Каменные торговые ряды конца XVIII века на целый квартал центра.', 56.858912, 35.908912, {
    locationSlug: 'tver-gostinyy-dvor',
    address: 'Свободный переулок, 5',
    mustSeeFilter: 'houses',
    visitMinutes: 20,
  }),
  stop('Дом Ворошиловских стрелков', 'Сталинский неоклассицизм на входе к набережной Степана Разина.', 56.861112, 35.908912, {
    locationSlug: 'tver-dom-voroshilovskih-strelkov',
    address: 'наб. Степана Разина, 2',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  stop('Набережная Степана Разина', 'Финал зеленой линии: двухъярусный променад с купеческой единой фасадой.', 56.861112, 35.918912, {
    locationSlug: 'tver-naberezhnaya-stepana-razina',
    address: 'наб. Степана Разина',
    mustSeeFilter: 'park',
    visitMinutes: 40,
    alsoMain: true,
  }),
];

export const TVER_RED_LINE_STOPS: any[] = [
  stop('Пешеходная Трехсвятская', 'Тверской Арбат: сувениры, слойки и уличный ритм центра.', 56.856912, 35.911112, {
    locationSlug: 'tver-peshehodnaya-trehsvyatskaya-ulitsa',
    address: 'ул. Трехсвятская',
    mustSeeFilter: 'street',
    visitMinutes: 40,
    alsoMain: true,
  }),
  stop('Памятник Михаилу Кругу', 'Контактная скамейка шансонье на бульваре Радищева.', 56.858912, 35.911112, {
    locationSlug: 'tver-pamyatnik-mihailu-krugu',
    address: 'бульвар Радищева, 21',
    mustSeeFilter: 'monument',
    visitMinutes: 15,
    alsoMain: true,
  }),
  stop('Креативный кластер «Рельсы»', 'Кофе, книжный маркет и городские лекции во дворе Трехсвятской.', 56.856412, 35.911891, {
    locationSlug: 'tver-kreativnyy-klaster-relsy',
    address: 'ул. Трехсвятская, 18А',
    mustSeeFilter: 'creative',
    visitMinutes: 40,
  }),
  stop('Музей Козла', 'Ироничный частный музей главного городского тотема.', 56.851912, 35.915112, {
    venueSlug: 'tver-muzey-kozla',
    address: 'ул. Жигарева, 5',
    mustSeeFilter: 'museum',
    visitMinutes: 45,
  }),
  stop('Морозовский городок', 'Кирпичный «город в городе» Двора Пролетарки и казарма «Париж».', 56.848912, 35.881112, {
    locationSlug: 'tver-morozovskiy-gorodok-dvor-proletarki',
    address: 'ул. Двор Пролетарки, 70',
    mustSeeFilter: 'houses',
    visitMinutes: 60,
    alsoMain: true,
  }),
  stop('Гастропространство «Фабрика»', 'Финал в индустриальных корпусах Морозовской мануфактуры.', 56.849112, 35.882312, {
    locationSlug: 'tver-gastroprostranstvo-fabrika',
    address: 'ул. Двор Пролетарки, 4',
    mustSeeFilter: 'gastro',
    visitMinutes: 60,
  }),
];

export const TVER_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'tver-green-line',
    title: 'Зеленая линия',
    description: 'Императорский трезубец и тверское барокко: собор, Путевой дворец и купеческая набережная без логистических разрывов.',
    travelVector: '6 точек · пешком по центру',
    timingNote: 'От Соборной площади вдоль Советской к набережной Степана Разина.',
    stops: TVER_GREEN_LINE_STOPS,
  },
  {
    id: 'tver-red-line',
    title: 'Красная линия',
    description: 'Трехсвятская, Круг, «Рельсы» и Морозовский городок: творческий и индустриальный трек Твери.',
    travelVector: '6 точек · пешком и короткий доезд до Пролетарки',
    timingNote: 'От Трехсвятской через музей Козла к Двору Пролетарки. До Морозовского городка удобен автобус или такси.',
    stops: TVER_RED_LINE_STOPS,
  },
];
