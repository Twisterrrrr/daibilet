/** Chelyabinsk painted walking lines (owner 2026-08-17). Hyphen-only copy. */
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

/** Зеленая линия: купеческий Челяба и сталинский ампир, 6 точек. */
export const CHELYABINSK_GREEN_LINE_STOPS: any[] = [
  stop(
    'Пассаж Яушевых',
    'Купеческий пассаж на Труда: витрины, лепнина и старт зеленой линии.',
    55.168112,
    61.402312,
    {
      locationSlug: 'chelyabinsk-passage-yaushevyh',
      address: 'ул. Труда, 92А',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Особняк Архипова',
    'Купеческий особняк рядом с пассажем, парадный фасад конца XIX века.',
    55.167812,
    61.403112,
    {
      locationSlug: 'chelyabinsk-osobnyak-arhipova',
      address: 'ул. Труда, 90',
      mustSeeFilter: 'houses',
      visitMinutes: 10,
    },
  ),
  stop(
    'Театр оперы и балета им. Глинки',
    'Главная музыкальная сцена Южного Урала на площади Ярославского.',
    55.166912,
    61.401112,
    {
      venueSlug: 'chelyabinsk-teatr-opery-glinki',
      address: 'пл. Ярославского, 1',
      mustSeeFilter: 'creative',
      visitMinutes: 15,
    },
  ),
  stop(
    'Дом Данцигера',
    'Особняк начала XX века на Пушкина, переход от купеческого центра к ампиру Ленина.',
    55.161412,
    61.400512,
    {
      locationSlug: 'chelyabinsk-dom-dantsigera',
      address: 'ул. Пушкина, 1',
      mustSeeFilter: 'houses',
      visitMinutes: 10,
    },
  ),
  stop(
    'Здание Госбанка',
    'Монументальный сталинский ампир на Ленина: колонны и строгий ритм фасада.',
    55.159812,
    61.401512,
    {
      locationSlug: 'chelyabinsk-gosbank',
      address: 'ул. Ленина, 52',
      mustSeeFilter: 'houses',
      visitMinutes: 10,
    },
  ),
  stop(
    'Дом облисполкома',
    'Финал зеленой линии: сталинский административный ансамбль на Ленина, 54.',
    55.159412,
    61.402012,
    {
      locationSlug: 'chelyabinsk-dom-oblispolkoma',
      address: 'ул. Ленина, 54',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
];

/** Красная линия: метеорит, авангард и Белый рынок, 6 точек. */
export const CHELYABINSK_RED_LINE_STOPS: any[] = [
  stop(
    'Исторический музей Южного Урала',
    'Крупнейший осколок челябинского метеорита под стеклянным куполом.',
    55.167512,
    61.400412,
    {
      venueSlug: 'chelyabinsk-gosudarstvennyy-istoricheskiy-muzey-yuzhnogo-urala',
      address: 'ул. Труда, 100',
      mustSeeFilter: 'museum',
      visitMinutes: 60,
    },
  ),
  stop(
    'Набережная реки Миасс',
    'Смотровая на Миасс у музея и филармонии. Не путать с чужими набережными: это челябинский берег.',
    55.167212,
    61.399812,
    {
      locationSlug: 'chelyabinsk-naberezhnaya-reki-miass',
      address: 'набережная реки Миасс',
      mustSeeFilter: 'views',
      visitMinutes: 25,
    },
  ),
  stop(
    'Храм Александра Невского на Алом поле',
    'Краснокирпичный храм в историческом парке Алое поле.',
    55.160112,
    61.391901,
    {
      locationSlug: 'chelyabinsk-hram-aleksandra-nevskogo',
      address: 'Алое поле, 1',
      mustSeeFilter: 'temple',
      visitMinutes: 20,
    },
  ),
  stop(
    'Кластер «Свечка»',
    'Креативный двор на Воровского: бары, мастерские и неофициальный вечерний Челябинск.',
    55.154912,
    61.397912,
    {
      locationSlug: 'chelyabinsk-svechka',
      address: 'ул. Воровского, 11А',
      mustSeeFilter: 'gastro',
      visitMinutes: 30,
    },
  ),
  stop(
    'Кофейня UDOBNO',
    'Кофейная пауза на Ленина между Алым полем и Белым рынком.',
    55.157812,
    61.400612,
    {
      locationSlug: 'chelyabinsk-kofeynya-udobno',
      address: 'ул. Ленина, 61',
      mustSeeFilter: 'gastro',
      visitMinutes: 20,
    },
  ),
  stop(
    'Белый рынок',
    'Финал красной линии: террасы, фермерские прилавки и вечерняя гастрономия на Тернопольской.',
    55.154212,
    61.375412,
    {
      locationSlug: 'chelyabinsk-belyy-rynok',
      address: 'ул. Тернопольская, 6',
      mustSeeFilter: 'gastro',
      visitMinutes: 50,
    },
  ),
];

export const CHELYABINSK_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'chelyabinsk-green-line',
    title: 'Зеленая линия',
    description:
      'Купеческий Челяба и сталинский ампир: пассаж Яушевых, особняк Архипова, опера Глинки, дом Данцигера, Госбанк и дом облисполкома. Весь трек компактно уложен в исторический центр.',
    travelVector: '6 точек · пешком по центру',
    timingNote: 'Связный трек без разрывов: от пассажа Яушевых к дому облисполкома.',
    coverImageUrl: '/images/venues/chelyabinsk/osobnyak-arhipova.jpg',
    stops: CHELYABINSK_GREEN_LINE_STOPS,
  },
  {
    id: 'chelyabinsk-red-line',
    title: 'Красная линия',
    description:
      'Челябинский метеорит, авангард и Белый рынок: исторический музей, набережная Миасса, Невский на Алом поле, «Свечка», UDOBNO и Белый рынок. Вечером рядом - бар «Тортуга».',
    travelVector: '6 точек · пешком и короткий трансфер к рынку',
    timingNote: 'От метеорита к Белому рынку: центр пешком, к Тернопольской - трамвай или такси.',
    gastroStop: {
      name: 'Неофициальные бары Красной линии',
      blurb:
        '«Тортуга» на Труда и кластер «Свечка» на Воровского - дворы без вывесок, куда ходят свои.',
    },
    coverImageUrl: '/images/venues/chelyabinsk/gosudarstvennyy-istoricheskiy-muzey-yuzhnogo-urala.jpg',
    stops: CHELYABINSK_RED_LINE_STOPS,
  },
];
