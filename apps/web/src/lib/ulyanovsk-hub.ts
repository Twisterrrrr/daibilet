/* Curated Ulyanovsk city hub. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const ULYANOVSK_SUBURBS: any[] = [
  {
    name: 'Сенгилей',
    desc: 'Небольшой город на берегу Куйбышевского водохранилища, примерно в 70 км к югу от Ульяновска.',
    address: 'г. Сенгилей',
    locationSlug: 'ulyanovsk-sengiley',
    latitude: 53.9622,
    longitude: 48.7944,
    travelVector: 'Юг',
    travelVectorBlurb: 'Авто около 1–1,5 ч.; уточните маршрут перед поездкой.',
    places: [
      { name: 'Набережная Сенгилея', desc: 'Прогулка у воды и виды на водохранилище.', locationSlug: 'ulyanovsk-naberezhnaya-sengileya', latitude: 53.9615, longitude: 48.7928 },
      { name: 'Государев овраг', desc: 'Природная прогулочная точка в окрестностях Сенгилея; состояние троп и доступность лучше уточнить на месте.', locationSlug: 'ulyanovsk-gosudarev-ovrag', latitude: 53.9588, longitude: 48.7872 },
    ],
  },
];

export const ULYANOVSK_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'ulyanovsk-classic',
    title: 'Симбирск и Новый Венец',
    description: 'Исторический квартал, Ленинский мемориал и прогулка над Волгой.',
    travelVector: 'Пешком, около 3–4 ч.',
    stops: [
      { name: 'Музей-заповедник «Родина В. И. Ленина»', desc: 'Историческая застройка Симбирска.', venueSlug: 'ulyanovsk-muzey-zapovednik-rodina-v-i-lenina', visitMinutes: 90 },
      { name: 'Ленинский мемориал', desc: 'Мемориальный комплекс на площади Ленина.', locationSlug: 'ulyanovsk-leninskiy-memorial', visitMinutes: 60 },
      { name: 'Бульвар Новый Венец', desc: 'Пешеходный бульвар с видом на Волгу.', locationSlug: 'ulyanovsk-bul-var-novyy-venets', visitMinutes: 40 },
    ],
  },
  {
    id: 'ulyanovsk-aviation',
    title: 'Музей гражданской авиации',
    description: 'Отдельная поездка к аэродрому-музею в Заволжье; это не пешая часть центра.',
    travelVector: 'Такси или автомобиль; проверьте режим работы и доступ.',
    stops: [
      { name: 'Головной отраслевой музей истории гражданской авиации', desc: 'Самолёты и вертолёты под открытым небом.', venueSlug: 'ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii', visitMinutes: 120 },
    ],
  },
];

export const ULYANOVSK_MUST_SEE: any[] = [
  { name: 'Бульвар Новый Венец', desc: 'Пешеходный бульвар на высоком берегу Волги с видом на Куйбышевское водохранилище.', locationSlug: 'ulyanovsk-bul-var-novyy-venets', mustSeeFilter: 'main', visitMinutes: 40, latitude: 54.318542, longitude: 48.406944 },
  { name: 'Музей-заповедник «Родина В. И. Ленина»', desc: 'Исторический квартал с деревянной и каменной застройкой старого Симбирска.', venueSlug: 'ulyanovsk-muzey-zapovednik-rodina-v-i-lenina', mustSeeFilter: 'museum', alsoMain: true, visitMinutes: 90, latitude: 54.312995, longitude: 48.386516 },
  { name: 'Ленинский мемориал', desc: 'Мемориальный комплекс советской архитектуры на площади Ленина.', locationSlug: 'ulyanovsk-leninskiy-memorial', mustSeeFilter: 'main', visitMinutes: 60, latitude: 54.318056, longitude: 48.405556 },
  { name: 'Музей гражданской авиации', desc: 'Открытая экспозиция авиационной техники у аэропорта Баратаевка; поездку и часы доступа стоит проверить заранее.', venueSlug: 'ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii', mustSeeFilter: 'museum', alsoMain: true, visitMinutes: 120, latitude: 54.290124, longitude: 48.232812 },
  { name: 'Памятник букве «Ё»', desc: 'Гранитный памятник установлен у здания областной научной библиотеки.', locationSlug: 'ulyanovsk-pamyatnik-bukve-e', mustSeeFilter: 'monument', alsoMain: true, visitMinutes: 15, latitude: 54.316944, longitude: 48.404722 },
  { name: 'Дворец книги', desc: 'Областная научная библиотека в историческом здании бывшего Дворянского собрания.', venueSlug: 'dvorec-knigi', mustSeeFilter: 'main', visitMinutes: 30, latitude: 54.316468, longitude: 48.405999 },
  { name: 'Кирха Святой Марии', desc: 'Историческая лютеранская церковь на улице Ленина; перед визитом проверьте расписание посещений.', venueSlug: 'evangelichesko-lyuteranskaya-cerkov-svyatoi-marii', mustSeeFilter: 'temple', alsoMain: true, visitMinutes: 20, latitude: 54.312901, longitude: 48.3877 },
];

export const ULYANOVSK_FAQ: Array<{ q: string; a: string }> = [
  { q: 'Где посмотреть на Волгу?', a: 'Удобная точка в центре — бульвар Новый Венец. Вид и дальность обзора зависят от погоды и уровня воды.' },
  { q: 'Где находится памятник букве «Ё»?', a: 'У здания Ульяновской областной научной библиотеки на бульваре Новый Венец.' },
  { q: 'Что посмотреть любителям авиации?', a: 'Музей гражданской авиации расположен у аэропорта Баратаевка, отдельно от центра. До поездки проверьте актуальный режим доступа.' },
  { q: 'Можно ли посетить музеи без предварительной подготовки?', a: 'У отдельных площадок бывают разные часы работы и правила посещения; перед поездкой проверьте их официальные страницы.' },
  { q: 'Когда лучше гулять по городу?', a: 'Для прогулок по историческому центру и Новому Венцу чаще выбирают период с поздней весны до ранней осени; погода меняется, поэтому проверьте прогноз.' },
];

export const ULYANOVSK_TRAVEL =
  'В Ульяновске два аэропорта — Баратаевка и Восточный; доступность рейсов и актуальное расписание проверяйте у перевозчика. Железнодорожное сообщение также зависит от даты поездки. Для визита в музей гражданской авиации заранее проверьте часы работы и условия входа.';
