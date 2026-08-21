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
  outdoorCta: 'Отличная погода для Стрелки, Волжской набережной и Губернаторского сада',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в Худмузей, «Музыку и время» или кофейню «Утро»',
  indoorCtaRain: 'Сегодня дождь. Худмузей, Волковский театр или трактир «Иоанн Васильевич»',
  indoorCtaSnow: 'Сегодня снег. Музеи центра и медовуха после прогулки к Медведю',
};

export const YAROSLAVL_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Город как палехская миниатюра: изразцы на снегу, каток на Советской площади. Согреваться медовухой и кататься на санях на Стрелке около -10 °C.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В апреле Которосль и Волга сбрасывают лед. К маю черемуха и около +17 °C - первые круизы. В конце мая - День города и салют над рекой.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Пик сезона: около +25 °C, Даманский и пляжи Подзеленья. Вечерние колокольные звоны и гастротуры за волжским судаком.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Сентябрь: бабье лето около +15 °C и золото Губернаторского сада. В октябре меньше автобусов - удобнее интерьеры. Ноябрь - театр и изразцовые сеты.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В апреле Которосль и Волга с грохотом сбрасывают лед, обнажая многоярусные набережные. К маю город зацветает черемухой, воздух прогревается до +17 °C - идеальное время для первых круизов. Главное событие - масштабное празднование Дня города в конце мая с салютом над речной акваторией.',
    summer:
      'Пиковый туристический сезон: Ярославль превращается в шумный речной курорт. Воздух держится около +25 °C, зеленый остров Даманский и пляжи Подзеленья заполняются отдыхающими. Фишки сезона - вечерние концерты колокольных звонов под открытым небом и гастротуры за волжским судаком.',
    autumn:
      'Сентябрь радует комфортным бабьим летом (+15 °C) и золотом старых липовых аллей Губернаторского сада. В октябре уходят толпы экскурсионных автобусов - простор для интерьерной фотографии. Ноябрь - лучшее время для театрального туризма в старейший театр России и дегустации ярославских изразцовых сетов.',
    winter:
      'Город превращается в ожившую сказку в стиле палехской миниатюры. Изразцы ярославских храмов выигрышно смотрятся на белом снегу, а на Советской площади открывается главный бесплатный каток региона. Главная фишка - согреваться местной медовухой и кататься на санях в парке на Стрелке при уютных -10 °C.',
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
