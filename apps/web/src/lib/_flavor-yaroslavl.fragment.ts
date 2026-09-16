/**
 * Yaroslavl local-flavor fragment (owner 2026-08-21).
 * Paste into city-hub-local-flavor.ts when integrating - do not edit that file from hub agents.
 * Hyphen-only copy.
 */

import type {
  CityIdentitySlide,
  CitySeasonTab,
  CitySeasonTabId,
  CityWeatherFlavor,
  CityWhenToGoFlavor,
} from './city-hub-local-flavor.ts';

function seasonTabs(bodies: Record<CitySeasonTabId, string>): CitySeasonTab[] {
  return [
    { id: 'spring', label: 'Весна', body: bodies.spring },
    { id: 'summer', label: 'Лето', body: bodies.summer },
    { id: 'autumn', label: 'Осень', body: bodies.autumn },
    { id: 'winter', label: 'Зима', body: bodies.winter },
  ];
}

export const YAROSLAVL_WEATHER: CityWeatherFlavor = {
  latitude: 57.6261,
  longitude: 39.8845,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'yaroslavl-strelka-rek-volgi-i-kotorosli',
    'yaroslavl-volzhskaya-naberezhnaya',
    'yaroslavl-gubernatorskiy-sad',
    'yaroslavl-pamyatnik-rychashemu-medvedyu',
    'yaroslavl-damanskiy-ostrov',
  ],
  indoorSlugs: [
    'yaroslavl-yaroslavskiy-hudozhestvennyy-muzey',
    'yaroslavl-muzey-muzyka-i-vremya',
    'yaroslavl-teatr-volkova',
    'yaroslavl-restoran-ioann-vasilevich',
    'yaroslavl-kofeynya-utro',
  ],
  outdoorCta: 'Сухо: Стрелка, Волжская набережная или Губернаторский сад',
  indoorCtaOvercast: 'Серо: Худмузей, «Музыка и время» или кофе в «Утро»',
  indoorCtaRain: 'Дождь: Худмузей, Волковский или трактир «Иоанн Васильевич»',
  indoorCtaSnow: 'Снег: музеи у Медведя, потом медовуха в тепле',
};

export const YAROSLAVL_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Изразцы на белом фоне, каток на Советской. На Стрелке продувает - сани и медовуха; без непромокаемой обуви вечер короткий.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В апреле Которосль и Волга открывают набережные ото льда. К маю черёмуха и первые круизы; в конце мая ждите День города и салют.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Даманский, пляжи Подзеленья, вечерние звоны. Судака берите после воды - на реке всё равно нужна ветровка.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Жёлтый Губернаторский сад. В октябре туристические автобусы редеют - время музеев; ноябрь отдайте Волковскому.',
    },
  ],
  tabs: seasonTabs({
    spring: 'Набережные ото льда. Май - круизы и День города.',
    summer: 'Даманский и пляжи. На воде продувает.',
    autumn: 'Сад в сентябре. Позже - музеи и Волковский.',
    winter: 'Изразцы и каток. На Стрелке без тёплой обуви не задерживайтесь.',
  }),
};

export const YAROSLAVL_SLIDES: CityIdentitySlide[] = [
  {
    id: 'ilya-prorok',
    title: 'Церковь Ильи Пророка',
    text: 'Изумрудные купола и библейские фрески XVII века в эпицентре радиальной застройки. Визуальный бренд Ярославля и ДНК города-музея.',
    imageSrc: '/images/venues/yaroslavl/identity-symbol.jpg',
    imageAlt: 'Церковь Ильи Пророка на Советской площади',
    slugs: [
      'yaroslavl-tserkov-il-i-proroka',
      'yaroslavl-yaroslavskiy-kreml-spaso-preobrazhenskiy-monastyr',
      'yaroslavl-uspenskiy-sobor',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'muzyka-i-vremya',
    title: 'Музей «Музыка и время»',
    text: 'Старинный колокольный звон и музыкальные шкатулки на набережной Волги. Первый официальный частный музей страны.',
    imageSrc: '/images/venues/yaroslavl/identity-art.jpg',
    imageAlt: 'Музей «Музыка и время» на Волжской набережной',
    slugs: [
      'yaroslavl-muzey-muzyka-i-vremya',
      'yaroslavl-yaroslavskiy-hudozhestvennyy-muzey',
      'yaroslavl-teatr-volkova',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'yarushki',
    title: 'Ярушки и ушное',
    text: 'Рыбные пельмени в наваристом бульоне и томленое купеческое мясо - кулинарные коды Верхней Волги.',
    imageSrc: '/images/venues/yaroslavl/identity-gastro.jpg',
    imageAlt: 'Ярославская гастрономия: ярушки и ушное',
    slugs: [
      'yaroslavl-restoran-ioann-vasilevich',
      'yaroslavl-restoran-sobranie',
      'yaroslavl-restoran-penaty',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'rychaschiy-medved',
    title: 'Медведь со секирой',
    text: 'Бронзовый рычащий медведь каждый час оглашает центр - тотем герба и легенды об основании города Ярославом Мудрым.',
    imageSrc: '/images/venues/yaroslavl/identity-architecture.jpg',
    imageAlt: 'Памятник Рычащему Медведю на Первомайской',
    slugs: [
      'yaroslavl-pamyatnik-rychashemu-medvedyu',
      'yaroslavl-pamyatnik-yaroslavu-mudromu',
      'yaroslavl-skulptura-medved-s-ryboy',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];
