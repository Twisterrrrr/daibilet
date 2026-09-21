/**
 * Volgograd local-flavor fragment (owner 2026-08-21).
 * Wire into city-hub-local-flavor.ts later - do not edit that file from this pack.
 * Hyphen-only copy.
 */
import type {
  CityIdentitySlide,
  CityWeatherFlavor,
} from './city-hub-local-flavor.ts';

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
  outdoorCta: 'Сухо: Мамаев курган рано утром, Аллея Героев или набережная 62-й',
  indoorCtaOvercast: 'Серо: панорама, музей Машкова или кофе в «Angel Cakes»',
  indoorCtaRain: 'Дождь: панорама, планетарий или обед в «Волгограде»',
  indoorCtaSnow: 'Степной ветер: метротрам, музеи центра, кофе на Чуйкова',
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
