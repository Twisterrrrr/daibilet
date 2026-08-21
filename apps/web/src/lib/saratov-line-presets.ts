/** Saratov painted walking lines (owner 2026-08-21). Hyphen-only copy. */
/* eslint-disable @typescript-eslint/no-explicit-any */

function stop(
  name: string,
  desc: string,
  latitude: number,
  longitude: number,
  opts: {
    locationSlug?: string;
    venueSlug?: string;
    dayRouteId?: string;
    address?: string;
    mustSeeFilter?: string;
    visitMinutes?: number;
  } = {},
): any {
  return {
    name,
    desc,
    latitude,
    longitude,
    mustSeeFilter: opts.mustSeeFilter || 'main',
    visitMinutes: opts.visitMinutes ?? 20,
    ...(opts.locationSlug ? { locationSlug: opts.locationSlug } : {}),
    ...(opts.venueSlug ? { venueSlug: opts.venueSlug } : {}),
    ...(opts.dayRouteId ? { dayRouteId: opts.dayRouteId } : {}),
    ...(opts.address ? { address: opts.address } : {}),
  };
}

/** Зеленая линия: купеческий Саратов - столица Поволжья, 7 точек. */
export const SARATOV_GREEN_LINE_STOPS: any[] = [
  stop(
    'Здание Крытого рынка',
    'Монументальный торговый пассаж 1916 года с часами и быками.',
    51.533612,
    46.025345,
    {
      locationSlug: 'saratov-krytyy-rynok',
      address: 'ул. Чапаева, 59',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Отель «Астория» (Волга)',
    'Символ саратовского модерна с фигурами застывших рыцарей на проспекте.',
    51.532314,
    46.026122,
    {
      locationSlug: 'saratov-otel-astoriya-volga',
      address: 'просп. имени Петра Столыпина, 34',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Здание Государственной Консерватории',
    'Псевдоготический замок с поющими совами и шпилями.',
    51.530732,
    46.035012,
    {
      locationSlug: 'saratov-konservatoriya-im-sobinova',
      address: 'просп. имени Петра Столыпина, 1',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Храм «Утоли моя печали»',
    'Узорчатая церковь с шатрами а-ля собор Василия Блаженного.',
    51.530348,
    46.036516,
    {
      locationSlug: 'saratov-hram-utoli-moya-pechali',
      address: 'ул. Волжская, 36',
      mustSeeFilter: 'temple',
      visitMinutes: 20,
    },
  ),
  stop(
    'Особняк К. Рейнеке',
    'Шедевр Федора Шехтеля с майоликовыми панно на Соборной.',
    51.528312,
    46.038145,
    {
      locationSlug: 'saratov-osobnyak-k-reyneke',
      address: 'ул. Соборная, 22',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Саратовский областной музей краеведения',
    'Особняк в стиле классицизма на Музейной площади.',
    51.530124,
    46.046956,
    {
      locationSlug: 'saratov-oblastnoy-muzey-kraevedeniya',
      address: 'ул. Лермонтова, 34',
      mustSeeFilter: 'museum',
      visitMinutes: 40,
    },
  ),
  stop(
    'Свято-Троицкий собор',
    'Финал линии у старейшего каменного собора нарышкинского барокко XVII века.',
    51.530621,
    46.0471,
    {
      locationSlug: 'saratov-svyato-troitskiy-sobor',
      address: 'ул. Лермонтова, 36',
      mustSeeFilter: 'temple',
      visitMinutes: 25,
    },
  ),
];

/** Красная линия: неформальный, студенческий и индустриальный Саратов, 7 точек. */
export const SARATOV_RED_LINE_STOPS: any[] = [
  stop(
    'Дворик у ТЮЗа имени Киселева',
    'Молодежный пятачок перед Новой сценой, облюбованный скейтерами.',
    51.533442,
    46.019165,
    {
      locationSlug: 'saratov-tyuz-im-kiseleva',
      address: 'площадь им. Ю.П. Киселева, 1',
      mustSeeFilter: 'creative',
      visitMinutes: 20,
    },
  ),
  stop(
    'Арт-кластер «Склады Рейнеке»',
    'Старые провиантские склады, превращенные в площадку для стрит-арта и перформансов.',
    51.52512,
    46.04123,
    {
      locationSlug: 'saratov-art-klaster-sklady-reyneke',
      address: 'ул. Чернышевского (склады Рейнеке)',
      mustSeeFilter: 'creative',
      visitMinutes: 30,
    },
  ),
  stop(
    'Дом-коммуна «Инженер»',
    'Конструктивистский дом-утопия 1930-х с общими коридорами.',
    51.524125,
    46.039345,
    {
      locationSlug: 'saratov-dom-kommuna-inzhener',
      address: 'ул. Провиантская, 7',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Мурал «Волга и Стерлядь»',
    'Современное граффити локальных райтеров у кромки воды на Новой набережной.',
    51.51624,
    46.03481,
    {
      locationSlug: 'saratov-mural-volga-i-sterlyad',
      address: 'Новая Набережная',
      mustSeeFilter: 'creative',
      visitMinutes: 15,
    },
  ),
  stop(
    'Арт-объект «Я люблю Саратов»',
    'Индустриальная фотозона на обновленном променаде.',
    51.517312,
    46.038144,
    {
      locationSlug: 'saratov-ya-lyublyu-saratov',
      address: 'Новая Набережная (в районе ул. Вольской)',
      mustSeeFilter: 'monument',
      visitMinutes: 10,
    },
  ),
  stop(
    'Стрит-арт стена у СГЮА',
    'Галерея легальных граффити у Юридической академии.',
    51.51912,
    46.04283,
    {
      locationSlug: 'saratov-strit-art-stena-sgyua',
      address: 'ул. Вольская / СГЮА',
      mustSeeFilter: 'creative',
      visitMinutes: 15,
    },
  ),
  stop(
    'Технический причал Набережной Космонавтов',
    'Неформальная индустриальная смотровая под опорами старого моста.',
    51.52211,
    46.05412,
    {
      locationSlug: 'saratov-tehnicheskiy-prichal-naberezhnoy-kosmonavtov',
      address: 'Набережная Космонавтов',
      mustSeeFilter: 'views',
      visitMinutes: 20,
    },
  ),
];

export const SARATOV_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'saratov-green-line',
    title: 'Зеленая линия',
    description:
      'Купеческий Саратов: Крытый рынок, «Астория», готика Консерватории, «Утоли моя печали», особняк Рейнеке и финал у Троицкого собора. Весь трек уложен в исторический центр.',
    travelVector: '7 точек · пешком по центру',
    timingNote: 'Связный трек без разрывов: от Крытого рынка к Музейной площади.',
    coverImageUrl: '/images/venues/saratov/hram-utoli-moya-pechali.jpg',
    stops: SARATOV_GREEN_LINE_STOPS,
  },
  {
    id: 'saratov-red-line',
    title: 'Красная линия',
    description:
      'Неформальный Саратов: двор ТЮЗа, склады Рейнеке, дом-коммуна «Инженер», мурал на Новой набережной, «Я люблю Саратов» и причал под мостом.',
    travelVector: '7 точек · пешком по дворам и набережной',
    timingNote: 'От ТЮЗа к техническому причалу без логистических разрывов.',
    coverImageUrl: '/images/venues/saratov/naberezhnaya-kosmonavtov.jpg',
    gastroStop: {
      name: 'Гастро на Красной линии',
      blurb:
        'После двора ТЮЗа - кофе у «Coupe» или обед в «Культуре» на проспекте Столыпина; к вечеру спуск к «Одессе» на Набережной Космонавтов.',
    },
    stops: SARATOV_RED_LINE_STOPS,
  },
];
