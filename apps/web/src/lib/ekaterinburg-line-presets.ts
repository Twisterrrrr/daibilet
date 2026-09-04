/** Ekaterinburg painted walking lines (owner 2026-08-15). Hyphen-only copy. */
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

/** Красная линия: 35 точек, ~6.5 км. */
export const EKB_RED_LINE_STOPS: any[] = [
  stop('Площадь 1905 года', 'Старт Красной линии у главной площади центра.', 56.838221, 60.597441, {
    dayRouteId: 'ekaterinburg-red-ploschad-1905',
    mustSeeFilter: 'views',
  }),
  stop(
    'Второй Дом Советов (Дом чекиста)',
    'Конструктивистский дом на 8 Марта у пруда.',
    56.839841,
    60.599112,
    {
      dayRouteId: 'ekaterinburg-red-vtoroy-dom-sovetov',
      address: 'ул. 8 Марта, 2',
      mustSeeFilter: 'houses',
    },
  ),
  stop(
    'Октябрьская площадь и фонтан «Шар»',
    'Площадь у Театра драмы с видом на Сити.',
    56.842711,
    60.599112,
    {
      locationSlug: 'ekaterinburg-oktyabrskaya-ploschad',
      mustSeeFilter: 'views',
    },
  ),
  stop('Квартал Екатеринбург-Сити', 'Зеркальные башни делового квартала у пруда.', 56.844711, 60.596912, {
    locationSlug: 'ekaterinburg-ekaterinburg-siti',
    mustSeeFilter: 'views',
  }),
  stop('Ельцин Центр', 'Мультимедийный музей и креативное пространство у воды.', 56.843112, 60.595611, {
    locationSlug: 'ekaterinburg-el-tsin-tsentr',
    address: 'ул. Бориса Ельцина, 3',
    mustSeeFilter: 'museum',
    visitMinutes: 40,
  }),
  stop(
    'Сквер в честь 275-летия Екатеринбурга',
    'Зелёная пауза между Сити и набережной.',
    56.841541,
    60.595211,
    {
      dayRouteId: 'ekaterinburg-red-skver-275',
      mustSeeFilter: 'park',
    },
  ),
  stop('Гимназическая набережная', 'Променад вдоль пруда к историческому центру.', 56.839121, 60.598912, {
    dayRouteId: 'ekaterinburg-red-gimnazicheskaya-naberezhnaya',
    mustSeeFilter: 'views',
  }),
  stop('Гимназия №9', 'Историческое здание гимназии на проспекте Ленина.', 56.837811, 60.6091, {
    dayRouteId: 'ekaterinburg-red-gimnaziya-9',
    address: 'пр. Ленина, 33',
    mustSeeFilter: 'houses',
  }),
  stop('Исторический сквер (Плотинка)', 'Сердце города у плотины заводского пруда.', 56.838511, 60.602812, {
    locationSlug: 'ekaterinburg-plotinka-istoricheskiy-skver',
    visitMinutes: 30,
  }),
  stop(
    'Музеи Исторического сквера',
    'Музейный кластер у водонапорной башни Плотинки.',
    56.837812,
    60.604011,
    {
      dayRouteId: 'ekaterinburg-red-muzei-istoricheskogo-skvera',
      mustSeeFilter: 'museum',
    },
  ),
  stop('Площадь Труда', 'Площадь у Каменного моста и часовни.', 56.838512, 60.605211, {
    dayRouteId: 'ekaterinburg-red-ploschad-truda',
    mustSeeFilter: 'views',
  }),
  stop(
    'Памятник Татищеву и де Геннину',
    'Основатели города у Исторического сквера.',
    56.838158,
    60.605889,
    {
      locationSlug: 'ekaterinburg-pamyatnik-tatischevu-i-de-genninu',
      mustSeeFilter: 'monument',
      visitMinutes: 10,
    },
  ),
  stop(
    'Водонапорная башня завода',
    'Старинная башня на Горького у Плотинки.',
    56.837812,
    60.604011,
    {
      locationSlug: 'ekaterinburg-vodonapornaya-bashnya-plotinka',
      address: 'ул. Горького, 4в',
      mustSeeFilter: 'houses',
    },
  ),
  stop('Часовня Святой Екатерины', 'Часовня покровительницы города на площади Труда.', 56.838341, 60.606312, {
    dayRouteId: 'ekaterinburg-red-chasovnya-svyatoy-ekateriny',
    mustSeeFilter: 'temple',
  }),
  stop('Нулевой километр', 'Точка отсчёта уральских дорог у Главпочтамта.', 56.839211, 60.606712, {
    dayRouteId: 'ekaterinburg-red-nulevoy-kilometr',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Памятник А. С. Попову', 'Изобретатель радио у почтамта.', 56.839619, 60.6078, {
    locationSlug: 'ekaterinburg-pamyatnik-popovu',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Литературный квартал', 'Квартал музеев и памятников литераторам Урала.', 56.841521, 60.608311, {
    dayRouteId: 'ekaterinburg-red-literaturnyy-kvartal',
    mustSeeFilter: 'literature',
  }),
  stop(
    'Музей «Литературная жизнь Урала XIX века»',
    'Усадебный музей в литературном квартале.',
    56.841912,
    60.6078,
    {
      dayRouteId: 'ekaterinburg-red-muzey-literaturnaya-zhizn',
      mustSeeFilter: 'literature',
      visitMinutes: 30,
    },
  ),
  stop('Памятник А. С. Пушкину', 'Памятник поэту в литературном квартале.', 56.8419, 60.6078, {
    locationSlug: 'ekaterinburg-pamyatnik-pushkinu',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Парк Харитоновского сада', 'Исторический сад у усадьбы Расторгуевых-Харитоновых.', 56.843112, 60.611113, {
    locationSlug: 'ekaterinburg-kharitonovskiy-sad',
    mustSeeFilter: 'park',
  }),
  stop(
    'Усадьба Расторгуевых - Харитоновых',
    'Классическая усадьба с парком на Вознесенской горке.',
    56.8422,
    60.6106,
    {
      locationSlug: 'ekaterinburg-usadba-kharitonova-rastorguevyh',
      mustSeeFilter: 'mansions',
      visitMinutes: 25,
    },
  ),
  stop('Вознесенская церковь', 'Храм на Вознесенской горке - свидетель эпохи.', 56.842711, 60.613312, {
    dayRouteId: 'ekaterinburg-red-voznesenskaya-tserkov',
    mustSeeFilter: 'temple',
  }),
  stop('Храм на Крови', 'Храм на месте дома Ипатьева.', 56.843342, 60.608611, {
    locationSlug: 'ekaterinburg-hram-na-krovi',
    address: 'ул. Царская, 10',
    mustSeeFilter: 'temple',
    visitMinutes: 30,
  }),
  stop('Мемориал «Черный тюльпан»', 'Память о воинах-интернационалистах.', 56.839112, 60.622112, {
    dayRouteId: 'ekaterinburg-red-chernyy-tyulpan',
    mustSeeFilter: 'monument',
  }),
  stop('Площадь Советской Армии', 'Площадь у Дома офицеров.', 56.838312, 60.6247, {
    dayRouteId: 'ekaterinburg-red-ploschad-sovetskoy-armii',
    mustSeeFilter: 'views',
  }),
  stop('Дом офицеров (ОДО)', 'Окружной дом офицеров на площади Советской Армии.', 56.8383, 60.6247, {
    locationSlug: 'ekaterinburg-okruzhnoy-dom-ofitserov',
    mustSeeFilter: 'houses',
  }),
  stop(
    'Здание УрФУ на Ленина',
    'Главный корпус Уральского федерального университета.',
    56.841122,
    60.614211,
    {
      locationSlug: 'ekaterinburg-urfu-glavnyy-korpus',
      mustSeeFilter: 'houses',
    },
  ),
  stop('Памятник Якову Свердлову', 'Советский монумент на площади у театра.', 56.839112, 60.613112, {
    dayRouteId: 'ekaterinburg-red-pamyatnik-sverdlovu',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  stop('Театр оперы и балета', 'Урал Опера Балет - имперская сцена центра.', 56.838911, 60.611112, {
    locationSlug: 'ekaterinburg-ural-opera-balet',
    mustSeeFilter: 'creative',
  }),
  stop('Дом печати', 'Конструктивистский Дом печати.', 56.839411, 60.609712, {
    locationSlug: 'ekaterinburg-dom-pechati',
    mustSeeFilter: 'houses',
  }),
  stop('Здание УрГУ', 'Исторический корпус университета на Ленина.', 56.840112, 60.613112, {
    dayRouteId: 'ekaterinburg-red-urgu',
    mustSeeFilter: 'houses',
  }),
  stop('Площадь Парижской Коммуны', 'Площадь у Городка чекистов.', 56.840612, 60.618133, {
    dayRouteId: 'ekaterinburg-red-ploschad-parizhskoy-kommuny',
    mustSeeFilter: 'views',
  }),
  stop(
    'Гостиница «Исеть» и Городок чекистов',
    'Икона свердловского авангарда и квартал-серп.',
    56.841742,
    60.613911,
    {
      locationSlug: 'ekaterinburg-gorodok-chekistov',
      mustSeeFilter: 'houses',
      visitMinutes: 30,
    },
  ),
  stop('Театр музыкальной комедии', 'Музыкальный театр в центре маршрута.', 56.838112, 60.605, {
    dayRouteId: 'ekaterinburg-red-teatr-muzkomedii',
    mustSeeFilter: 'creative',
  }),
  stop('Кинотеатр «Колизей»', 'Первый городской театр - финал Красной линии.', 56.838311, 60.612112, {
    dayRouteId: 'ekaterinburg-red-kolizey',
    mustSeeFilter: 'creative',
  }),
];

/** Синяя линия: царский маршрут Романовых, ~3 км, 11 точек. */
export const EKB_BLUE_LINE_STOPS: any[] = [
  stop('Храм на Крови', 'Возведен на месте дома Ипатьева.', 56.843342, 60.608611, {
    locationSlug: 'ekaterinburg-hram-na-krovi',
    address: 'ул. Царская, 10',
    mustSeeFilter: 'temple',
    visitMinutes: 40,
  }),
  stop(
    'Просветительский центр «Царский»',
    'Выставка документов семьи Романовых.',
    56.843612,
    60.608933,
    {
      dayRouteId: 'ekaterinburg-blue-tsarskiy',
      mustSeeFilter: 'museum',
      visitMinutes: 40,
    },
  ),
  stop('Храм Вознесения Господня', 'Старейшая церковь - свидетель эпохи.', 56.842711, 60.613312, {
    dayRouteId: 'ekaterinburg-blue-voznesenie',
    mustSeeFilter: 'temple',
  }),
  stop(
    'Уральский государственный театр эстрады',
    'Бывшее здание Общественного собрания.',
    56.834411,
    60.603312,
    {
      dayRouteId: 'ekaterinburg-blue-teatr-estrady',
      mustSeeFilter: 'creative',
    },
  ),
  stop(
    'Театр оперы и балета',
    'Открыт в 1912 году к 300-летию Дома Романовых.',
    56.838911,
    60.611112,
    {
      locationSlug: 'ekaterinburg-ural-opera-balet',
      mustSeeFilter: 'creative',
    },
  ),
  stop(
    'Кинотеатр «Колизей»',
    'Первый городской театр - место визитов великих князей.',
    56.838311,
    60.612112,
    {
      dayRouteId: 'ekaterinburg-blue-kolizey',
      mustSeeFilter: 'creative',
    },
  ),
  stop(
    'Здание Канцелярии главного начальника заводов',
    'Имперская канцелярия горного ведомства.',
    56.837831,
    60.607512,
    {
      dayRouteId: 'ekaterinburg-blue-kantselyariya',
      mustSeeFilter: 'houses',
    },
  ),
  stop(
    'Горный университет (УГГУ)',
    'Учрежден личным указом Николая II в 1914 году.',
    56.828112,
    60.598912,
    {
      dayRouteId: 'ekaterinburg-blue-uggu',
      mustSeeFilter: 'houses',
      visitMinutes: 25,
    },
  ),
  stop(
    'Ново-Тихвинский женский монастырь',
    'Монахини тайно передавали продукты царской семье под арест.',
    56.821312,
    60.595612,
    {
      dayRouteId: 'ekaterinburg-blue-novo-tikhvinskiy',
      mustSeeFilter: 'temple',
      visitMinutes: 30,
    },
  ),
  stop(
    'Уральский геологический музей',
    'Музей при Горном университете.',
    56.827912,
    60.599112,
    {
      dayRouteId: 'ekaterinburg-blue-geologicheskiy-muzey',
      mustSeeFilter: 'museum',
      visitMinutes: 40,
    },
  ),
  stop(
    'Парк «Россия - Моя история»',
    'Мультимедийная выставка династии Романовых - финал синей линии.',
    56.811512,
    60.612112,
    {
      dayRouteId: 'ekaterinburg-blue-rossiya-moya-istoriya',
      mustSeeFilter: 'museum',
      visitMinutes: 60,
      transitTip: 'От Ново-Тихвинского удобнее автобус или такси',
    },
  ),
];

/** Фиолетовая линия: стрит-арт STENOGRAFFIA, ~10 км. */
export const EKB_PURPLE_LINE_STOPS: any[] = [
  stop('Мурал «Уральский барс»', 'Культовый барс во всю стену на 8 Марта.', 56.831512, 60.6021, {
    locationSlug: 'ekaterinburg-mural-uralskiy-bars',
    address: 'ул. 8 Марта, 22',
    mustSeeFilter: 'creative',
    visitMinutes: 15,
  }),
  stop(
    'Арка «Покрас Лампас»',
    'Каллиграфутуризм в арке на Толмачева.',
    56.839811,
    60.610512,
    {
      dayRouteId: 'ekaterinburg-purple-pokras-lampas',
      address: 'ул. Толмачева, 12',
      mustSeeFilter: 'creative',
    },
  ),
  stop(
    'Банка сгущенки и супа Campbell',
    'Цистерны в поп-арт раскраске на Малышева.',
    56.833912,
    60.601112,
    {
      dayRouteId: 'ekaterinburg-purple-banka-sgushchenki',
      address: 'ул. Малышева, 31г',
      mustSeeFilter: 'creative',
    },
  ),
  stop(
    'Арт-объект «Бумажный самолетик»',
    'Крупный самолётик у рок-кластера на Попова.',
    56.835987,
    60.591214,
    {
      dayRouteId: 'ekaterinburg-purple-bumazhnyy-samoletik',
      address: 'ул. Попова, 2',
      mustSeeFilter: 'creative',
    },
  ),
  stop(
    'Мурал «Девочка с птичкой»',
    'Легальный мурал STENOGRAFFIA на Малышева.',
    56.835112,
    60.620112,
    {
      dayRouteId: 'ekaterinburg-purple-devochka-s-ptichkoy',
      address: 'ул. Малышева, 84',
      mustSeeFilter: 'creative',
    },
  ),
  stop(
    'Арт-пространство во дворе ГЦСИ',
    'Двор и фасады у Городского центра современного искусства.',
    56.832112,
    60.599411,
    {
      dayRouteId: 'ekaterinburg-purple-gtsi',
      address: 'ул. Добролюбова, 19а',
      mustSeeFilter: 'creative',
    },
  ),
  stop(
    'Стена граффити на Драме',
    'Инсталляция на Октябрьской площади у Театра драмы.',
    56.842711,
    60.599112,
    {
      dayRouteId: 'ekaterinburg-purple-stena-na-drame',
      mustSeeFilter: 'creative',
    },
  ),
  stop('Мурал «Двор-калейдоскоп»', 'Дворовый калейдоскоп на Ленина, 52.', 56.839912, 60.614211, {
    dayRouteId: 'ekaterinburg-purple-dvor-kaleydoskop',
    address: 'ул. Ленина, 52',
    mustSeeFilter: 'creative',
  }),
  stop('Работа «Цветочный ковер»', 'Цветочный стрит-арт на Вайнера.', 56.835412, 60.598211, {
    dayRouteId: 'ekaterinburg-purple-tsvetochnyy-kover',
    address: 'ул. Вайнера, 16',
    mustSeeFilter: 'creative',
  }),
  stop(
    'Арт-пространство завода ЗИМ (Гринвич)',
    'Урбан-арт у Фабрики-кухни / Гринвича - финал фиолетовой линии.',
    56.828111,
    60.606712,
    {
      dayRouteId: 'ekaterinburg-purple-zim-grinwich',
      mustSeeFilter: 'creative',
      visitMinutes: 30,
    },
  ),
];

export const EKB_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'ekaterinburg-red-line',
    title: 'Красная линия',
    description:
      'Главный исторический маршрут центра: 6,5 км и 35 ключевых объектов по краске на асфальте.',
    travelVector: '6,5 км · 35 точек',
    timingNote: 'Полный день пешком; можно пройти частями, ориентируясь на красную линию.',
    coverImageUrl: '/images/venues/ekaterinburg/oktyabrskaya-ploschad.jpg',
    stops: EKB_RED_LINE_STOPS,
  },
  {
    id: 'ekaterinburg-blue-line',
    title: 'Синяя линия',
    description:
      'Царский маршрут Романовых: около 3 км и 11 точек от Храма на Крови до «Россия - Моя история».',
    travelVector: '~3 км · 11 точек',
    timingNote: 'Полдня; к Ново-Тихвинскому и парку истории удобен транспорт.',
    coverImageUrl: '/images/venues/ekaterinburg/hram-na-krovi.jpg',
    stops: EKB_BLUE_LINE_STOPS,
  },
  {
    id: 'ekaterinburg-purple-line',
    title: 'Фиолетовая линия',
    description:
      'Street Art Line: культовые легальные муралы фестиваля STENOGRAFFIA на ~10 км.',
    travelVector: '~10 км · стрит-арт',
    timingNote: 'Длинный трек по городу; удобнее самокат или короткие переезды между кластерами.',
    coverImageUrl: '/images/venues/ekaterinburg/mural-uralskiy-bars.jpg',
    stops: EKB_PURPLE_LINE_STOPS,
  },
];
