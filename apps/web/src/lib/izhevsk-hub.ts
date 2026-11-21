/** Editorial city and nearby-destination hub for Izhevsk. */

type Filter =
  | 'main'
  | 'gastro'
  | 'museum'
  | 'views'
  | 'park'
  | 'temple'
  | 'monument'
  | 'houses';

type PlaceOptions = {
  address: string;
  filter?: Filter;
  minutes?: number | string;
  slug?: string;
  slugType?: 'location' | 'venue';
  id?: string;
  lat?: number;
  lng?: number;
  image?: string;
  credit?: { author: string; sourceUrl: string; license: string; licenseUrl: string };
  main?: boolean;
};

const image = (name: string) => `/images/venues/izhevsk/${name}.jpg`;
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const ccBySa4 = 'https://creativecommons.org/licenses/by-sa/4.0/';
const ccBySa3 = 'https://creativecommons.org/licenses/by-sa/3.0/';

function place(name: string, desc: string, options: PlaceOptions) {
  return {
    name,
    desc,
    address: options.address,
    mustSeeFilter: options.filter || 'main',
    visitMinutes: options.minutes ?? 30,
    ...(options.slug && options.slugType === 'location' ? { locationSlug: options.slug } : {}),
    ...(options.slug && options.slugType === 'venue' ? { venueSlug: options.slug } : {}),
    ...(options.id ? { dayRouteId: options.id } : {}),
    ...(options.lat != null ? { latitude: options.lat } : {}),
    ...(options.lng != null ? { longitude: options.lng } : {}),
    ...(options.image ? { imageUrl: image(options.image) } : {}),
    ...(options.credit ? { imageCredit: options.credit } : {}),
    ...(options.main ? { alsoMain: true } : {}),
  };
}

