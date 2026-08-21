/**
 * Volgograd local-flavor fragment (owner 2026-08-21).
 * Wire into city-hub-local-flavor.ts later - do not edit that file from this pack.
 * Hyphen-only copy.
 */
import type {
  CityIdentitySlide,
  CitySeasonTab,
  CityWeatherFlavor,
  CityWhenToGoFlavor,
} from './city-hub-local-flavor.ts';

function seasonTabs(bodies: Record<'spring' | 'summer' | 'autumn' | 'winter', string>): CitySeasonTab[] {
  return [
    { id: 'spring', label: 'Весна', body: bodies.spring },
    { id: 'summer', label: 'Лето', body: bodies.summer },
    { id: 'autumn', label: 'Осень', body: bodies.autumn },
    { id: 'winter', label: 'Зима', body: bodies.winter },
  ];
}

export const VOLGOGRAD_WEATHER: CityWeatherFlavor = {
  latitude: 48.708,
  longitude: 44.515,
  timezone: 'Europe/Volgograd',
  outdoorSlugs: [
    'volgograd-mamaev-kurgan',
    'volgograd-tsentral-naya-naberezhnaya-imeni-62-y-armii',
    'volgograd-alleya-geroev',
    'volgograd-smotrovaya-mamaeva-kurgana',
    'volgograd-volgogradskiy-metrotram',
  ],
  indoorSlugs: [
    'volgograd-muzey-panorama-stalingradskaya-bitva',
    'volgograd-muzey-mashkova',
    'volgograd-planetariy',
    'volgograd-angel-cakes',
    'volgograd-restoran-volgograd',
  ],
  outdoorCta: 'Отличная погода для Мамаева кургана, Аллеи Героев и набережной 62-й Армии',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в музей-панораму, музей Машкова или «Angel Cakes»',
  indoorCtaRain: 'Сегодня дождь. Музей-панорама, планетарий или ресторан «Волгоград»',
  indoorCtaSnow: 'Сегодня снег. Метротрам от ветра, музеи центра и кофе на Чуйкова',
};

export const VOLGOGRAD_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Volgograd',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Степной ветер и около -12 °C. Мамаев курган в снегу выглядит особенно величественно. Главная фишка - подземные станции метротрама от пронизывающего ветра.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'От мартовской грязи к майским +22 °C. Начало мая - пик сезона: День Победы. Можно застать сброс воды на Волжской ГЭС.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Степное пекло до +35...+40 °C. Июнь - волжская мошка; июль и август - пляжи Волго-Ахтубинской поймы и быковские арбузы.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Золотой сезон: сентябрь-октябрь около +18 °C для длинных прогулок. Ноябрь - туманы, музеи и театры.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'Весна здесь короткая и контрастная: от мартовской слякоти к майским +22 °C. Абсолютный пик - начало мая, когда город отмечает День Победы. Бонус сезона - сброс воды на Волжской ГЭС, похожий на водопад.',
    summer:
      'Лето - степное пекло до +35...+40 °C в тени. Июнь омрачен волжской мошкой, зато июль и август хороши для песчаных кос Волго-Ахтубинской поймы и сладких быковских арбузов. На Мамаев курган лучше выходить рано утром.',
    autumn:
      'Сентябрь и октябрь дают комфортные +18 °C - лучшее время для пеших маршрутов по центру и набережной. Волга остывает медленно. Ноябрь приносит туманы и первые заморозки, туристы уходят в музеи и театры.',
    winter:
      'Зима суровая: степной ветер и температуры до -12 °C. Монументы Мамаева кургана в снегу выглядят пронзительно. Спасение от ветра - подземные станции скоростного трамвая с мрамором и люстрами.',
  }),
};

export const VOLGOGRAD_SLIDES: CityIdentitySlide[] = [
  {
    id: 'rodina-mat',
    title: 'Родина-мать зовёт!',
    text: '85-метровый стальной силуэт над главной высотой России. Монумент Вучетича - визуальный ДНК Волгограда и масштаб подвига Сталинграда.',
    imageSrc: '/images/venues/volgograd/identity-symbol.jpg',
    imageAlt: 'Скульптура «Родина-мать зовёт!» на Мамаевом кургане',
    slugs: [
      'volgograd-mamaev-kurgan',
      'volgograd-zal-voinskoy-slavy',
      'volgograd-smotrovaya-mamaeva-kurgana',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'metrotram',
    title: 'Волгоградский скоростной трамвай',
    text: 'Единственная в РФ подземка-метротрам: мраморные станции и вагоны Татра. Инженерный обход лимитов на классическое метро.',
    imageSrc: '/images/venues/volgograd/identity-art.jpg',
    imageAlt: 'Подземная станция волгоградского метротрама',
    slugs: [
      'volgograd-volgogradskiy-metrotram',
      'volgograd-art-prostranstvo-ikra',
      'volgograd-park-razdole',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'sarepta-mustard',
    title: 'Горчичное масло и котлета по-волгоградски',
    text: 'Кулинарный код Сарепты: горчичное масло, сарептские пряники, волжская рыба и местная котлета - сочный аналог по-киевски.',
    imageSrc: '/images/venues/volgograd/identity-gastro.jpg',
    imageAlt: 'Волгоградская гастрономия и сарептская горчица',
    slugs: [
      'volgograd-staraya-sarepta',
      'volgograd-angel-cakes',
      'volgograd-restoran-shveyn',
    ],
    target: 'mixed',
    badge: 'Гастро',
  },
  {
    id: 'alleya-geroev',
    title: 'Ансамбль Аллеи Героев',
    text: 'Триумфальный сталинский ампир от площади Павших Борцов к парадной набережной: стелы, колоннады и город-феникс после войны.',
    imageSrc: '/images/venues/volgograd/identity-architecture.jpg',
    imageAlt: 'Аллея Героев и сталинский ампир Волгограда',
    slugs: [
      'volgograd-alleya-geroev',
      'volgograd-tsentral-naya-naberezhnaya-imeni-62-y-armii',
      'volgograd-vokzal-volgograd-1',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];
