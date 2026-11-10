/** Izhevsk city and nearby destination hub pack. */
/* eslint-disable @typescript-eslint/no-explicit-any */

function place(
  name: string,
  desc: string,
  opts: {
    address: string;
    locationSlug?: string;
    venueSlug?: string;
    mustSeeFilter?: string;
    visitMinutes?: number | string;
    alsoMain?: boolean;
  },
): any {
  return {
    name,
    desc,
    address: opts.address,
    mustSeeFilter: opts.mustSeeFilter || 'main',
    visitMinutes: opts.visitMinutes ?? 30,
    ...(opts.locationSlug ? { locationSlug: opts.locationSlug } : {}),
    ...(opts.venueSlug ? { venueSlug: opts.venueSlug } : {}),
    ...(typeof opts.alsoMain === 'boolean' ? { alsoMain: opts.alsoMain } : {}),
  };
}

export const IZHEVSK_MUST_SEE: any[] = [
  place('Музейно-выставочный комплекс стрелкового оружия имени М. Т. Калашникова', 'Экспозиции об истории оружейного дела Ижевска и конструкторе Михаиле Калашникове.', {
    address: 'ул. Бородина, 19',
    venueSlug: 'izhevsk-muzey-strelkovogo-oruzhiya-imeni-m-t-kalashnikova',
    mustSeeFilter: 'museum',
    visitMinutes: 90,
    alsoMain: true,
  }),
  place('Ижевский пруд и набережная зодчего Дудина', 'Городской променад вдоль пруда от плотины к монументу Дружбы народов.', {
    address: 'набережная зодчего Дудина',
    locationSlug: 'izhevsk-izhevskiy-prud-i-naberezhnaya-zodchego-dudina',
    mustSeeFilter: 'views',
    visitMinutes: 60,
    alsoMain: true,
  }),
  place('Свято-Михайловский кафедральный собор', 'Собор на Красной горке, восстановленный в начале XXI века.', {
    address: 'ул. Карла Маркса, 222',
    locationSlug: 'izhevsk-svyato-mihaylovskiy-sobor',
    mustSeeFilter: 'temple',
    visitMinutes: 40,
    alsoMain: true,
  }),
  place('Зоопарк Удмуртии', 'Зоопарк в парке имени Кирова у Ижевского пруда.', {
    address: 'ул. Кирова, 8',
    locationSlug: 'izhevsk-zoopark-udmurtii',
    mustSeeFilter: 'park',
    visitMinutes: 120,
  }),
  place('Михайловская колонна', 'Колонна с фигурой архангела Михаила на Михайловской площади.', {
    address: 'Михайловская площадь',
    locationSlug: 'izhevsk-mihaylovskaya-kolonna',
    mustSeeFilter: 'monument',
    visitMinutes: 20,
  }),
  place('Памятник Ижику', 'Талисман Ижевска - мальчик-кафтанщик в цилиндре на Центральной площади.', {
    address: 'Центральная площадь, ул. Карла Маркса',
    locationSlug: 'izhevsk-pamyatnik-izhiku',
    mustSeeFilter: 'monument',
    visitMinutes: 15,
    alsoMain: true,
  }),
];

export const IZHEVSK_SUBURBS: any[] = [
  {
    ...place('Архитектурно-этнографический музей-заповедник «Лудорвай»', 'Музей под открытым небом примерно в 17 км от Ижевска. Здесь собраны усадьбы народов Удмуртии, русская усадьба и деревянная шатровая мельница.', {
      address: 'Завьяловский район, деревня Лудорвай',
      locationSlug: 'izhevsk-ludorvay',
      mustSeeFilter: 'museum',
      visitMinutes: 180,
    }),
    travelVector: 'Отдельная поездка из Ижевска; расстояние до музея - около 17 км.',
    timingNote: 'Перед выездом проверьте расписание музея и доступность общественного транспорта.',
    places: [
      { name: 'Усадьбы удмуртов', desc: 'Дома и хозяйственные постройки, показывающие традиционный уклад разных районов Удмуртии.' },
      { name: 'Русская усадьба', desc: 'Деревянные постройки русского сектора музея.' },
      { name: 'Шатровая ветряная мельница', desc: 'Один из заметных экспонатов музейной территории.' },
      { name: 'Родовое святилище', desc: 'Памятник традиционной культовой архитектуры удмуртов.' },
    ],
  },
];