export const IZHEVSK_MUST_SEE = [
  place('Музейно-выставочный комплекс имени М. Т. Калашникова', 'Экспозиция об истории оружейного дела и конструкторе Михаиле Калашникове. Время работы и доступность экспозиций уточняйте перед визитом.', {
    address: 'ул. Бородина, 19', slugType: 'venue', slug: 'izhevsk-muzey-strelkovogo-oruzhiya-imeni-m-t-kalashnikova', filter: 'museum', minutes: 90, main: true, image: 'muzey-strelkovogo-oruzhiya-imeni-m-t-kalashnikova', credit: { author: 'Vyacheslav Bukharov', sourceUrl: commons('Kalashnikov_Museum_and_Exhibition_Complex_of_Small_Arms.jpg'), license: 'CC BY-SA 4.0', licenseUrl: ccBySa4 },
  }),
  place('Ижевский пруд и набережная зодчего Дудина', 'Набережная вдоль городского пруда; после недавнего обновления проверяйте открытые участки и условия прохода на месте.', {
    address: 'набережная зодчего Дудина', slugType: 'location', slug: 'izhevsk-izhevskiy-prud-i-naberezhnaya-zodchego-dudina', filter: 'views', minutes: 60, main: true, image: 'izhevskiy-prud-i-naberezhnaya-zodchego-dudina', credit: { author: 'Vyacheslav Bukharov', sourceUrl: commons('Zodchego_Dudina_Embankment_(September_2022)_-_1.jpg'), license: 'CC BY-SA 4.0', licenseUrl: ccBySa4 },
  }),
  place('Свято-Михайловский кафедральный собор', 'Кафедральный собор на Красной горке; для посещения действуют правила прихода.', {
    address: 'ул. Карла Маркса, 222', slugType: 'location', slug: 'izhevsk-svyato-mihaylovskiy-sobor', filter: 'temple', minutes: 40, main: true, image: 'svyato-mihaylovskiy-sobor', credit: { author: 'Vyacheslav Bukharov', sourceUrl: commons('%D0%A1%D0%B2%D1%8F%D1%82%D0%BE-%D0%9C%D0%B8%D1%85%D0%B0%D0%B9%D0%BB%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%D1%81%D0%BE%D0%B1%D0%BE%D1%80_(%D0%98%D0%B6%D0%B5%D0%B2%D1%81%D0%BA).jpg'), license: 'CC BY-SA 4.0', licenseUrl: ccBySa4 },
  }),
  place('Зоопарк Удмуртии', 'Зоопарк в парке Кирова у Ижевского пруда. Перед поездкой проверьте актуальное расписание.', {
    address: 'ул. Кирова, 8', slugType: 'location', slug: 'izhevsk-zoopark-udmurtii', filter: 'park', minutes: 120, image: 'zoopark-udmurtii', credit: { author: 'Vyacheslav Bukharov', sourceUrl: commons('Izhevsk_Zoo.jpg'), license: 'CC BY-SA 4.0', licenseUrl: ccBySa4 },
  }),
  place('Михайловская колонна', 'Колонна с фигурой архангела Михаила на площади Оружейников.', {
    address: 'площадь Оружейников', slugType: 'location', slug: 'izhevsk-mihaylovskaya-kolonna', filter: 'monument', minutes: 20, image: 'mihaylovskaya-kolonna', credit: { author: 'Vyacheslav Bukharov', sourceUrl: commons('Aerial_photographs_of_Izhevsk-45.jpg'), license: 'CC BY-SA 4.0', licenseUrl: ccBySa4 },
  }),
  place('Ижик', 'Бронзовый мальчик-оружейник в кафтане и цилиндре — талисман Ижевска на Центральной площади.', {
    address: 'Центральная площадь', slugType: 'location', slug: 'izhevsk-pamyatnik-izhiku', filter: 'monument', minutes: 15, main: true, image: 'pamyatnik-izhiku', credit: { author: 'Yan.gorev', sourceUrl: commons('%D0%A1%D0%BA%D1%83%D0%BB%D1%8C%D0%BF%D1%82%D1%83%D1%80%D0%B0_%22%D0%98%D0%B6%D0%B8%D0%BA%22.jpg'), license: 'CC BY-SA 4.0', licenseUrl: ccBySa4 },
  }),
  place('Монумент «Дружба народов»', 'Монумент на склоне у Ижевского пруда, посвящённый дружбе удмуртского и русского народов.', {
    address: 'ул. Милиционная / ул. Горького', id: 'izhevsk-druzhba-narodov', lat: 56.851944, lng: 53.196944, filter: 'monument', minutes: 25, main: true, image: 'druzhba-narodov', credit: { author: 'Vyacheslav Bukharov', sourceUrl: commons('Forever_with_Russia_monument,_Izhevsk-12.jpg'), license: 'CC BY-SA 4.0', licenseUrl: ccBySa4 },
  }),
  place('Памятник ижевским оружейникам', 'Скульптурная композиция, посвящённая мастерам Ижевского оружейного завода; находится на площади Оружейников.', {
    address: 'площадь Оружейников', id: 'izhevsk-gunsmiths-monument', lat: 56.84392, lng: 53.19755, filter: 'monument', minutes: 20, image: 'gunsmiths', credit: { author: 'Bayerniko', sourceUrl: commons('Monument_to_Izhevsk_Armourers.JPG'), license: 'CC BY-SA 3.0', licenseUrl: ccBySa3 },
  }),
  place('Памятник ижевскому крокодилу', 'Городская скульптура на пересечении улиц Советской и Коммунаров.', {
    address: 'пересечение ул. Советской и Коммунаров', id: 'izhevsk-crocodile', lat: 56.846238, lng: 53.219544, filter: 'monument', minutes: 15, image: 'crocodile', credit: { author: 'Yan.gorev', sourceUrl: commons('%D0%A1%D0%BA%D1%83%D0%BB%D1%8C%D0%BF%D1%82%D1%83%D1%80%D0%B0_%22%D0%9A%D1%80%D0%BE%D0%BA%D0%BE%D0%B4%D0%B8%D0%BB%22_%D0%B2_%D0%98%D0%B6%D0%B5%D0%B2%D1%81%D0%BA%D0%B5._01.jpg'), license: 'CC BY-SA 4.0', licenseUrl: ccBySa4 },
  }),
  place('Памятник собаке-космонавту Звёздочке', 'Скульптура «Проложившим дорогу в космос» в сквере у дома № 34 по Молодёжной улице.', {
    address: 'ул. Молодёжная, 34', id: 'izhevsk-zvezdochka', lat: 56.850017, lng: 53.290348, filter: 'monument', minutes: 15, image: 'zvezdochka', credit: { author: 'Yan.gorev', sourceUrl: commons('%D0%97%D0%B2%D1%91%D0%B7%D0%B4%D0%BE%D1%87%D0%BA%D0%B0.jpg'), license: 'CC BY-SA 3.0', licenseUrl: ccBySa3 },
  }),
  place('Бюст Андрея Дерябина', 'Памятник основателю Ижевского оружейного завода у плотины.', {
    address: 'проезд Дерябина', id: 'izhevsk-deryabin-bust', lat: 56.844519, lng: 53.191218, filter: 'monument', minutes: 15, image: 'pamyatnik-deryabinu', credit: { author: 'Yan.gorev', sourceUrl: commons('%D0%91%D1%8E%D1%81%D1%82_%D0%90.%D0%A4.%D0%94%D0%B5%D1%80%D1%8F%D0%B1%D0%B8%D0%BD%D0%B0_%D0%B2_%D0%98%D0%B6%D0%B5%D0%B2%D1%81%D0%BA%D0%B5_02.jpg'), license: 'CC BY-SA 4.0', licenseUrl: ccBySa4 },
  }),
  place('Памятник пельменю', 'Небольшая городская скульптура у кафе «Позимь»; не утверждаем, что именно Ижевск — место происхождения пельменей.', {
    address: 'ул. Владимира Краева, 35а', id: 'izhevsk-pelmen', lat: 56.84226, lng: 53.234487, filter: 'gastro', minutes: 15, image: 'pamyatnik-pelmenu', credit: { author: 'Yan.gorev', sourceUrl: commons('%D0%9F%D0%B0%D0%BC%D1%8F%D1%82%D0%BD%D0%B8%D0%BA_%D0%BF%D0%B5%D0%BB%D1%8C%D0%BC%D0%B5%D0%BD%D1%8E_%D0%B2_%D0%98%D0%B6%D0%B5%D0%B2%D1%81%D0%BA%D0%B5.jpg'), license: 'CC BY-SA 4.0', licenseUrl: ccBySa4 },
  }),
];

