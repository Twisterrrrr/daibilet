/* Kirov tourist hub pack. Hyphen-only. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const KIROV_SUBURBS: any[] = [
  { name: 'Котельнич', desc: 'Город и палеонтологическое местонахождение примерно в 120 км от Кирова.', address: 'г. Котельнич', locationSlug: 'kirov-kirovskaya-oblast-kotelnich', latitude: 58.3089, longitude: 48.3481, travelVector: 'Юго-запад', travelVectorBlurb: 'Планируйте отдельную поездку; дорогу и расписание проверьте перед выездом.', places: [
    { name: 'Котельничское местонахождение парейазавров', desc: 'Палеонтологическое местонахождение на берегу Вятки.', locationSlug: 'kirov-kirovskaya-oblast-kotelnicheskoe-pariazavry', latitude: 58.3092, longitude: 48.3485 },
  ]},
];

export const KIROV_DAY_ROUTE_PRESETS: any[] = [
  { id: 'kirov-classic', title: 'Исторический центр Вятки', description: 'Набережная, Спасская улица и Трифонов монастырь.', travelVector: 'Пешком, продолжительность зависит от остановок.', stops: [
    { name: 'Набережная Грина', desc: 'Прогулка у реки Вятки.', locationSlug: 'kirov-kirovskaya-oblast-naberezhnaya-grina', visitMinutes: 40 },
    { name: 'Улица Спасская', desc: 'Историческая улица в центре Кирова.', locationSlug: 'kirov-kirovskaya-oblast-ulitsa-spasskaya-vyatskiy-arbat', visitMinutes: 45 },
    { name: 'Свято-Успенский Трифонов монастырь', desc: 'Монастырский ансамбль XVI века.', locationSlug: 'kirov-kirovskaya-oblast-svyato-uspenskiy-trifonov-muzhskoy-monastyr', visitMinutes: 45 },
  ]},
  { id: 'kirov-museums', title: 'Дымковская игрушка и пермская фауна', description: 'Два музея с коллекциями, связанными с историей Вятского края.', travelVector: 'Пешком и на городском транспорте.', stops: [
    { name: 'Вятский палеонтологический музей', desc: 'Коллекция ископаемых, связанных с местонахождением у Котельнича.', venueSlug: 'kirov-kirovskaya-oblast-vyatskiy-paleontologicheskiy-muzey', visitMinutes: 60 },
    { name: 'Музей «Дымковская игрушка: история и современность»', desc: 'Экспозиция дымковской игрушки.', venueSlug: 'kirov-kirovskaya-oblast-muzey-dymkovskoy-igrushki', visitMinutes: 45 },
  ]},
];

export const KIROV_MUST_SEE: any[] = [
  { name: 'Набережная Грина', desc: 'Городской променад вдоль Вятки.', locationSlug: 'kirov-kirovskaya-oblast-naberezhnaya-grina', mustSeeFilter: 'main', visitMinutes: 40, latitude: 58.6048, longitude: 49.6722 },
  { name: 'Улица Спасская', desc: 'Историческая улица в центре города.', locationSlug: 'kirov-kirovskaya-oblast-ulitsa-spasskaya-vyatskiy-arbat', mustSeeFilter: 'street', visitMinutes: 45, latitude: 58.6015, longitude: 49.6685 },
  { name: 'Александровский сад', desc: 'Городской сад, основанный в XIX веке.', locationSlug: 'kirov-kirovskaya-oblast-aleksandrovskiy-sad', mustSeeFilter: 'park', visitMinutes: 40, latitude: 58.6028, longitude: 49.6652 },
  { name: 'Вятский палеонтологический музей', desc: 'Музей знакомит с ископаемой фауной Пермского периода и находками Котельничского местонахождения.', venueSlug: 'kirov-kirovskaya-oblast-vyatskiy-paleontologicheskiy-muzey', mustSeeFilter: 'museum', visitMinutes: 60, latitude: 58.6035, longitude: 49.6648 },
  { name: 'Свято-Успенский Трифонов монастырь', desc: 'Монастырский ансамбль, основанный в XVI веке.', locationSlug: 'kirov-kirovskaya-oblast-svyato-uspenskiy-trifonov-muzhskoy-monastyr', mustSeeFilter: 'temple', visitMinutes: 45, latitude: 58.6088, longitude: 49.6715 },
  { name: 'Парк «Заповедник сказок»', desc: 'Интерактивный парк в лесной зоне Кирова. Программы и доступность уточняйте перед поездкой.', locationSlug: 'kirov-kirovskaya-oblast-zapovednik-skazok', mustSeeFilter: 'park', visitMinutes: 90, latitude: 58.6125, longitude: 49.6588 },
  { name: 'Музей «Дымковская игрушка: история и современность»', desc: 'Экспозиция посвящена промыслу дымковской игрушки. Музей находится на улице Свободы, 67.', venueSlug: 'kirov-kirovskaya-oblast-muzey-dymkovskoy-igrushki', mustSeeFilter: 'museum', visitMinutes: 45, latitude: 58.6012, longitude: 49.6692 },
];

export const KIROV_FAQ: Array<{ q: string; a: string }> = [
  { q: 'Где в Кирове посмотреть дымковскую игрушку?', a: 'В музее «Дымковская игрушка: история и современность» на улице Свободы, 67. Перед посещением проверьте режим работы и запись на экскурсию.' },
  { q: 'Где увидеть находки Котельничского местонахождения?', a: 'Вятский палеонтологический музей находится на улице Спасской, 22. Для поездки к самому местонахождению у Котельнича планируйте отдельный маршрут.' },
  { q: 'Когда лучше ехать в Киров?', a: 'Выбирайте сезон по планам: для прогулок по городу удобны тёплые месяцы, а музеи можно включить в маршрут в любое время года. Уточняйте график конкретных площадок.' },
];

export const KIROV_TRAVEL =
  'В Киров можно добраться поездом или самолётом. Маршруты, расписание и доступность рейсов меняются, поэтому проверяйте их перед покупкой билетов. Для поездки по городу отдельно проверьте часы работы музеев и парков.';