export const IZHEVSK_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'izhevsk-city-center',
    title: 'Центр и оружейная история',
    description: 'Музей Калашникова, Михайловская площадь, Ижик и набережная пруда.',
    stops: [
      { name: 'Музейно-выставочный комплекс имени М. Т. Калашникова', venueSlug: 'izhevsk-muzey-strelkovogo-oruzhiya-imeni-m-t-kalashnikova' },
      { name: 'Михайловская колонна', locationSlug: 'izhevsk-mihaylovskaya-kolonna' },
      { name: 'Свято-Михайловский кафедральный собор', locationSlug: 'izhevsk-svyato-mihaylovskiy-sobor' },
      { name: 'Памятник Ижику', locationSlug: 'izhevsk-pamyatnik-izhiku' },
      { name: 'Набережная зодчего Дудина', locationSlug: 'izhevsk-izhevskiy-prud-i-naberezhnaya-zodchego-dudina' },
    ],
  },
  {
    id: 'izhevsk-ludorvay-day',
    title: 'День в «Лудорвае»',
    description: 'Загородный музейный день с традиционной архитектурой и этнографическими экспозициями.',
    travelVector: 'Около 17 км от Ижевска; заранее проверьте часы работы и дорогу.',
    stops: [
      { name: 'Музей-заповедник «Лудорвай»', locationSlug: 'izhevsk-ludorvay' },
    ],
  },
];

export const IZHEVSK_SIGHTS = [
  { title: 'Ижевский пруд и набережная', text: 'Главная водная панорама города и длинный променад у берега.', locationSlug: 'izhevsk-izhevskiy-prud-i-naberezhnaya-zodchego-dudina' },
  { title: 'Музей Калашникова', text: 'Музей об оружейном производстве Ижевска и Михаиле Калашникове.', venueSlug: 'izhevsk-muzey-strelkovogo-oruzhiya-imeni-m-t-kalashnikova' },
  { title: 'Свято-Михайловский собор', text: 'Храм на Красной горке, восстановленный по историческому образцу.', locationSlug: 'izhevsk-svyato-mihaylovskiy-sobor' },
  { title: 'Памятник Ижику', text: 'Мальчик-кафтанщик стал талисманом города.', locationSlug: 'izhevsk-pamyatnik-izhiku' },
  { title: 'Михайловская колонна', text: 'Колонна с фигурой архангела Михаила на Михайловской площади.', locationSlug: 'izhevsk-mihaylovskaya-kolonna' },
  { title: 'Зоопарк Удмуртии', text: 'Зоопарк в парке имени Кирова у Ижевского пруда.', locationSlug: 'izhevsk-zoopark-udmurtii' },
];

export const IZHEVSK_TRAVEL =
  'В Ижевске есть аэропорт и железнодорожный вокзал; перед поездкой сравните актуальные направления и расписания. Городские достопримечательности удобно объединить пешком в центре, а для поездки в «Лудорвай» заложите отдельный выезд примерно на 17 км от города. Проверьте часы работы музеев перед посещением.';

export const IZHEVSK_FAQ = [
  { q: 'Кто такой Ижик?', a: 'Это городской талисман - мальчик-кафтанщик в цилиндре. Бронзовую скульптуру открыли в 2010 году; для неё использовали ключи, собранные жителями.' },
  { q: 'Что посмотреть в Ижевске за один день?', a: 'Можно пройти по центру от музея Калашникова и Михайловской площади к Центральной площади и набережной Ижевского пруда.' },
  { q: 'Как добраться до «Лудорвая»?', a: 'Музей-заповедник находится примерно в 17 км от Ижевска. Это отдельный выезд; заранее проверьте расписание и варианты транспорта.' },
  { q: 'Подходит ли «Лудорвай» для зимней поездки?', a: 'Музей проводит сезонные мероприятия, но режим работы и доступность отдельных площадок меняются. Уточните условия на официальном сайте перед поездкой.' },
];