export const IZHEVSK_SUBURBS = [
  {
    ...place('Архитектурно-этнографический музей-заповедник «Лудорвай»', 'Музей под открытым небом примерно в 17 км от Ижевска: усадьбы удмуртов и бесермян, русский сектор и ветряная мельница.', {
      address: 'Завьяловский район, музей-заповедник «Лудорвай»', slugType: 'location', slug: 'izhevsk-ludorvay', filter: 'museum', minutes: 180, lat: 56.747, lng: 53.056, image: 'ludorvay',
    }),
    travelVector: 'Отдельная загородная поездка примерно в 17 км от Ижевска.',
    timingNote: 'Проверьте расписание музея и доступность транспорта перед выездом.',
    places: [
      { name: 'Усадьбы удмуртов и бесермян', desc: 'Деревянные жилые и хозяйственные постройки, собранные в тематических секторах музея.' },
      { name: 'Русский сектор и шатровая мельница', desc: 'Постройки русского сектора и деревянная ветряная мельница.' },
      { name: 'Пасечный комплекс «Муштор»', desc: 'Отдельный сектор музейной территории.' },
    ],
  },
];

const editorialStop = (name: string, slug: string) => {
  const item = IZHEVSK_MUST_SEE.find((place) => place.dayRouteId === slug || place.locationSlug === slug || place.venueSlug === slug);
  return item ? { ...item } : { name, desc: name };
};

