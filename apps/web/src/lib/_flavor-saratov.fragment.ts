/**
 * Saratov flavor fragment for later merge into city-hub-local-flavor.ts.
 * Hyphen-only copy. Do not import from cityInfo / other hubs here.
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
  outdoorCta: 'Отличная погода для набережной, Липок и прогулки к мосту',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в Радищевский музей, краеведческий или «Coupe»',
  indoorCtaRain: 'Сегодня дождь. Радищевский музей, опера или гастробар «Культура»',
  indoorCtaSnow: 'Сегодня снег. Музеи центра и калач после прогулки к Консерватории',
};

export const SARATOV_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Saratov',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Русская зима с замерзшей Волгой и сугробами. На Хвалынском курорте - горнолыжный сезон. Коньки на стадионе «Динамо» у готического корпуса СГАУ.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В марте Волга сбрасывает лед, к маю город цветет каштанами и сиренью при комфортных +18 °C. Открывается навигация теплоходов. В мае - цветение диких пионов в степях.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Пик внутреннего туризма: воздух до +30 °C, песчаные острова и Городские пески. Ночные сапы под Саратовским мостом и гастротуры за стерлядью.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Сентябрь: мягкое бабье лето (+20 °C), арбузы, яблоки и раки. В октябре золотеет Кумысная поляна. Ноябрь - музеи и старейшие театры.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В марте Волга с шумом сбрасывает лед, а к маю город зацветает каштанами и сиренью при комфортных +18 °C. Логистика оживает, открывается навигация для речных прогулочных теплоходов. Главное событие - майское цветение диких пионов в саратовских степях.',
    summer:
      'Пик внутреннего туризма и волжский курортный шик. Воздух прогревается до +30 °C, а песчаные острова и пляжи Городских песков заполняются людьми. Главные фишки - ночные прогулки на сапах под Саратовским мостом и гастротуры за местной стерлядью.',
    autumn:
      'Сентябрь радует мягким бабьим летом (+20 °C) и изобилием поволжских арбузов, яблок и раков. В октябре вековой кумысный лес окрашивается в золото. Ноябрь - идеальный месяц для культурного туризма по музеям и старейшим театрам.',
    winter:
      'Время настоящей русской зимы с замерзшей Волгой и сугробами. Город превращается в уютную купеческую сказку, а на Хвалынском курорте в области стартует горнолыжный сезон. Главная фишка - катание на коньках на старейшем стадионе «Динамо» у стен готического корпуса СГАУ.',
  }),
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
