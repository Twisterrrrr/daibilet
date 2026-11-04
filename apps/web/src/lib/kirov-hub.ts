/* Kirov tourist hub pack. Hyphen-only. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const KIROV_SUBURBS: any[] = [
  { name: 'Хлынов', desc: 'Древнее городище в 5 км от центра.', address: 'п. Хлынов', locationSlug: 'kirov-kirovskaya-oblast-hlynov', latitude: 58.6292, longitude: 49.6389, travelVector: 'Юг', travelVectorBlurb: 'Авто ~15 мин.', places: [
    { name: 'Хлыновское городище', desc: 'Поселение XIII века.', locationSlug: 'kirov-kirovskaya-oblast-hlynovskoe-gorodische', latitude: 58.6295, longitude: 49.6392 },
  ]},
  { name: 'Котельнич', desc: 'Палеонтология в 120 км.', address: 'г. Котельнич', locationSlug: 'kirov-kirovskaya-oblast-kotelnich', latitude: 58.3089, longitude: 48.3481, travelVector: 'Юго-запад', travelVectorBlurb: 'Авто ~2 ч.', places: [
    { name: 'Местонахождение парейазавров', desc: 'Палеонтологическое место.', locationSlug: 'kirov-kirovskaya-oblast-kotelnicheskoe-pariazavry', latitude: 58.3092, longitude: 48.3485 },
  ]},
];
export const KIROV_DAY_ROUTE_PRESETS: any[] = [
  { id: 'kirov-classic', title: 'Классическая Вятка', description: 'Набережная, Спасская, сад, монастырь.', travelVector: 'Пешком, 3-4 ч.', stops: [
    { name: 'Набережная Грина', desc: 'Панорама Вятки.', locationSlug: 'kirov-kirovskaya-oblast-naberezhnaya-grina', visitMinutes: 40 },
    { name: 'Улица Спасская', desc: 'Вятский Арбат.', locationSlug: 'kirov-kirovskaya-oblast-ulitsa-spasskaya-vyatskiy-arbat', visitMinutes: 60 },
    { name: 'Трифонов монастырь', desc: 'Обитель XVI века.', locationSlug: 'kirov-kirovskaya-oblast-svyato-uspenskiy-trifonov-muzhskoy-monastyr', visitMinutes: 60 },
  ]},
  { id: 'kirov-museums', title: 'Музеи и дымка', description: 'Палеонтология и игрушки.', travelVector: 'Пешком + такси.', stops: [
    { name: 'Палеонтологический музей', desc: 'Парейазавры.', venueSlug: 'kirov-kirovskaya-oblast-vyatskiy-paleontologicheskiy-muzey', visitMinutes: 90 },
    { name: 'Музей дымковской игрушки', desc: 'Мастер-класс.', venueSlug: 'kirov-kirovskaya-oblast-muzey-dymkovskoy-igrushki', visitMinutes: 60 },
  ]},
];

export const KIROV_MUST_SEE: any[] = [
  { name: 'Набережная Грина', desc: 'Променад на берегу Вятки.', locationSlug: 'kirov-kirovskaya-oblast-naberezhnaya-grina', mustSeeFilter: 'main', visitMinutes: 40, latitude: 58.6048, longitude: 49.6722 },
  { name: 'Улица Спасская', desc: 'Вятский Арбат.', locationSlug: 'kirov-kirovskaya-oblast-ulitsa-spasskaya-vyatskiy-arbat', mustSeeFilter: 'street', visitMinutes: 60, latitude: 58.6015, longitude: 49.6685 },
  { name: 'Александровский сад', desc: 'Парк 1835 года.', locationSlug: 'kirov-kirovskaya-oblast-aleksandrovskiy-sad', mustSeeFilter: 'park', visitMinutes: 40, latitude: 58.6028, longitude: 49.6652 },
  { name: 'Палеонтологический музей', desc: 'Парейазавры.', venueSlug: 'kirov-kirovskaya-oblast-vyatskiy-paleontologicheskiy-muzey', mustSeeFilter: 'museum', visitMinutes: 90, latitude: 58.6035, longitude: 49.6648 },
  { name: 'Трифонов монастырь', desc: 'Обитель XVI века.', locationSlug: 'kirov-kirovskaya-oblast-svyato-uspenskiy-trifonov-muzhskoy-monastyr', mustSeeFilter: 'temple', visitMinutes: 60, latitude: 58.6088, longitude: 49.6715 },
  { name: 'Заповедник сказок', desc: 'Парк Кикиморы.', locationSlug: 'kirov-kirovskaya-oblast-zapovednik-skazok', mustSeeFilter: 'park', visitMinutes: 90, latitude: 58.6125, longitude: 49.6588 },
  { name: 'Музей дымковской игрушки', desc: 'Мастер-класс.', venueSlug: 'kirov-kirovskaya-oblast-muzey-dymkovskoy-igrushki', mustSeeFilter: 'museum', visitMinutes: 60, latitude: 58.6012, longitude: 49.6692 },
  { name: 'Краеведческий музей', desc: 'История Вятки.', venueSlug: 'kirov-kirovskaya-oblast-kirovskiy-krayevedcheskiy-muzey', mustSeeFilter: 'museum', visitMinutes: 90, latitude: 58.6022, longitude: 49.6678 },
  { name: 'Музей истории города', desc: 'Особняк Рязанцева.', venueSlug: 'kirov-kirovskaya-oblast-muzey-istorii-goroda-kirova', mustSeeFilter: 'museum', visitMinutes: 60, latitude: 58.6018, longitude: 49.6695 },
  { name: 'Дом-музей А. С. Грина', desc: 'Музей писателя.', venueSlug: 'kirov-kirovskaya-oblast-dom-muzey-a-s-grina', mustSeeFilter: 'museum', visitMinutes: 45, latitude: 58.6042, longitude: 49.6718 },
  { name: 'Музей вятского пряника', desc: 'Дегустация.', venueSlug: 'kirov-kirovskaya-oblast-muzey-vyatskogo-pryanika', mustSeeFilter: 'museum', visitMinutes: 45, latitude: 58.6008, longitude: 49.6688 },
  { name: 'Успенский собор', desc: 'Древнейшее здание.', locationSlug: 'kirov-kirovskaya-oblast-uspenskiy-trifonov-sobor', mustSeeFilter: 'temple', visitMinutes: 30, latitude: 58.6085, longitude: 49.6712 },
  { name: 'Площадь Ленина', desc: 'Фонтаны.', locationSlug: 'kirov-kirovskaya-oblast-ploschad-lenina', mustSeeFilter: 'main', visitMinutes: 20, latitude: 58.6038, longitude: 49.6695 },
  { name: 'Улица Володарского', desc: 'Особняки XIX века.', locationSlug: 'kirov-kirovskaya-oblast-ulitsa-volodarskogo', mustSeeFilter: 'street', visitMinutes: 30, latitude: 58.6028, longitude: 49.6668 },
  { name: 'Парк имени Кирова', desc: 'Аттракционы.', locationSlug: 'kirov-kirovskaya-oblast-park-im-kirova', mustSeeFilter: 'park', visitMinutes: 60, latitude: 58.6075, longitude: 49.6588 },
  { name: 'Театр драмы им. Писарева', desc: 'Старейший театр.', venueSlug: 'kirov-kirovskaya-oblast-teatr-dramy-pisareva', mustSeeFilter: 'main', visitMinutes: 120, latitude: 58.6032, longitude: 49.6662 },
  { name: 'Филармония Вятки', desc: 'Органный зал.', venueSlug: 'kirov-kirovskaya-oblast-filarmoniya-vyatki', mustSeeFilter: 'main', visitMinutes: 120, latitude: 58.6028, longitude: 49.6648 },
  { name: 'Хлыновское городище', desc: 'Поселение XIII века.', locationSlug: 'kirov-kirovskaya-oblast-hlynovskoe-gorodische', mustSeeFilter: 'views', visitMinutes: 60, latitude: 58.6295, longitude: 49.6392 },
  { name: 'Дымковская слобода', desc: 'Родина игрушки.', locationSlug: 'kirov-kirovskaya-oblast-dymkovskaya-sloboda', mustSeeFilter: 'creative', visitMinutes: 45, latitude: 58.5985, longitude: 49.6725 },
  { name: 'Кировский мост', desc: 'Вид на набережную.', locationSlug: 'kirov-kirovskaya-oblast-kirovskiy-most', mustSeeFilter: 'views', visitMinutes: 15, latitude: 58.6055, longitude: 49.6735 },
];

export const KIROV_FAQ: Array<{ q: string; a: string }> = [
  { q: 'Где купить дымковскую игрушку?', a: 'В Музее дымковской игрушки на Спасской или в Дымковской слободе.' },
  { q: 'Как добраться из Москвы?', a: 'Перелёт — 1,5-2 часа. Поезд «Вятка» — 12 часов.' },
  { q: 'Когда ехать?', a: 'Лето (июнь-август). Зимой — Заповедник сказок.' },
];

export const KIROV_TRAVEL =
  'Прямой перелёт из Москвы в аэропорт Победилово — 1,5-2 часа. Поезд «Вятка» — 12 часов. Лучшее время — лето (июнь-август).';