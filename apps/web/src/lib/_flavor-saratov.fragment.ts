/**
 * Saratov flavor fragment for later merge into city-hub-local-flavor.ts.
 * Hyphen-only copy. Do not import from cityInfo / other hubs here.
 */
import type {
  CityIdentitySlide,
  CityWeatherFlavor,
} from './city-hub-local-flavor.ts';

export const SARATOV_WEATHER: CityWeatherFlavor = {
  latitude: 51.533,
  longitude: 46.034,
  timezone: 'Europe/Saratov',
  outdoorSlugs: [
    'saratov-naberezhnaya-kosmonavtov',
    'saratov-park-pobedy-na-sokolovoy-gore',
    'saratov-gorodskoy-sad-lipki',
    'saratov-avtodorozhnyy-most-saratov-engel-s',
    'saratov-konservatoriya-im-sobinova',
  ],
  indoorSlugs: [
    'saratov-hudozhestvennyy-muzey-radischeva',
    'saratov-oblastnoy-muzey-kraevedeniya',
    'saratov-teatr-opery-i-baleta',
    'saratov-gastrobar-kultura',
    'saratov-kofeynya-coupe',
  ],
  outdoorCta: 'Сухо: набережная Космонавтов, Липки или вид с моста',
  indoorCtaOvercast: 'Серо: Радищевский, краеведческий или кофе в «Coupe»',
  indoorCtaRain: 'Дождь: Радищевский, опера или гастробар «Культура»',
  indoorCtaSnow: 'Снег: музеи у Консерватории, потом калач в тепле',
};

export const SARATOV_SLIDES: CityIdentitySlide[] = [
  {
    id: 'sobinov-conservatory',
    title: 'Консерватория им. Собинова',
    text: 'Готические шпили и поющие горгульи в сердце Поволжья. Здание немецкого модерна задает тон проспекту Столыпина и транслирует статус Саратова как культурного центра макрорегиона.',
    imageSrc: '/images/venues/saratov/identity-symbol.jpg',
    imageAlt: 'Консерватория им. Собинова на проспекте Столыпина',
    slugs: [
      'saratov-konservatoriya-im-sobinova',
      'saratov-pamyatnik-garmoshke',
      'saratov-gorodskoy-sad-lipki',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'radischev-museum',
    title: 'Радищевский музей',
    text: 'Первый общедоступный художественный музей в Российской империи - «Поволжский Эрмитаж» с подлинниками от Рокотова и Брюллова до авангарда Малевича.',
    imageSrc: '/images/venues/saratov/identity-art.jpg',
    imageAlt: 'Саратовский художественный музей имени А. Н. Радищева',
    slugs: [
      'saratov-hudozhestvennyy-muzey-radischeva',
      'saratov-oblastnoy-muzey-kraevedeniya',
      'saratov-muzey-fedina',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'kalach-sterlyad',
    title: 'Саратовский калач и стерлядь',
    text: 'Калач, который возвращает форму при сдавливании, и волжская стерлядь с герба города. Сытная хлебная традиция, вяленая рыба и пирог с поволжскими яблоками.',
    imageSrc: '/images/venues/saratov/identity-gastro.jpg',
    imageAlt: 'Саратовский калач и волжская стерлядь',
    slugs: [
      'saratov-krytyy-rynok',
      'saratov-gastrobar-kultura',
      'saratov-restoran-odessa',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'saratov-bridge',
    title: 'Автодорожный мост Саратов-Энгельс',
    text: 'Почти трехкилометровый мост с узнаваемыми «горбами» - инженерный триумф 1965 года и главный романтический силуэт региона у закатов на Волге.',
    imageSrc: '/images/venues/saratov/identity-architecture.jpg',
    imageAlt: 'Автодорожный мост Саратов-Энгельс через Волгу',
    slugs: [
      'saratov-avtodorozhnyy-most-saratov-engel-s',
      'saratov-naberezhnaya-kosmonavtov',
      'saratov-park-pobedy-na-sokolovoy-gore',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];
