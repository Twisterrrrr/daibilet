/** Smolensk painted walking lines (owner 2026-08-22). Hyphen-only copy. */
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

/** Зеленая линия: купеческая / историческая, 7 точек. */
export const SMOLENSK_GREEN_LINE_STOPS: any[] = [
  stop(
    'Железнодорожный вокзал',
    'Стартовая точка. Прибытие «Ласточки» и начало подъема в исторический центр.',
    54.794212,
    32.034155,
    {
      locationSlug: 'smolensk-vokzal',
      address: 'пл. Привокзальная',
      mustSeeFilter: 'main',
      visitMinutes: 15,
    },
  ),
  stop(
    'Памятник Твардовскому и Тёркину',
    'Литературный акцент площади Победы на пути к купеческому центру.',
    54.777931,
    32.051912,
    {
      locationSlug: 'smolensk-pamyatnik-tvardovskomu-i-terkinu',
      address: 'пл. Победы',
      mustSeeFilter: 'monument',
      visitMinutes: 15,
    },
  ),
  stop(
    'Здание бывшей Городской Думы',
    'Купеческий фасад и точка перехода к Большой Советской.',
    54.782412,
    32.046322,
    {
      locationSlug: 'smolensk-zdanie-byvshey-gorodskoy-dumy',
      address: 'ул. Октябрьской революции / центр',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Дом с часами',
    'Ориентир исторического посада с городскими часами на фасаде.',
    54.783455,
    32.052611,
    {
      locationSlug: 'smolensk-dom-s-chasami',
      address: 'ул. Большая Советская',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Большая Советская улица',
    'Главная пешеходная ось купеческого Смоленска.',
    54.784511,
    32.052822,
    {
      locationSlug: 'smolensk-bolshaya-sovetskaya',
      address: 'ул. Большая Советская',
      mustSeeFilter: 'street',
      visitMinutes: 30,
    },
  ),
  stop(
    'Свято-Троицкий монастырь',
    'Тихий монастырский двор на подъеме к Соборному холму.',
    54.786511,
    32.052922,
    {
      locationSlug: 'smolensk-svyato-troitskiy-monastyr',
      address: 'ул. Большая Советская / Соборный холм',
      mustSeeFilter: 'temple',
      visitMinutes: 25,
    },
  ),
  stop(
    'Соборный двор',
    'Финал линии у князя Мономаха и панорамы Успенского собора.',
    54.788544,
    32.054366,
    {
      locationSlug: 'smolensk-sobornyy-dvor',
      address: 'Соборный холм',
      mustSeeFilter: 'views',
      visitMinutes: 25,
    },
  ),
];

/** Красная линия: неформальная / креативная, 7 точек. */
export const SMOLENSK_RED_LINE_STOPS: any[] = [
  stop(
    'Арт-объект «Глобус Смоленска»',
    'Стартовая точка. Городской арт-символ у пешеходных дворов.',
    54.778844,
    32.046122,
    {
      locationSlug: 'smolensk-art-globus-smolenska',
      address: 'центр, у пешеходных дворов',
      mustSeeFilter: 'monument',
      visitMinutes: 15,
    },
  ),
  stop(
    'Олень в саду Блонье',
    'Фототочка сада Блонье на пути к неформальному центру.',
    54.7825,
    32.048333,
    {
      locationSlug: 'smolensk-olen-v-sadu-blone',
      address: 'сад Блонье',
      mustSeeFilter: 'monument',
      visitMinutes: 15,
    },
  ),
  stop(
    'Скульптура «Кот Смоленский»',
    'Локальный мем и точка сбора перед креативными площадками.',
    54.7831,
    32.0498,
    {
      locationSlug: 'smolensk-skulptura-kot-smolenskiy',
      address: 'центр у Блонье',
      mustSeeFilter: 'monument',
      visitMinutes: 10,
    },
  ),
  stop(
    'Креативное пространство «Смена»',
    'Неформальный хаб выставок, лекций и вечерних встреч.',
    54.784211,
    32.048122,
    {
      locationSlug: 'smolensk-prostranstvo-smena',
      address: 'центр',
      mustSeeFilter: 'creative',
      visitMinutes: 40,
    },
  ),
  stop(
    'Музей-кузница XVII века',
    'Живой кузнечный двор - мост между ремеслом и стрит-культурой.',
    54.786512,
    32.046311,
    {
      venueSlug: 'smolensk-muzey-kuznitsa-xvii-veka',
      address: 'ул. Ленина / кузнечный двор',
      mustSeeFilter: 'museum',
      visitMinutes: 40,
    },
  ),
  stop(
    'Шеинов вал',
    'Зеленый вал и смотровая пауза Красной линии.',
    54.783122,
    32.059211,
    {
      locationSlug: 'smolensk-sheinov-val',
      address: 'Шеинов вал',
      mustSeeFilter: 'park',
      visitMinutes: 25,
    },
  ),
  stop(
    'Арт-завод «Бахус»',
    'Финал линии: креативный кластер, сцена и фестивальные площадки.',
    54.771211,
    32.039411,
    {
      locationSlug: 'smolensk-art-zavod-bahus',
      address: 'Арт-завод Бахус',
      mustSeeFilter: 'creative',
      visitMinutes: 50,
    },
  ),
];

export const SMOLENSK_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'smolensk-green-line',
    title: 'Зеленая линия',
    description:
      'Купеческая и историческая линия: вокзал, Тёркин, Дума, Дом с часами, Большая Советская, Троицкий монастырь и Соборный двор.',
    travelVector: '7 точек · пешком от вокзала',
    timingNote: 'Связный трек: от Привокзальной площади к Соборному холму без разрывов.',
    coverImageUrl: '/images/venues/smolensk/smolenskaya-krepostnaya-stena.jpg',
    stops: SMOLENSK_GREEN_LINE_STOPS,
  },
  {
    id: 'smolensk-red-line',
    title: 'Красная линия',
    description:
      'Неформальный и креативный город: Глобус, Олень, Кот, «Смена», кузница, Шеинов вал и Арт-завод «Бахус».',
    travelVector: '7 точек · дворы и вал',
    timingNote: 'От Глобуса к «Бахусу» через Блонье и кузнечный двор без логистических разрывов.',
    gastroStop: {
      name: '«Маяковский» и «Смоленский конфект»',
      blurb:
        'Пивоварня «Маяковский» и кафе-кондитерская «Смоленский конфект» - удобные гастропаузы рядом с Красной линией.',
    },
    coverImageUrl: '/images/venues/smolensk/lopatinskiy-sad.jpg',
    stops: SMOLENSK_RED_LINE_STOPS,
  },
];
