/** Sochi painted walking lines (owner 2026-08-21). Hyphen-only copy. */
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

/** Зеленая линия: купеческий и парадный старый Сочи, 7 точек. */
export const SOCHI_GREEN_LINE_STOPS: any[] = [
  stop(
    'Здание железнодорожного вокзала Сочи',
    'Парадные ворота города, сталинский ампир архитектора Душкина с 55-метровой часовой башней.',
    43.593021,
    39.727653,
    {
      locationSlug: 'sochi-zheleznodorozhnyy-vokzal',
      address: 'ул. Горького, 56',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Дом купца Хлудова',
    'Восстановленный исторический терем основателя парка «Ривьера» в русском стиле.',
    43.59155,
    39.71534,
    {
      locationSlug: 'sochi-dom-kuptsa-hludova',
      address: 'ул. Егорова, 1 (парк «Ривьера»)',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Остатки крепостной стены форта Александрия',
    'Каменная кладка первой русской цитадели 1838 года на Церковной горке.',
    43.582232,
    39.721495,
    {
      locationSlug: 'sochi-fort-aleksandriya',
      address: 'ул. Москвина, 7',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Собор Архангела Михаила',
    'Главный и старейший православный храм побережья, возведенный в 1890 году.',
    43.581021,
    39.7226,
    {
      locationSlug: 'sochi-sobor-arhangela-mihaila',
      address: 'ул. Москвина, 12',
      mustSeeFilter: 'temple',
      visitMinutes: 20,
    },
  ),
  stop(
    'Здание Морского вокзала Сочи',
    'Архитектурный шедевр со шпилем - триумф советского послевоенного романтизма.',
    43.580718,
    39.718683,
    {
      locationSlug: 'sochi-morskoy-vokzal',
      address: 'ул. Войкова, 1',
      mustSeeFilter: 'houses',
      visitMinutes: 25,
    },
  ),
  stop(
    'Здание Сочинского художественного музея',
    'Бывший уполномоченный физкультурный дворец 1936 года в стиле строгого классицизма.',
    43.578644,
    39.726926,
    {
      locationSlug: 'sochi-hudozhestvennyy-muzey',
      address: 'Курортный проспект, 51',
      mustSeeFilter: 'museum',
      visitMinutes: 20,
    },
  ),
  stop(
    'Зимний театр',
    'Финал линии у величественного 66-колонного дворца искусств.',
    43.577464,
    39.730303,
    {
      locationSlug: 'sochi-zimniy-teatr',
      address: 'ул. Театральная, 2',
      mustSeeFilter: 'creative',
      visitMinutes: 20,
    },
  ),
];

/** Красная линия: неформальный, креативный и стрит-арт Сочи, 7 точек. */
export const SOCHI_RED_LINE_STOPS: any[] = [
  stop(
    'Арт-пространство «Центр Пространств»',
    'Индустриальный лофт-кластер с мастерскими художников и кофейнями на месте старого хлебозавода.',
    43.59621,
    39.73284,
    {
      locationSlug: 'sochi-tsentr-prostranstv',
      address: 'бывший завод (Центр Пространств)',
      mustSeeFilter: 'creative',
      visitMinutes: 30,
    },
  ),
  stop(
    'Мурал «Жак-Ив Кусто» на молу',
    'Огромное культовое стрит-арт граффити с портретом исследователя океана у технического причала.',
    43.58291,
    39.71615,
    {
      locationSlug: 'sochi-mural-kusto',
      address: 'мол у Морского вокзала',
      mustSeeFilter: 'creative',
      visitMinutes: 15,
    },
  ),
  stop(
    'Стрит-арт аллея за ТЦ «Мелодия»',
    'Скрытый проулок с постоянно обновляющимися граффити от локальных райтеров.',
    43.58498,
    39.72421,
    {
      locationSlug: 'sochi-street-art-alleya-melodiya',
      address: 'за ТЦ «Мелодия»',
      mustSeeFilter: 'creative',
      visitMinutes: 20,
    },
  ),
  stop(
    'Инсталляция «Ухо желаний»',
    'Модный интерактивный уличный объект, ставший поп-арт символом пешеходного Сочи.',
    43.585721,
    39.72481,
    {
      locationSlug: 'sochi-uho-zhelaniy',
      address: 'ул. Навагинская, 7',
      mustSeeFilter: 'monument',
      visitMinutes: 15,
    },
  ),
  stop(
    'Креативный хаб «Площадь Искусств»',
    'Пространство перед худмузеем: скейтеры, уличные музыканты и перформеры.',
    43.578912,
    39.72589,
    {
      locationSlug: 'sochi-ploschad-iskusstv-hub',
      address: 'площадь Искусств',
      mustSeeFilter: 'creative',
      visitMinutes: 20,
    },
  ),
  stop(
    'Скейт-парк на Приморской набережной',
    'Неформальная молодежная точка с видом на море, стены отданы под легальный стрит-арт.',
    43.57612,
    39.72483,
    {
      locationSlug: 'sochi-skeyt-park-primorskaya',
      address: 'Приморская набережная',
      mustSeeFilter: 'creative',
      visitMinutes: 20,
    },
  ),
  stop(
    'Свободная арт-галерея «Форт»',
    'Творческий дворик со странными скульптурами, хэндмейд-маркетами и кофейней в винтажном стиле.',
    43.58245,
    39.72081,
    {
      locationSlug: 'sochi-art-galereya-fort',
      address: 'у форта Александрия',
      mustSeeFilter: 'creative',
      visitMinutes: 30,
    },
  ),
];

export const SOCHI_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'sochi-green-line',
    title: 'Зеленая линия',
    description:
      'Купеческий и парадный старый Сочи: вокзал Душкина, дом Хлудова, форт Александрия, собор Архангела Михаила, Морвокзал, худмузей и Зимний театр.',
    travelVector: '7 точек · пешком по центру',
    timingNote: 'Связный трек без разрывов: от ж/д вокзала к колоннаде Зимнего театра.',
    coverImageUrl: '/images/venues/sochi/zimniy-teatr.jpg',
    stops: SOCHI_GREEN_LINE_STOPS,
  },
  {
    id: 'sochi-red-line',
    title: 'Красная линия',
    description:
      'Неформальный Сочи: «Центр Пространств», мурал Кусто, стрит-арт за «Мелодией», «Ухо желаний», Площадь искусств, скейт-парк и галерея «Форт».',
    travelVector: '7 точек · пешком по дворам',
    timingNote: 'От лофт-кластера к арт-галерее «Форт» без логистических разрывов.',
    coverImageUrl: '/images/venues/sochi/uho-zhelaniy.jpg',
    stops: SOCHI_RED_LINE_STOPS,
  },
];
