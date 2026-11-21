/** Kaliningrad painted walking lines (owner 2026-08-15). Hyphen-only copy. */
/* eslint-disable @typescript-eslint/no-explicit-any */

function stop(
  name: string,
  desc: string,
  latitude: number,
  longitude: number,
  opts: {
    locationSlug?: string;
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
    ...(opts.dayRouteId ? { dayRouteId: opts.dayRouteId } : {}),
    ...(opts.address ? { address: opts.address } : {}),
  };
}

/** Зелёная линия: Сердце Кёнигсберга, ~3.2 км, 10 точек. */
export const KALININGRAD_GREEN_LINE_STOPS: any[] = [
  stop('Остров Канта и собор', 'Старт у Кафедрального собора на острове Кнайпхоф.', 54.706412, 20.512112, {
    locationSlug: 'kaliningrad-ostrov-kanta',
    mustSeeFilter: 'temple',
  }),
  stop('Могила Канта', 'Могила Иммануила Канта у стены собора.', 54.706712, 20.512612, {
    dayRouteId: 'kgd-green-mogila-kanta',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Медовый мост', 'Мост с острова Канта к Рыбной деревне.', 54.705811, 20.513911, {
    dayRouteId: 'kgd-green-medovyy-most',
    mustSeeFilter: 'views',
  }),
  stop('Рыбная деревня', 'Набережный квартал в стиле старого Кёнигсберга.', 54.704112, 20.516112, {
    locationSlug: 'kaliningrad-rybnaya-derevnya',
    mustSeeFilter: 'views',
  }),
  stop('Парусник «Мир» / «Витязь»', 'Музейные суда у Музея Мирового океана.', 54.705812, 20.498112, {
    locationSlug: 'kaliningrad-muzey-mirovogo-okeana',
    mustSeeFilter: 'museum',
  }),
  stop('Музей Мирового океана', 'Главное здание Музея Мирового океана.', 54.706112, 20.499412, {
    dayRouteId: 'kgd-green-okean-main-building',
    mustSeeFilter: 'museum',
    visitMinutes: 40,
  }),
  stop('Памятник Николаю Чудотворцу', 'Памятник святителю у набережной.', 54.706312, 20.501211, {
    dayRouteId: 'kgd-green-nikolay-chudotvorets',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Фридрихсбургские ворота', 'Ворота у Музея Мирового океана.', 54.704412, 20.494112, {
    dayRouteId: 'kgd-green-fridrikhsburgskie',
    mustSeeFilter: 'houses',
  }),
  stop('Росгартенские ворота', 'Кирпичные ворота к башне Дона.', 54.721211, 20.522511, {
    locationSlug: 'kaliningrad-rosgartenskie-vorota',
    mustSeeFilter: 'houses',
  }),
  stop('Башня Дона / Музей янтаря', 'Музей янтаря в башне Дона - финал зелёной линии.', 54.722112, 20.524112, {
    locationSlug: 'kaliningrad-muzey-yantarya',
    mustSeeFilter: 'museum',
    visitMinutes: 40,
  }),
];

/** Красная линия: Город-сад Амалиенау, ~2.8 км, 8 точек. */
export const KALININGRAD_RED_LINE_STOPS: any[] = [
  stop('Центральный парк', 'Старт красной линии в Центральном парке.', 54.718312, 20.478112, {
    locationSlug: 'kaliningrad-tsentralnyy-park',
    mustSeeFilter: 'park',
  }),
  stop('Театр кукол (кирха Луизы)', 'Театр кукол в бывшей кирхе Луизы.', 54.719412, 20.476112, {
    dayRouteId: 'kgd-red-teatr-kukol',
    mustSeeFilter: 'creative',
  }),
  stop('Памятник Мюнхгаузену', 'Барон Мюнхгаузен в Центральном парке.', 54.718911, 20.477212, {
    locationSlug: 'kaliningrad-pamyatnik-baronu-myunhgauzenu',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Вилла Рут', 'Особняк в районе вилл Амалиенау.', 54.719812, 20.469112, {
    dayRouteId: 'kgd-red-villa-rut',
    address: 'ул. Кутузова, 8',
    mustSeeFilter: 'mansions',
  }),
  stop('Район вилл Амалиенау', 'Квартал вилл города-сада Амалиенау.', 54.719112, 20.468311, {
    locationSlug: 'kaliningrad-rayon-vill-amalienau',
    mustSeeFilter: 'mansions',
  }),
  stop('Вилла Маковски', 'Историческая вилла в Амалиенау.', 54.718512, 20.463211, {
    dayRouteId: 'kgd-red-villa-makovski',
    mustSeeFilter: 'mansions',
  }),
  stop('Вилла Шмидт', 'Вилла на улице Марины Расковой.', 54.720112, 20.461512, {
    dayRouteId: 'kgd-red-villa-schmidt',
    address: 'ул. Марины Расковой, 23',
    mustSeeFilter: 'mansions',
  }),
  stop('Музей-квартира «Альтес Хаус»', 'Музей-квартира в старом доме - финал красной линии.', 54.721512, 20.471112, {
    locationSlug: 'kaliningrad-muzey-kvartira-altes-haus',
    mustSeeFilter: 'museum',
    visitMinutes: 40,
  }),
];

export const KALININGRAD_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'kaliningrad-green-line',
    title: 'Зелёная линия',
    description:
      'Сердце Кёнигсберга: ~3,2 км от острова Канта через Рыбную деревню и Музей океана к башне Дона.',
    travelVector: '~3,2 км · 10 точек',
    timingNote: 'Пеший маршрут по центру; финальный отрезок к воротам и Музею янтаря.',
    stops: KALININGRAD_GREEN_LINE_STOPS,
  },
  {
    id: 'kaliningrad-red-line',
    title: 'Красная линия',
    description:
      'Город-сад Амалиенау: ~2,8 км от Центрального парка через кирху Луизы и виллы к «Альтес Хаус».',
    travelVector: '~2,8 км · 8 точек',
    timingNote: 'Короткий спокойный променад по зелёному району вилл.',
    stops: KALININGRAD_RED_LINE_STOPS,
  },
];
