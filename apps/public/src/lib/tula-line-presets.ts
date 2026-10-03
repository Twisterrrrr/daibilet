/** Tula painted walking lines (owner 2026-08-22). Hyphen-only copy. */
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

/** Зеленая линия: купеческий посад и Кремль, 6 точек. */
export const TULA_GREEN_LINE_STOPS: any[] = [
  stop(
    'Башня Одоевских ворот Кремля',
    'Стартовая точка. Главный исторический вход в крепость.',
    54.194231,
    37.617412,
    {
      locationSlug: 'tula-bashnya-odoevskih-vorot',
      address: 'ул. Менделеевская, Кремль',
      mustSeeFilter: 'houses',
      visitMinutes: 25,
    },
  ),
  stop(
    'Успенский собор в Кремле',
    'Центральный барочный храм крепости с фресками ярославских мастеров.',
    54.195311,
    37.617943,
    {
      locationSlug: 'tula-uspenskiy-sobor-kremlya',
      address: 'территория Тульского кремля',
      mustSeeFilter: 'temple',
      visitMinutes: 30,
    },
  ),
  stop(
    'Музей «Тульские самовары»',
    'Экспозиция водогреев прямо у выхода из ворот Кремля.',
    54.194242,
    37.616611,
    {
      venueSlug: 'tula-muzey-tulskie-samovary',
      address: 'ул. Менделеевская, 8',
      mustSeeFilter: 'museum',
      visitMinutes: 40,
    },
  ),
  stop(
    'Благовещенская церковь',
    'Старейший храм Тулы (1692) в 3 минутах ходьбы от музея самоваров.',
    54.196323,
    37.613312,
    {
      locationSlug: 'tula-blagoveshchenskaya-tserkov',
      address: 'ул. Благовещенская, 4',
      mustSeeFilter: 'temple',
      visitMinutes: 20,
    },
  ),
  stop(
    'Особняк Белолипецких',
    'Роскошный купеческий дом - начало пешеходной улицы Металлистов.',
    54.196614,
    37.614121,
    {
      locationSlug: 'tula-osobnyak-belolipetskih',
      address: 'ул. Металлистов, 10',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Улица Металлистов',
    'Финал линии. Прогулка по брусчатке мимо отреставрированных усадеб.',
    54.196412,
    37.614811,
    {
      locationSlug: 'tula-ulitsa-metallistov',
      address: 'ул. Металлистов',
      mustSeeFilter: 'street',
      visitMinutes: 30,
    },
  ),
];

/** Красная линия: креатив, стрит-арт и «Октава», 5 точек. */
export const TULA_RED_LINE_STOPS: any[] = [
  stop(
    'Креативное пространство «Искра»',
    'Стартовая точка. Эпицентр стрит-арта, муралов и крафтовых баров.',
    54.196411,
    37.612214,
    {
      locationSlug: 'tula-kreativnoe-prostranstvo-iskra',
      address: 'ул. Советская, 11',
      mustSeeFilter: 'creative',
      visitMinutes: 40,
    },
  ),
  stop(
    'Ресторан «Культура»',
    'Концептуальный гастро-хаб внутри лофт-квартала «Искра».',
    54.196512,
    37.612514,
    {
      locationSlug: 'tula-restoran-kultura',
      address: 'ул. Советская, 11',
      mustSeeFilter: 'gastro',
      visitMinutes: 50,
    },
  ),
  stop(
    'Старая тульская аптека',
    'Интерактивный лофт-музей на проспекте Ленина с подкованной блохой.',
    54.192312,
    37.615822,
    {
      venueSlug: 'tula-staraya-tulskaya-apteka',
      address: 'пр-т Ленина, 27',
      mustSeeFilter: 'museum',
      visitMinutes: 40,
    },
  ),
  stop(
    'Творческий индустриальный кластер «Октава»',
    'Переосмысленное заводское пространство, центр урбанизма.',
    54.190812,
    37.613412,
    {
      locationSlug: 'tula-tvorcheskiy-industrial-nyy-klaster-oktava',
      address: 'ул. Каминского, 24',
      mustSeeFilter: 'creative',
      visitMinutes: 40,
    },
  ),
  stop(
    'Музей станка в «Октаве»',
    'Мультимедийное завершение маршрута в цехах завода микрофонов.',
    54.190623,
    37.613941,
    {
      venueSlug: 'tula-muzey-stanka-oktava',
      address: 'ул. Каминского, 24',
      mustSeeFilter: 'museum',
      visitMinutes: 70,
    },
  ),
];

export const TULA_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'tula-green-line',
    title: 'Зеленая линия',
    description:
      'Купеческий и исторический трек: Одоевские ворота, Успенский собор, музей самоваров, Благовещенская церковь, особняк Белолипецких и улица Металлистов.',
    travelVector: '6 точек · пешком по посаду',
    timingNote: 'Связный трек: от башни Одоевских ворот к улице Металлистов без разрывов.',
    coverImageUrl: '/images/venues/tula/tul-skiy-kreml.jpg',
    stops: TULA_GREEN_LINE_STOPS,
  },
  {
    id: 'tula-red-line',
    title: 'Красная линия',
    description:
      'Неформальный и креативный город: «Искра», «Культура», Старая тульская аптека, кластер «Октава» и Музей станка.',
    travelVector: '5 точек · дворы и завод',
    timingNote: 'От «Искры» к «Октаве» по проспекту Ленина без логистических разрывов.',
    gastroStop: {
      name: '«Искра» и «Культура»',
      blurb:
        'Кофе и крафт во дворах «Искры», авторский обед в «Культуре» - удобные паузы Красной линии.',
    },
    coverImageUrl: '/images/venues/tula/tvorcheskiy-industrial-nyy-klaster-oktava.jpg',
    stops: TULA_RED_LINE_STOPS,
  },
];
