/**
 * Yaroslavl local-flavor fragment (owner 2026-08-21).
 * Paste into city-hub-local-flavor.ts when integrating - do not edit that file from hub agents.
 * Hyphen-only copy.
 */

import type {
  CityIdentitySlide,
  CityWeatherFlavor,
} from './city-hub-local-flavor.ts';

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
