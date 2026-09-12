/** Krasnodar painted walking lines (owner 2026-08-15). Hyphen-only copy. */
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

/** Зелёная линия: исторический Екатеринодар по Красной, ~4.5 км, 18 точек. */
export const KRASNODAR_GREEN_LINE_STOPS: any[] = [
  stop(
    'Войсковой собор Александра Невского',
    'Старт у белокаменного казачьего собора.',
    45.011912,
    38.964211,
    {
      locationSlug: 'krasnodar-voyskovoy-sobor-aleksandra-nevskogo',
      address: 'ул. Красная, 1',
      mustSeeFilter: 'temple',
    },
  ),
  stop('Екатерининский сквер и Екатерина II', 'Памятник императрице в историческом ядре.', 45.013412, 38.964511, {
    locationSlug: 'krasnodar-pamyatnik-ekaterine-ii',
    mustSeeFilter: 'monument',
  }),
  stop('Площадь Пушкина', 'Площадь у художественного музея.', 45.015211, 38.966911, {
    dayRouteId: 'krasnodar-green-ploschad-pushkina',
    mustSeeFilter: 'views',
  }),
  stop('Художественный музей им. Коваленко', 'Старейший художественный музей юга.', 45.016612, 38.966111, {
    locationSlug: 'krasnodar-hudozhestvennyy-muzey-kovalenko',
    address: 'ул. Красная, 13',
    mustSeeFilter: 'museum',
    visitMinutes: 30,
  }),
  stop('Дом инженера Шарданова', 'Мавританский особняк на Красной.', 45.017213, 38.966411, {
    locationSlug: 'krasnodar-dom-shardanova',
    address: 'ул. Красная, 15',
    mustSeeFilter: 'mansions',
  }),
  stop('Скульптура «Гуляющие собачки»', 'Бронзовые собачки под фонарем.', 45.021211, 38.971212, {
    locationSlug: 'krasnodar-skulptura-gulyayuschie-sobachki',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Музей им. Фелицына', 'Особняк Богарсуковых на Гимназической.', 45.023342, 38.970611, {
    locationSlug: 'krasnodar-muzey-felitsyna',
    address: 'ул. Гимназическая, 67',
    mustSeeFilter: 'museum',
    visitMinutes: 30,
  }),
  stop('Памятник Кубанскому казачеству', 'Казак на коне у администрации.', 45.024612, 38.971512, {
    locationSlug: 'krasnodar-pamyatnik-kubanskomu-kazachestvu',
    address: 'ул. Красная, 35',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Филармония им. Пономаренко', 'Бывший Зимний театр.', 45.026112, 38.971912, {
    locationSlug: 'krasnodar-filarmoniya-ponomarenko',
    address: 'ул. Красная, 55',
    mustSeeFilter: 'creative',
  }),
  stop('Сквер Дружбы народов', 'Сквер со шрифтом «Краснодар».', 45.028711, 38.971112, {
    locationSlug: 'krasnodar-skver-druzhby-narodov',
    mustSeeFilter: 'park',
  }),
  stop(
    'Памятник казакам, пишущим письмо султану',
    'Копия картины Репина со стулом для фото.',
    45.031512,
    38.972511,
    {
      locationSlug: 'krasnodar-pamyatnik-kazakam-pismo-sultanu',
      mustSeeFilter: 'monument',
      visitMinutes: 10,
    },
  ),
  stop('Главный городской фонтан', 'Светомузыкальный фонтан на Театральной площади.', 45.037812, 38.973912, {
    locationSlug: 'krasnodar-glavnyy-gorodskoy-fontan',
    mustSeeFilter: 'views',
  }),
  stop('Театр драмы им. Горького', 'Главная драматическая сцена.', 45.037211, 38.973311, {
    locationSlug: 'krasnodar-teatr-dramy-gorkogo',
    address: 'Театральная площадь, 1',
    mustSeeFilter: 'creative',
  }),
  stop('Башня Шухова', 'Ажурный гиперболоид у «Галереи».', 45.038511, 38.971812, {
    locationSlug: 'krasnodar-bashnya-shukhova',
    address: 'ул. Рашпилевская, 147',
    mustSeeFilter: 'houses',
  }),
  stop('Особняк купца Лихацкого', 'Купеческий дом на Красной.', 45.039411, 38.975411, {
    locationSlug: 'krasnodar-osobnyak-likhatskogo',
    address: 'ул. Красная, 118а',
    mustSeeFilter: 'mansions',
  }),
  stop('Скульптура «Лида и Шурик»', 'Герои Гайдая перед КубГТУ.', 45.044112, 38.975611, {
    locationSlug: 'krasnodar-skulptura-lida-i-shurik',
    address: 'ул. Красная, 135',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Александровская Триумфальная арка', 'Царские ворота на Красной.', 45.048311, 38.977212, {
    locationSlug: 'krasnodar-aleksandrovskaya-triumfal-naya-arka',
    mustSeeFilter: 'houses',
  }),
  stop('Скульптура «Гость»', 'Путешественник с чемоданом - финал зелёной линии.', 45.053112, 38.979112, {
    locationSlug: 'krasnodar-skulptura-gost',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
];

/** Красная линия: романтический и неформальный Юг, ~5.5 км, 10 точек. */
export const KRASNODAR_RED_LINE_STOPS: any[] = [
  stop('Мост Поцелуев', 'Пешеходный мост через затон.', 45.025122, 38.953311, {
    locationSlug: 'krasnodar-most-potseluev',
    mustSeeFilter: 'views',
  }),
  stop('Литературный музей Кубани', 'Дом атамана Кухаренко.', 45.012811, 38.962812, {
    locationSlug: 'krasnodar-literaturnyy-muzey-kubani',
    address: 'ул. Постовая, 39',
    mustSeeFilter: 'literature',
    visitMinutes: 30,
  }),
  stop('Городской сад (парк Горького)', 'Пруд, лебеди и колесо обозрения.', 45.011112, 38.968311, {
    locationSlug: 'krasnodar-gorodskoy-sad-park-gor-kogo',
    address: 'ул. Постовая, 34',
    mustSeeFilter: 'park',
  }),
  stop(
    'Парк 30-летия Победы (Затон)',
    'Выставка «Оружие Победы» у воды.',
    45.018612,
    38.951211,
    {
      locationSlug: 'krasnodar-park-30-letiya-pobedy',
      address: 'ул. Береговая, 146',
      mustSeeFilter: 'park',
      visitMinutes: 40,
    },
  ),
  stop('Свято-Троицкий собор', 'Кирпичный храм с зелеными куполами.', 45.026112, 38.958211, {
    locationSlug: 'krasnodar-svyato-troitskiy-sobor',
    address: 'ул. Фрунзе, 65',
    mustSeeFilter: 'temple',
  }),
  stop('Креативный кластер «Колос»', 'Арт-хаб на территории старого хлебозавода.', 45.039112, 38.964411, {
    locationSlug: 'krasnodar-kreativnyy-klaster-kolos',
    address: 'ул. Калинина, 368',
    mustSeeFilter: 'creative',
    visitMinutes: 40,
  }),
  stop('Ботанический сад им. Косенко', 'Бесплатный дендрарий с белками.', 45.044411, 38.929112, {
    locationSlug: 'krasnodar-botanicheskiy-sad-kosenko',
    mustSeeFilter: 'park',
    visitMinutes: 45,
    transitTip: 'Переезд по Калинина к дендрарию',
  }),
  stop('Чистяковская роща', 'Вековые дубы и книжный рынок.', 45.060122, 38.988311, {
    locationSlug: 'krasnodar-chistyakovskaya-roscha',
    address: 'ул. Колхозная, 86',
    mustSeeFilter: 'park',
    visitMinutes: 40,
    transitTip: 'Переезд к Чистяковской роще',
  }),
  stop('Скульптура «Аврора»', 'Советский модернизм у кинотеатра.', 45.058342, 38.980511, {
    locationSlug: 'krasnodar-skulptura-avrora',
    address: 'ул. Красная, 169',
    mustSeeFilter: 'monument',
  }),
  stop('Фудмаркет', 'Фуд-холл на Красной - финал красной линии.', 45.048111, 38.976712, {
    locationSlug: 'krasnodar-fudmarket',
    address: 'ул. Красная, 176',
    mustSeeFilter: 'gastro',
    visitMinutes: 45,
  }),
];

export const KRASNODAR_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'krasnodar-green-line',
    title: 'Зелёная линия',
    description:
      'Исторический Екатеринодар: ~4,5 км строго по Красной улице - купеческое наследие от Войскового собора до «Гостя».',
    travelVector: '~4,5 км · 18 точек',
    timingNote: 'Полдня пешком по Красной; в выходные улица перекрыта для машин.',
    stops: KRASNODAR_GREEN_LINE_STOPS,
  },
  {
    id: 'krasnodar-red-line',
    title: 'Красная линия',
    description:
      'Романтический и неформальный Юг: ~5,5 км по набережным, Затону, «Колосу» и арт-точкам.',
    travelVector: '~5,5 км · 10 точек',
    timingNote: 'День с короткими переездами между Затоном, дендрарием и рощей.',
    stops: KRASNODAR_RED_LINE_STOPS,
  },
];