export const IZHEVSK_DAY_ROUTE_PRESETS = [
  {
    id: 'izhevsk-city-center',
    title: 'Оружейный центр и набережная',
    description: 'Музей Калашникова, историческая площадь Оружейников, Ижик и набережная пруда.',
    stops: [
      editorialStop('Музей Калашникова', 'izhevsk-muzey-strelkovogo-oruzhiya-imeni-m-t-kalashnikova'),
      editorialStop('Михайловская колонна', 'izhevsk-mihaylovskaya-kolonna'),
      editorialStop('Памятник ижевским оружейникам', 'izhevsk-gunsmiths-monument'),
      editorialStop('Ижик', 'izhevsk-pamyatnik-izhiku'),
      editorialStop('Ижевский пруд и набережная зодчего Дудина', 'izhevsk-izhevskiy-prud-i-naberezhnaya-zodchego-dudina'),
    ],
  },
  {
    id: 'izhevsk-museums-and-architecture',
    title: 'Оружейная история и архитектура',
    description: 'Музей оружейного дела, Свято-Михайловский собор, Михайловская колонна и памятник Андрею Дерябину.',
    stops: [
      editorialStop('Музей Калашникова', 'izhevsk-muzey-strelkovogo-oruzhiya-imeni-m-t-kalashnikova'),
      editorialStop('Свято-Михайловский кафедральный собор', 'izhevsk-svyato-mihaylovskiy-sobor'),
      editorialStop('Михайловская колонна', 'izhevsk-mihaylovskaya-kolonna'),
      editorialStop('Бюст Андрея Дерябина', 'izhevsk-deryabin-bust'),
    ],
  },
  {
    id: 'izhevsk-ludorvay-day',
    title: 'Загородный день в «Лудорвае»',
    description: 'Музей под открытым небом с деревянными усадьбами разных культур Удмуртии.',
    travelVector: 'Около 17 км от Ижевска; проверьте часы работы и варианты дороги перед выездом.',
    stops: [{ ...IZHEVSK_SUBURBS[0] }],
  },
];

export const IZHEVSK_SIGHTS = [
  { title: 'Ижевский пруд и набережная', text: 'Променад вдоль городского пруда.', locationSlug: 'izhevsk-izhevskiy-prud-i-naberezhnaya-zodchego-dudina' },
  { title: 'Музей Калашникова', text: 'Экспозиция об оружейном деле и Михаиле Калашникове.', venueSlug: 'izhevsk-muzey-strelkovogo-oruzhiya-imeni-m-t-kalashnikova' },
  { title: 'Свято-Михайловский собор', text: 'Кафедральный собор на Красной горке.', locationSlug: 'izhevsk-svyato-mihaylovskiy-sobor' },
  { title: 'Ижик', text: 'Бронзовый мальчик-оружейник — городской талисман.', locationSlug: 'izhevsk-pamyatnik-izhiku' },
  { title: 'Михайловская колонна', text: 'Монументальная колонна на площади Оружейников.', locationSlug: 'izhevsk-mihaylovskaya-kolonna' },
];

export const IZHEVSK_TRAVEL =
  'В Ижевске есть аэропорт и железнодорожный вокзал; перед поездкой проверьте актуальные направления и расписания. Городские места можно объединить прогулкой по центру и набережной. «Лудорвай» расположен примерно в 17 км от города и требует отдельного выезда. Расписание музеев и доступность объектов уточняйте перед посещением.';

export const IZHEVSK_FAQ = [
  { q: 'Кто такой Ижик?', a: 'Ижик — бронзовый мальчик-оружейник в кафтане и цилиндре, талисман Ижевска на Центральной площади.' },
  { q: 'Что посмотреть в Ижевске за один день?', a: 'Начните с музея Калашникова и площади Оружейников, затем пройдите к Центральной площади и Ижевскому пруду.' },
  { q: 'Как добраться до «Лудорвая»?', a: 'Музей-заповедник находится примерно в 17 км от Ижевска. Это отдельная поездка; актуальные расписание и транспорт проверьте перед выездом.' },
  { q: 'Открыт ли Генеральский дом?', a: 'По информации Музея города Ижевска, площадка временно закрыта; проверьте статус перед планированием визита.' },
];
