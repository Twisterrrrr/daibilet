/** Penza painted walking lines (owner 2026-08-18). Hyphen-only copy. */
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

export const PENZA_GREEN_LINE_STOPS: any[] = [
  stop('Памятник Первопоселенцу', 'Старт на главной смотровой старой крепости с видом на долину Суры.', 53.195112, 45.019112, {
    locationSlug: 'penza-pamyatnik-pervoposelentsu',
    address: 'ул. Кирова, смотровая площадка',
    mustSeeFilter: 'monument',
    visitMinutes: 20,
    alsoMain: true,
  }),
  stop('Спасский кафедральный собор', 'Новый белокаменный собор на исторической Соборной площади.', 53.194812, 45.018512, {
    locationSlug: 'penza-spasskiy-kafedralnyy-sobor',
    address: 'Соборная площадь',
    mustSeeFilter: 'temple',
    visitMinutes: 30,
    alsoMain: true,
  }),
  stop('Улица Московская', 'Пешеходная ось центра с фонтаном, витринами и ритмом провинциального проспекта.', 53.194112, 45.015912, {
    locationSlug: 'penza-penzenskaya-peshehodnaya-ulitsa-moskovskaya',
    address: 'ул. Московская',
    mustSeeFilter: 'street',
    visitMinutes: 45,
    alsoMain: true,
  }),
  stop('Музей одной картины', 'Редкий городской формат, ради которого в Пензу едут отдельно.', 53.195512, 45.020112, {
    venueSlug: 'penza-muzey-odnoy-kartiny-im-g-v-myasnikova',
    address: 'ул. Кирова, 11',
    mustSeeFilter: 'museum',
    visitMinutes: 45,
    alsoMain: true,
  }),
  stop('Дворянское собрание', 'Главный классический фасад центра и важный ориентир старой губернской Пензы.', 53.194912, 45.018912, {
    locationSlug: 'penza-zdanie-dvoryanskogo-sobraniya',
    address: 'ул. Кирова, 13',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  stop('Парк Белинского', 'Финал зеленой линии в большом историческом парке на холме.', 53.201212, 45.014812, {
    locationSlug: 'penza-park-imeni-v-g-belinskogo',
    address: 'ул. Карла Маркса, 1',
    mustSeeFilter: 'park',
    visitMinutes: '1-2 ч',
    alsoMain: true,
  }),
];

export const PENZA_RED_LINE_STOPS: any[] = [
  stop('Фонтанная площадь', 'Светомузыкальный фонтан и главный вечерний магнит центра.', 53.194312, 45.017012, {
    locationSlug: 'penza-svetozvukovoy-fontan',
    address: 'Фонтанная площадь',
    mustSeeFilter: 'views',
    visitMinutes: 30,
    alsoMain: true,
  }),
  stop('Дом Мейерхольда', 'Деревянная усадьба с театральной памятью и сильной локальной идентичностью.', 53.196112, 45.020612, {
    venueSlug: 'penza-dom-meyerholda',
    address: 'ул. Володарского, 59',
    mustSeeFilter: 'creative',
    visitMinutes: 45,
  }),
  stop('Пензенский драмтеатр', 'Классический театральный адрес для вечернего города.', 53.195812, 45.016712, {
    venueSlug: 'penza-dramaticheskiy-teatr-lunacharskogo',
    address: 'ул. Московская, 89',
    mustSeeFilter: 'creative',
    visitMinutes: 45,
  }),
  stop('Музей В. О. Ключевского', 'Историческая деревянная Пенза и связь города с большой русской историографией.', 53.198112, 45.024112, {
    venueSlug: 'penza-muzey-klyuchevskogo',
    address: 'ул. Ключевского, 66',
    mustSeeFilter: 'museum',
    visitMinutes: 45,
  }),
  stop('Картинная галерея им. Савицкого', 'Художественный центр города и хорошая длинная музейная пауза.', 53.196612, 45.018212, {
    venueSlug: 'penza-kartinnaya-galereya-im-savickogo',
    address: 'ул. Советская, 3',
    mustSeeFilter: 'museum',
    visitMinutes: '1-2 ч',
    alsoMain: true,
  }),
  stop('Кофейни и бары Московской', 'Финал с едой и разговорами на главной улице без логистических разрывов.', 53.194012, 45.015512, {
    locationSlug: 'penza-moskovskaya-gastro-kvartal',
    address: 'ул. Московская',
    mustSeeFilter: 'gastro',
    visitMinutes: 60,
  }),
];

export const PENZA_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'penza-green-line',
    title: 'Зеленая линия',
    description: 'Старая крепость, классический центр и парк на холме: спокойный обзорный трек по главной Пензе.',
    travelVector: '6 точек · пешком по центру',
    timingNote: 'Маршрут от смотровой старой крепости к парку Белинского.',
    coverImageUrl: '/images/venues/penza/park-imeni-v-g-belinskogo.jpg',
    stops: PENZA_GREEN_LINE_STOPS,
  },
  {
    id: 'penza-red-line',
    title: 'Красная линия',
    description: 'Театр, музеи и вечерняя Московская: более культурная и городская версия центра.',
    travelVector: '6 точек · пешком по центру',
    timingNote: 'От фонтанной площади через Мейерхольда и галерею к гастро-финалу.',
    coverImageUrl: '/images/venues/penza/svetozvukovoy-fontan.jpg',
    stops: PENZA_RED_LINE_STOPS,
  },
];
